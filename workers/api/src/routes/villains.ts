import { Hono } from "hono";
import { z } from "zod";

export const villains = new Hono<{ Bindings: { DB: D1Database }, Variables: { user?: { id: string } } }>();

const VillainSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["goon","bad_guy","boss"]).optional().nullable(),
  portraitUrl: z.string().url().optional().nullable(),
  gritMax: z.number().int().min(0).optional().nullable(),
  grit: z.number().int().min(0).optional().nullable(),
  attackLevel: z.enum(["Basic","Critical","Extreme"]).optional().nullable(),
  defenseLevel: z.enum(["Basic","Critical","Extreme"]).optional().nullable(),
  tags: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  data: z.record(z.unknown()).optional().nullable(),
});

const now = () => new Date().toISOString();

async function isDirectorForCampaign(DB: D1Database, userId: string | undefined, campaignId: string) {
  if (!userId) return false;
  const row = await DB.prepare("SELECT role FROM memberships WHERE userId=? AND campaignId=? LIMIT 1")
    .bind(userId, campaignId)
    .first<{ role: string }>();
  return !!row && row.role.toLowerCase() === "director";
}

// GET /campaigns/:id/villains  (all members can read; public if you prefer—adjust here)
villains.get("/campaigns/:id/villains", async (c) => {
  const campaignId = c.req.param("id");
  const res = await c.env.DB
    .prepare("SELECT * FROM villains WHERE campaignId = ? ORDER BY createdAt ASC")
    .bind(campaignId)
    .all();
  return c.json(res.results ?? []);
});

// POST /campaigns/:id/villains  (director only)
villains.post("/campaigns/:id/villains", async (c) => {
  const campaignId = c.req.param("id");
  const user = c.get("user") as { id: string } | undefined;
  const isDirector = await isDirectorForCampaign(c.env.DB, user?.id, campaignId);
  if (!isDirector) return c.json({ error: "Forbidden" }, 403);

  const data = VillainSchema.parse(await c.req.json());
  const id = crypto.randomUUID();
  const ts = now();

  await c.env.DB.prepare(
    `INSERT INTO villains (id, campaignId, name, type, portraitUrl, gritMax, grit, attackLevel, defenseLevel, tags, bio, data, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, campaignId, data.name, data.type ?? null, data.portraitUrl ?? null,
    data.gritMax ?? null, data.grit ?? null, data.attackLevel ?? null, data.defenseLevel ?? null,
    data.tags ?? null, data.bio ?? null, data.data ? JSON.stringify(data.data) : null,
    ts, ts
  ).run();

  const row = await c.env.DB.prepare("SELECT * FROM villains WHERE id = ?").bind(id).first();
  return c.json(row, 201);
});

// PATCH /campaigns/:id/villains/:villainId  (director only)
villains.patch("/campaigns/:id/villains/:villainId", async (c) => {
  const campaignId = c.req.param("id");
  const villainId = c.req.param("villainId");
  const user = c.get("user") as { id: string } | undefined;
  const isDirector = await isDirectorForCampaign(c.env.DB, user?.id, campaignId);
  if (!isDirector) return c.json({ error: "Forbidden" }, 403);

  const patch = VillainSchema.partial().parse(await c.req.json());
  const row = await c.env.DB.prepare("SELECT * FROM villains WHERE id = ? AND campaignId = ?").bind(villainId, campaignId).first<any>();
  if (!row) return c.json({ error: "Not found" }, 404);

  const next = {
    name: patch.name ?? row.name,
    type: patch.type ?? row.type,
    portraitUrl: patch.portraitUrl ?? row.portraitUrl,
    gritMax: patch.gritMax ?? row.gritMax,
    grit: patch.grit ?? row.grit,
    attackLevel: patch.attackLevel ?? row.attackLevel,
    defenseLevel: patch.defenseLevel ?? row.defenseLevel,
    tags: patch.tags ?? row.tags,
    bio: patch.bio ?? row.bio,
    data: patch.data ? JSON.stringify(patch.data) : row.data,
    updatedAt: now(),
  };

  await c.env.DB.prepare(
    `UPDATE villains SET
       name=?, type=?, portraitUrl=?, gritMax=?, grit=?, attackLevel=?, defenseLevel=?, tags=?, bio=?, data=?, updatedAt=?
     WHERE id=? AND campaignId=?`
  ).bind(
    next.name, next.type, next.portraitUrl, next.gritMax, next.grit, next.attackLevel, next.defenseLevel,
    next.tags, next.bio, next.data, next.updatedAt, villainId, campaignId
  ).run();

  const updated = await c.env.DB.prepare("SELECT * FROM villains WHERE id = ?").bind(villainId).first();
  return c.json(updated);
});

// DELETE /campaigns/:id/villains/:villainId  (director only)
villains.delete("/campaigns/:id/villains/:villainId", async (c) => {
  const campaignId = c.req.param("id");
  const villainId = c.req.param("villainId");
  const user = c.get("user") as { id: string } | undefined;
  const isDirector = await isDirectorForCampaign(c.env.DB, user?.id, campaignId);
  if (!isDirector) return c.json({ error: "Forbidden" }, 403);

  await c.env.DB.prepare("DELETE FROM villains WHERE id = ? AND campaignId = ?").bind(villainId, campaignId).run();
  return c.json({ ok: true });
});

export default villains;
