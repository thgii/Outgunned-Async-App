import { Hono } from "hono";
import { q, one } from "../utils/db";

export const characters = new Hono<{ Bindings: { DB: D1Database } }>();

// 🔎 quick ping: GET /characters/__ping  (also works if mounted at /api/characters)
characters.get("/__ping", (c) => c.text("OK: characters router mounted"));

// LIST (optional ?campaignId=...)
characters.get("/", async (c) => {
  const campaignId = c.req.query("campaignId");
  const rows = campaignId
    ? await q(c.env.DB, "SELECT * FROM characters WHERE campaignId = ? ORDER BY createdAt DESC", [campaignId])
    : await q(c.env.DB, "SELECT * FROM characters ORDER BY createdAt DESC", []);
  for (const row of rows) {
    for (const k of ["attributes","skills","resources","feats","gear","conditions"]) {
      if (row[k]) row[k] = JSON.parse(row[k]);
    }
  }
  return c.json(rows);
});

// GET one
characters.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await one(c.env.DB, "SELECT * FROM characters WHERE id = ?", [id]);
  if (!row) return c.notFound();
  for (const k of ["attributes","skills","resources","feats","gear","conditions"]) {
    if (row[k]) row[k] = JSON.parse(row[k]);
  }
  return c.json(row);
});

// CREATE
characters.post("/", async (c) => {
  const body = await c.req.json();

  const id        = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const campaignId = body.campaignId ?? "demo-camp";
  const ownerId    = body.ownerId    ?? "demo-user";
  const name       = body.name?.trim();
  if (!name) return c.json({ error: "name is required" }, 400);

  // Normalize role/trope to string names (avoid "[object Object]")
  const role  = typeof body.role  === "string" ? body.role  : body.role?.name ?? null;
  const trope = typeof body.trope === "string" ? body.trope : body.trope?.name ?? null;

  await c.env.DB.prepare(
    `INSERT INTO characters
      (id, campaignId, ownerId, name, role, trope, feats, attributes, skills, resources, gear, conditions, notes, revision, createdAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id,
    campaignId,
    ownerId,
    name,
    role,
    trope,
    JSON.stringify(body.feats ?? []),
    JSON.stringify(body.attributes ?? {}),
    JSON.stringify(body.skills ?? {}),
    JSON.stringify(body.resources ?? {}),
    JSON.stringify(body.gear ?? []),
    JSON.stringify(body.conditions ?? []),
    body.notes ?? null,
    1,
    createdAt
  ).run();

  const row = await one(c.env.DB, "SELECT * FROM characters WHERE id = ?", [id]);
  for (const k of ["attributes","skills","resources","feats","gear","conditions"]) {
    if (row[k]) row[k] = JSON.parse(row[k]);
  }
  return c.json(row, 201);
});

// UPDATE (only set provided fields; keeps NOT NULLs safe)
characters.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const sets: string[] = [];
  const vals: any[] = [];
  const set = (col: string, val: any) => { sets.push(`${col}=?`); vals.push(val); };

  if (body.name !== undefined) set("name", body.name);

  if (body.role !== undefined) {
    const role  = typeof body.role  === "string" ? body.role  : body.role?.name ?? null;
    set("role", role);
  }
  if (body.trope !== undefined) {
    const trope = typeof body.trope === "string" ? body.trope : body.trope?.name ?? null;
    set("trope", trope);
  }

  if (body.feats       !== undefined) set("feats",      JSON.stringify(body.feats ?? []));
  if (body.attributes  !== undefined) set("attributes", JSON.stringify(body.attributes ?? {}));
  if (body.skills      !== undefined) set("skills",     JSON.stringify(body.skills ?? {}));
  if (body.resources   !== undefined) set("resources",  JSON.stringify(body.resources ?? {}));
  if (body.gear        !== undefined) set("gear",       JSON.stringify(body.gear ?? []));
  if (body.conditions  !== undefined) set("conditions", JSON.stringify(body.conditions ?? []));
  if (body.notes       !== undefined) set("notes",      body.notes ?? null);

  if (!sets.length) return c.json({ error: "no fields to update" }, 400);
  set("revision", (body.revision ?? 1) + 1);

  vals.push(id);
  await c.env.DB.prepare(`UPDATE characters SET ${sets.join(", ")} WHERE id=?`).bind(...vals).run();

  const row = await one(c.env.DB, "SELECT * FROM characters WHERE id = ?", [id]);
  for (const k of ["attributes","skills","resources","feats","gear","conditions"]) {
    if (row[k]) row[k] = JSON.parse(row[k]);
  }
  return c.json(row);
});
