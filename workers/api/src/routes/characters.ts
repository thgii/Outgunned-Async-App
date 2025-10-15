import { Hono } from "hono";
import { q, one } from "../utils/db";
import {
  characterSchema,
  normalizeYouLook,
  type CharacterDTO
} from "@action-thread/types";

export const characters = new Hono<{ Bindings: { DB: D1Database } }>();

// 🔎 quick ping
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
  const row = await one<any>(c.env.DB, "SELECT * FROM characters WHERE id = ?", [id]);
  if (!row) return c.notFound();
  for (const k of ["attributes","skills","resources","feats","gear","conditions"]) {
    if (row[k]) row[k] = JSON.parse(row[k]);
  }
  return c.json(row);
});

// CREATE (schema-first)
characters.post("/", async (c) => {
  let body: any = null;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "bad_request", message: "Invalid JSON" }, 400);
  }

  // Validate & normalize against canonical sheet schema
  let dto: CharacterDTO;
  try {
    // allow campaign/owner/tropeAttribute to pass through unvalidated:
    const base = { ...body };
    dto = normalizeYouLook(characterSchema.parse(base));
  } catch (e: any) {
    return c.json({ error: "validation_error", issues: e?.errors ?? String(e) }, 422);
  }

  const id        = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  // Pass-through meta (not in schema)
  const campaignId    = body.campaignId ?? "demo-camp";
  const ownerId       = body.ownerId    ?? "demo-user";
  const tropeAttribute = body.tropeAttribute ?? null;

  // Split canonical DTO into your DB columns
  const name        = dto.name.trim();
  const role        = dto.role;
  const trope       = dto.trope ?? null;
  const age         = dto.age ?? null;
  const job         = dto.jobOrBackground ?? null;
  const catchphrase = dto.catchphrase ?? null;
  const flaw        = dto.flaw ?? null;

  const feats       = JSON.stringify(dto.feats ?? []);
  const attributes  = JSON.stringify(dto.attributes ?? {});
  const skills      = JSON.stringify(dto.skills ?? {});
  const resources   = JSON.stringify({
    grit: dto.grit,
    adrenaline: dto.adrenaline,
    spotlight: dto.spotlight,
    luck: dto.luck,
    youLookSelected: dto.youLookSelected,
    isBroken: dto.isBroken,
    deathRoulette: dto.deathRoulette,
    cash: dto.cash,
  });
  const gear        = JSON.stringify(dto.storage ?? { backpack:[], bag:[], gunsAndGear:[] });
  const conditions  = JSON.stringify(dto.youLookSelected ?? []);
  const notes       = dto.missionOrTreasure ?? null;

  if (!name) return c.json({ error: "name is required" }, 400);

  await c.env.DB.prepare(
    `INSERT INTO characters
      (id, campaignId, ownerId, name, role, trope, age, job, catchphrase, flaw, tropeAttribute,
       feats, attributes, skills, resources, gear, conditions, notes, revision, createdAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id,
    campaignId,
    ownerId,
    name,
    role,
    trope,
    age,
    job,
    catchphrase,
    flaw,
    tropeAttribute,
    feats,
    attributes,
    skills,
    resources,
    gear,
    conditions,
    notes,
    1,
    createdAt
  ).run();

  const row = await one<any>(c.env.DB, "SELECT * FROM characters WHERE id = ?", [id]);
  for (const k of ["attributes","skills","resources","feats","gear","conditions"]) {
    if (row[k]) row[k] = JSON.parse(row[k]);
  }
  return c.json(row, 201);
});

// UPDATE (partial, schema-coerced)
characters.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await one<any>(c.env.DB, "SELECT * FROM characters WHERE id = ?", [id]);
  if (!existing) return c.notFound();

  let body: any = null;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "bad_request", message: "Invalid JSON" }, 400);
  }

  // Rebuild a DTO-like object from existing row (so we can parse with defaults)
  const existingDTO: Partial<CharacterDTO> = {
    id: existing.id,
    name: existing.name,
    role: existing.role,
    trope: existing.trope ?? "",
    age: existing.age ?? "Adult",
    jobOrBackground: existing.job ?? "",
    catchphrase: existing.catchphrase ?? "",
    flaw: existing.flaw ?? "",
    // unpack JSON columns
    ...(existing.attributes ? { attributes: JSON.parse(existing.attributes) } : {}),
    ...(existing.skills ? { skills: JSON.parse(existing.skills) } : {}),
    ...(existing.resources ? JSON.parse(existing.resources) : {}),
    storage: existing.gear ? JSON.parse(existing.gear) : { backpack:[], bag:[], gunsAndGear:[] },
    feats: existing.feats ? JSON.parse(existing.feats) : [],
    missionOrTreasure: existing.notes ?? "",
  };

  // Merge PATCH body over the reconstructed DTO and validate
  let dto: CharacterDTO;
  try {
    dto = normalizeYouLook(
      characterSchema.parse({ ...existingDTO, ...body })
    );
  } catch (e: any) {
    return c.json({ error: "validation_error", issues: e?.errors ?? String(e) }, 422);
  }

  // Column splits (same as POST)
  const name        = dto.name.trim();
  const role        = dto.role;
  const trope       = dto.trope ?? null;
  const age         = dto.age ?? null;
  const job         = dto.jobOrBackground ?? null;
  const catchphrase = dto.catchphrase ?? null;
  const flaw        = dto.flaw ?? null;
  const tropeAttribute = body.tropeAttribute ?? existing.tropeAttribute ?? null;

  const feats       = JSON.stringify(dto.feats ?? []);
  const attributes  = JSON.stringify(dto.attributes ?? {});
  const skills      = JSON.stringify(dto.skills ?? {});
  const resources   = JSON.stringify({
    grit: dto.grit,
    adrenaline: dto.adrenaline,
    spotlight: dto.spotlight,
    luck: dto.luck,
    youLookSelected: dto.youLookSelected,
    isBroken: dto.isBroken,
    deathRoulette: dto.deathRoulette,
    cash: dto.cash,
  });
  const gear        = JSON.stringify(dto.storage ?? { backpack:[], bag:[], gunsAndGear:[] });
  const conditions  = JSON.stringify(dto.youLookSelected ?? []);
  const notes       = dto.missionOrTreasure ?? null;

  await c.env.DB.prepare(
    `UPDATE characters SET
      name=?, role=?, trope=?, age=?, job=?, catchphrase=?, flaw=?, tropeAttribute=?,
      feats=?, attributes=?, skills=?, resources=?, gear=?, conditions=?, notes=?,
      revision=COALESCE(revision,0)+1
     WHERE id=?`
  ).bind(
    name, role, trope, age, job, catchphrase, flaw, tropeAttribute,
    feats, attributes, skills, resources, gear, conditions, notes,
    id
  ).run();

  const row = await one<any>(c.env.DB, "SELECT * FROM characters WHERE id = ?", [id]);
  for (const k of ["attributes","skills","resources","feats","gear","conditions"]) {
    if (row[k]) row[k] = JSON.parse(row[k]);
  }
  return c.json(row);
});

export default characters;