import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import { z } from 'zod';

type Env = { DB: D1Database };
export const npcs = new Hono<{ Bindings: Env }>();

// ----- helpers -----
const Level3 = z.enum(['Basic','Critical','Extreme']);
const Side = z.enum(['ally','enemy']);
const EnemyType = z.enum(['goon','bad_guy','boss']);

const CreateBase = z.object({
  name: z.string().min(1),
  side: Side,
  // accept http(s) OR data: URLs
  portraitUrl: z
    .string()
    .url("Must be a valid URL")
    .max(2048)
    .optional()
    .nullable(),
});

const CreateAlly = CreateBase.extend({
  side: z.literal('ally'),
  brawn: z.number().int().min(3).max(5),
  nerves: z.number().int().min(3).max(5),
  smooth: z.number().int().min(3).max(5),
  focus: z.number().int().min(3).max(5),
  crime: z.number().int().min(3).max(5),
  allyGrit: z.number().int().min(0).max(3).default(0),
  help: z.string().optional().nullable(),
  flaw: z.string().optional().nullable(),
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
  enemyActiveFeats: z.string().optional().nullable(),
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
  help: z.string().optional().nullable(),
  flaw: z.string().optional().nullable(),

  // enemies
  enemyGritMax: z.number().int().min(1).optional(),
  enemyGrit: z.number().int().min(0).optional(),
  attackLevel: Level3.optional(),
  defenseLevel: Level3.optional(),
  weakSpot: z.string().optional(),
  weakSpotDiscovered: z.boolean().optional(),
  enemyActiveFeats: z.string().optional().nullable(),
}).refine(o => Object.keys(o).length > 0, 'Nothing to update');

// Templates reuse the same shape as Npcs (minus campaignId/runtime stuff)
const CreateNpcTemplate = CreateNpc;
const UpdateNpcTemplate = UpdateNpc;

async function isDirector(DB: D1Database, campaignId: string, userId: string) {
  const row = await DB.prepare(
    `SELECT role FROM memberships WHERE campaignId = ? AND userId = ? LIMIT 1`
  ).bind(campaignId, userId).first<{ role?: string }>();
  return (row?.role ?? '').toLowerCase() === 'director';
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
// =========== NPC TEMPLATES (GLOBAL LIBRARY) ===========

// List all templates
npcs.get('/npc-templates', async (c) => {
  const user = c.get('user');
  if (!user?.id) return c.json({ error: 'unauthorized' }, 401);

  const { results } = await c.env.DB
    .prepare(`SELECT * FROM npc_templates ORDER BY name`)
    .all<any>();

  return c.json(results ?? []);
});

// Create a template
npcs.post('/npc-templates', async (c) => {
  const user = c.get('user');
  if (!user?.id) return c.json({ error: 'unauthorized' }, 401);

  const body = await c.req.json();
  const parsed = CreateNpcTemplate.parse(body);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO npc_templates (
      id, name, side, portraitUrl,
      brawn, nerves, smooth, focus, crime,
      allyGrit,
      enemyType, enemyGritMax, attackLevel, defenseLevel,
      weakSpot, featPoints, help, flaw,
      created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id,
    parsed.name,
    parsed.side,
    parsed.portraitUrl ?? null,

    // allies
    parsed.side === 'ally' ? parsed.brawn : null,
    parsed.side === 'ally' ? parsed.nerves : null,
    parsed.side === 'ally' ? parsed.smooth : null,
    parsed.side === 'ally' ? parsed.focus : null,
    parsed.side === 'ally' ? parsed.crime : null,
    parsed.side === 'ally' ? parsed.allyGrit : null,

    // enemies
    parsed.side === 'enemy' ? parsed.enemyType : null,
    parsed.side === 'enemy' ? parsed.enemyGritMax : null,
    parsed.side === 'enemy' ? parsed.attackLevel : null,
    parsed.side === 'enemy' ? parsed.defenseLevel : null,
    parsed.side === 'enemy' ? parsed.weakSpot : null,
    parsed.side === 'enemy'
      ? (parsed.enemyType === 'goon'
          ? 1
          : parsed.enemyType === 'bad_guy'
          ? 3
          : 5)
      : null,

    // ally notes
    parsed.side === 'ally' ? parsed.help ?? null : null,
    parsed.side === 'ally' ? parsed.flaw ?? null : null,

    now,
    now
  ).run();

  const row = await c.env.DB
    .prepare(`SELECT * FROM npc_templates WHERE id = ?`)
    .bind(id)
    .first<any>();

  return c.json(row, 201);
});

// Update template
npcs.patch('/npc-templates/:id', async (c) => {
  const user = c.get('user');
  if (!user?.id) return c.json({ error: 'unauthorized' }, 401);

  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = UpdateNpcTemplate.parse(body);
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  for (const [k, v] of Object.entries(parsed)) {
    fields.push(`${k} = ?`);
    values.push(v);
  }
  if (!fields.length) return c.json({ error: 'nothing_to_update' }, 400);

  fields.push(`updated_at = ?`);
  values.push(now);
  values.push(id);

  await c.env.DB.prepare(
    `UPDATE npc_templates SET ${fields.join(", ")} WHERE id = ?`
  ).bind(...values).run();

  const row = await c.env.DB
    .prepare(`SELECT * FROM npc_templates WHERE id = ?`)
    .bind(id)
    .first<any>();

  return c.json(row);
});

// Delete template
npcs.delete('/npc-templates/:id', async (c) => {
  const user = c.get('user');
  if (!user?.id) return c.json({ error: 'unauthorized' }, 401);

  const { id } = c.req.param();
  await c.env.DB.prepare(`DELETE FROM npc_templates WHERE id = ?`).bind(id).run();
  return c.body(null, 204);
});

npcs.get('/campaigns/:cid/supporting-characters', async (c) => {
  const { cid } = c.req.param();
  const user = c.get('user');
  const userId: string | undefined = user?.id;
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

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
  const user = c.get('user');
  const userId: string | undefined = user?.id;
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

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
      id,
      campaignId,
      name,
      side,
      portraitUrl,
      brawn,
      nerves,
      smooth,
      focus,
      crime,
      allyGrit,
      enemyType,
      enemyGritMax,
      enemyGrit,
      attackLevel,
      defenseLevel,
      weakSpot,
      weakSpotDiscovered,
      featPoints,
      enemyActiveFeats,
      created_at,
      updated_at,
      help,
      flaw
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id,
    cid,
    parsed.name,
    parsed.side,
    parsed.portraitUrl ?? null,
    // allies
    parsed.side === 'ally' ? parsed.brawn : null,
    parsed.side === 'ally' ? parsed.nerves : null,
    parsed.side === 'ally' ? parsed.smooth : null,
    parsed.side === 'ally' ? parsed.focus : null,
    parsed.side === 'ally' ? parsed.crime : null,
    parsed.side === 'ally' ? parsed.allyGrit : null,
    // enemies
    parsed.side === 'enemy' ? parsed.enemyType : null,
    parsed.side === 'enemy' ? parsed.enemyGritMax : null,
    parsed.side === 'enemy' ? parsed.enemyGrit : null,
    parsed.side === 'enemy' ? parsed.attackLevel : null,
    parsed.side === 'enemy' ? parsed.defenseLevel : null,
    parsed.side === 'enemy' ? parsed.weakSpot : null,
    parsed.side === 'enemy' ? (parsed.weakSpotDiscovered ? 1 : 0) : 0,
    featPoints,
    parsed.side === 'enemy' ? (parsed.enemyActiveFeats ?? null) : null,
    now,
    now,
    // ally notes
    parsed.side === 'ally' ? (parsed.help ?? null) : null,
    parsed.side === 'ally' ? (parsed.flaw ?? null) : null
  ).run();

  const row = await c.env.DB.prepare(`SELECT * FROM npcs WHERE id = ?`).bind(id).first();
  return c.json(row, 201);
});

// update
npcs.patch('/campaigns/:cid/supporting-characters/:id', async (c) => {
  const { cid, id } = c.req.param();
  const user = c.get('user');
  const userId: string | undefined = user?.id;
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

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
  const user = c.get('user');
  const userId: string | undefined = user?.id;
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  if (!(await isDirector(c.env.DB, cid, userId))) return c.body('Forbidden', 403);

  await c.env.DB.prepare(`DELETE FROM npcs WHERE id = ? AND campaignId = ?`).bind(id, cid).run();
  return c.body(null, 204);
});

// =========== ATTACH TEMPLATE TO CAMPAIGN ===========

npcs.post('/campaigns/:cid/npcs', async (c) => {
  const { cid } = c.req.param();
  const user = c.get('user');
  const userId: string | undefined = user?.id;
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  // Reuse your existing "isDirector" helper
  if (!(await isDirector(c.env.DB, cid, userId))) return c.body('Forbidden', 403);

  const body = await c.req.json<{ templateId: string }>().catch(() => null);
  if (!body?.templateId) return c.json({ error: 'missing_templateId' }, 400);

  // Load template
  const tpl = await c.env.DB
    .prepare(`SELECT * FROM npc_templates WHERE id = ?`)
    .bind(body.templateId)
    .first<any>();

  if (!tpl) return c.json({ error: 'template_not_found' }, 404);

    const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000); // keep consistent with other NPCs

  await c.env.DB.prepare(`
    INSERT INTO npcs (
      id,
      campaignId,
      name,
      side,
      portraitUrl,
      brawn,
      nerves,
      smooth,
      focus,
      crime,
      allyGrit,
      enemyType,
      enemyGritMax,
      enemyGrit,
      attackLevel,
      defenseLevel,
      weakSpot,
      weakSpotDiscovered,
      featPoints,
      enemyActiveFeats,
      created_at,
      updated_at,
      help,
      flaw
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id,
    cid,
    tpl.name,
    tpl.side,
    tpl.portraitUrl ?? null,

    // allies
    tpl.side === 'ally' ? tpl.brawn ?? null : null,
    tpl.side === 'ally' ? tpl.nerves ?? null : null,
    tpl.side === 'ally' ? tpl.smooth ?? null : null,
    tpl.side === 'ally' ? tpl.focus ?? null : null,
    tpl.side === 'ally' ? tpl.crime ?? null : null,
    // runtime ally starts at 0 grit
    tpl.side === 'ally' ? 0 : null,

    // enemies
    tpl.side === 'enemy' ? tpl.enemyType ?? null : null,
    tpl.side === 'enemy' ? tpl.enemyGritMax ?? 6 : null,
    // runtime enemy also starts at 0
    tpl.side === 'enemy' ? 0 : null,
    tpl.side === 'enemy' ? tpl.attackLevel ?? null : null,
    tpl.side === 'enemy' ? tpl.defenseLevel ?? null : null,
    tpl.side === 'enemy' ? tpl.weakSpot ?? null : null,
    tpl.side === 'enemy' ? 0 : 0, // weakSpotDiscovered: false for new enemies

    // featPoints default by type if missing on template
    tpl.side === 'enemy'
      ? (tpl.featPoints ??
         (tpl.enemyType === 'goon'
           ? 1
           : tpl.enemyType === 'bad_guy'
           ? 3
           : 5))
      : null,

    tpl.side === 'enemy' ? null : null, // enemyActiveFeats starts empty
    now,
    now,

    // ally notes
    tpl.side === 'ally' ? tpl.help ?? null : null,
    tpl.side === 'ally' ? tpl.flaw ?? null : null
  ).run();

  const row = await c.env.DB
    .prepare(`SELECT * FROM npcs WHERE id = ?`)
    .bind(id)
    .first<any>();

  return c.json(row, 201);
});
