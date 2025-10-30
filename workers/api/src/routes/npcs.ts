import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import { z } from 'zod';

type Env = { DB: D1Database };
export const npcs = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// ----- helpers -----
const Level3 = z.enum(['Basic','Critical','Extreme']);
const Side = z.enum(['ally','enemy']);
const EnemyType = z.enum(['goon','bad_guy','boss']);

const CreateBase = z.object({
  name: z.string().min(1),
  side: Side,
  portraitUrl: z.string().url().optional().nullable(),
});

const CreateAlly = CreateBase.extend({
  side: z.literal('ally'),
  brawn: z.number().int().min(3).max(5),
  nerves: z.number().int().min(3).max(5),
  smooth: z.number().int().min(3).max(5),
  focus: z.number().int().min(3).max(5),
  crime: z.number().int().min(3).max(5),
  allyGrit: z.number().int().min(0).max(3).default(0),
});

const CreateEnemy = CreateBase.extend({
  side: z.literal('enemy'),
  enemyType: EnemyType,
  enemyGritMax: z.number().int().min(1),
  enemyGrit: z.number().int().min(0).default(0),
  attackLevel: Level3,
  defenseLevel: Level3,
  weakSpot: z.string().min(1),
  weakSpotDiscovered: z.boolean().default(false),
});

const CreateNpc = z.discriminatedUnion('side', [CreateAlly, CreateEnemy]);

// Partial update for small edits (grit ticks, discovered flag, etc.)
const UpdateNpc = z.object({
  name: z.string().min(1).optional(),
  portraitUrl: z.string().url().nullable().optional(),

  // allies
  brawn: z.number().int().min(3).max(5).optional(),
  nerves: z.number().int().min(3).max(5).optional(),
  smooth: z.number().int().min(3).max(5).optional(),
  focus: z.number().int().min(3).max(5).optional(),
  crime: z.number().int().min(3).max(5).optional(),
  allyGrit: z.number().int().min(0).max(3).optional(),

  // enemies
  enemyGritMax: z.number().int().min(1).optional(),
  enemyGrit: z.number().int().min(0).optional(),
  attackLevel: Level3.optional(),
  defenseLevel: Level3.optional(),
  weakSpot: z.string().optional(),
  weakSpotDiscovered: z.boolean().optional(),
}).refine(o => Object.keys(o).length > 0, 'Nothing to update');

async function isDirector(DB: D1Database, campaignId: string, userId: string) {
  // Adjust to your memberships schema; assuming role column = 'director'
  const q = await DB.prepare(
    `SELECT 1 FROM memberships WHERE campaignId = ? AND userId = ? AND role = 'director' LIMIT 1`
  ).bind(campaignId, userId).first();
  return !!q;
}

function hideEnemySecrets(row: any, viewerIsDirector: boolean) {
  if (!viewerIsDirector && row.side === 'enemy' && !row.weakSpotDiscovered) {
    row.weakSpot = null;
  }
  row.weakSpotDiscovered = !!row.weakSpotDiscovered;
  return row;
}

// ----- routes -----
// list
npcs.get('/campaigns/:cid/supporting-characters', async (c) => {
  const { cid } = c.req.param();
  const userId = c.get('userId') || ''; // set by your auth middleware
  const director = await isDirector(c.env.DB, cid, userId);

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM npcs WHERE campaignId = ? ORDER BY name`
  ).bind(cid).all();

  const sanitized = (results ?? []).map(r => hideEnemySecrets(r, director));
  return c.json(sanitized);
});

// create
npcs.post('/campaigns/:cid/supporting-characters', async (c) => {
  const { cid } = c.req.param();
  const userId = c.get('userId') || '';
  if (!(await isDirector(c.env.DB, cid, userId))) return c.body('Forbidden', 403);

  const body = await c.req.json();
  const parsed = CreateNpc.parse(body);

  // featPoints default by enemy type
  let featPoints: number | null = null;
  if (parsed.side === 'enemy') {
    featPoints = parsed.enemyType === 'goon' ? 1 : parsed.enemyType === 'bad_guy' ? 3 : 5;
  }

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await c.env.DB.prepare(`
    INSERT INTO npcs (
      id, campaignId, name, side, portraitUrl,
      brawn, nerves, smooth, focus, crime, allyGrit,
      enemyType, enemyGritMax, enemyGrit, attackLevel, defenseLevel, weakSpot, weakSpotDiscovered, featPoints,
      created_at, updated_at
    ) VALUES (?,?,?,?,?,
              ?,?,?,?,?,?,
              ?,?,?,?,?,?,?,?, ?,?)
  `).bind(
    id, cid, parsed.name, parsed.side, parsed.portraitUrl ?? null,
    parsed.side === 'ally' ? parsed.brawn : null,
    parsed.side === 'ally' ? parsed.nerves : null,
    parsed.side === 'ally' ? parsed.smooth : null,
    parsed.side === 'ally' ? parsed.focus : null,
    parsed.side === 'ally' ? parsed.crime : null,
    parsed.side === 'ally' ? parsed.allyGrit : null,
    parsed.side === 'enemy' ? parsed.enemyType : null,
    parsed.side === 'enemy' ? parsed.enemyGritMax : null,
    parsed.side === 'enemy' ? parsed.enemyGrit : null,
    parsed.side === 'enemy' ? parsed.attackLevel : null,
    parsed.side === 'enemy' ? parsed.defenseLevel : null,
    parsed.side === 'enemy' ? parsed.weakSpot : null,
    parsed.side === 'enemy' ? (parsed.weakSpotDiscovered ? 1 : 0) : 0,
    featPoints,
    now, now
  ).run();

  const row = await c.env.DB.prepare(`SELECT * FROM npcs WHERE id = ?`).bind(id).first();
  return c.json(row, 201);
});

// update
npcs.patch('/campaigns/:cid/supporting-characters/:id', async (c) => {
  const { cid, id } = c.req.param();
  const userId = c.get('userId') || '';
  if (!(await isDirector(c.env.DB, cid, userId))) return c.body('Forbidden', 403);

  const body = await c.req.json();
  const upd = UpdateNpc.parse(body);

  const fields = Object.keys(upd);
  const sets = fields.map(k => `${k} = ?`);
  const values = fields.map(k => (k === 'weakSpotDiscovered' ? (upd as any)[k] ? 1 : 0 : (upd as any)[k]));
  const now = Math.floor(Date.now()/1000);

  await c.env.DB.prepare(
    `UPDATE npcs SET ${sets.join(', ')}, updated_at = ? WHERE id = ? AND campaignId = ?`
  ).bind(...values, now, id, cid).run();

  const row = await c.env.DB.prepare(`SELECT * FROM npcs WHERE id = ?`).bind(id).first();
  return c.json(row);
});

// delete (hard delete)
npcs.delete('/campaigns/:cid/supporting-characters/:id', async (c) => {
  const { cid, id } = c.req.param();
  const userId = c.get('userId') || '';
  if (!(await isDirector(c.env.DB, cid, userId))) return c.body('Forbidden', 403);

  await c.env.DB.prepare(`DELETE FROM npcs WHERE id = ? AND campaignId = ?`).bind(id, cid).run();
  return c.body(null, 204);
});
