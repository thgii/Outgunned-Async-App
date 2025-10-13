import { Hono } from "hono";
import { q, one } from "../utils/db"; // q is used by other routes; import it here too

export const characters = new Hono<{ Bindings: { DB: D1Database } }>();

// --- NEW: list characters (optionally by campaignId) ---
characters.get("/", async (c) => {
  const campaignId = c.req.query("campaignId");
  const rows = campaignId
    ? await q(c.env.DB, "SELECT * FROM characters WHERE campaignId = ? ORDER BY createdAt DESC", [campaignId])
    : await q(c.env.DB, "SELECT * FROM characters ORDER BY createdAt DESC", []);
  // parse JSON fields
  for (const row of rows) {
    for (const k of ["attributes","skills","resources","feats","gear","conditions"]) {
      if (row[k]) row[k] = JSON.parse(row[k]);
    }
  }
  return c.json(rows);
});

characters.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const fields = {
    name: body.name,
    role: body.role ?? null,
    trope: body.trope ?? null,
    feats: JSON.stringify(body.feats ?? []),
    attributes: JSON.stringify(body.attributes ?? {}),
    skills: JSON.stringify(body.skills ?? {}),
    resources: JSON.stringify(body.resources ?? {}),
    gear: JSON.stringify(body.gear ?? []),
    conditions: JSON.stringify(body.conditions ?? []),
    notes: body.notes ?? null,
    revision: (body.revision ?? 1) + 1
  };
  await c.env.DB.prepare(
    `UPDATE characters SET
      name=?, role=?, trope=?, feats=?, attributes=?, skills=?, resources=?, gear=?, conditions=?, notes=?, revision=?
     WHERE id=?`
  ).bind(
    fields.name, fields.role, fields.trope, fields.feats, fields.attributes, fields.skills,
    fields.resources, fields.gear, fields.conditions, fields.notes, fields.revision, id
  ).run();
  const row = await one(c.env.DB, "SELECT * FROM characters WHERE id = ?", [id]);
  // parse JSON
  for (const k of ["attributes","skills","resources","feats","gear","conditions"]) {
    if (row[k]) row[k] = JSON.parse(row[k]);
  }
  return c.json(row);
});

characters.post("/", async (c) => {
  const body = await c.req.json();

  // minimal defaults to satisfy schema
  const id        = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const campaignId = body.campaignId ?? "demo-camp"; // adjust to your flow
  const ownerId    = body.ownerId    ?? "demo-user";  // replace with your auth/user id
  const name       = body.name?.trim();

  if (!name) return c.json({ error: "name is required" }, 400);

  // coerce payload
  const role        = body.role ?? null;
  const trope       = body.trope ?? null;
  const feats       = JSON.stringify(body.feats ?? []);
  const attributes  = JSON.stringify(body.attributes ?? {});     // REQUIRED
  const skills      = JSON.stringify(body.skills ?? {});         // REQUIRED
  const resources   = JSON.stringify(body.resources ?? {});      // optional
  const gear        = JSON.stringify(body.gear ?? []);           // optional
  const conditions  = JSON.stringify(body.conditions ?? []);     // optional
  const notes       = body.notes ?? null;
  const revision    = 1;

  await c.env.DB.prepare(
    `INSERT INTO characters
      (id, campaignId, ownerId, name, role, trope, feats, attributes, skills, resources, gear, conditions, notes, revision, createdAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id, campaignId, ownerId, name, role, trope, feats, attributes, skills, resources, gear, conditions, notes, revision, createdAt
  ).run();

  const row = await one(c.env.DB, "SELECT * FROM characters WHERE id = ?", [id]);
  // parse JSON fields before returning
  for (const k of ["attributes","skills","resources","feats","gear","conditions"]) {
    if (row[k]) row[k] = JSON.parse(row[k]);
  }
  return c.json(row, 201);
});
