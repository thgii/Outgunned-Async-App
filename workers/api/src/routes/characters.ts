// workers/api/src/routes/characters.ts
import { Hono } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import { q, one } from "../utils/db";
import {
  characterSchema,
  normalizeYouLook,
  type CharacterDTO,
} from "@action-thread/types";

type Env = { DB: D1Database };
export const characters = new Hono<{ Bindings: Env }>();

// JSON columns we store as TEXT in D1
const JSON_FIELDS = [
  "attributes",
  "skills",
  "resources",
  "feats",
  "gear",
  "conditions",
] as const;

type CharRow = Record<string, any>;

function parseJsonFields(row: CharRow): CharRow {
  for (const k of JSON_FIELDS) {
    const v = row[k];
    if (typeof v === "string" && v.length) {
      try {
        row[k] = JSON.parse(v);
      } catch {
        // leave as-is if not valid JSON
      }
    }
  }
  return row;
}

/** -------- helpers -------- */
function getMaybeName(v: any): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "object") return v.name ?? v.value ?? v.label ?? undefined;
  if (typeof v === "string") return v || undefined;
  return String(v);
}

/** -------- resources helpers -------- */
function normalizeGrit(v: any) {
  if (v == null) return v;
  if (typeof v === "number") return { current: Math.max(0, Math.min(12, v)), max: 12 };
  if (typeof v === "object") {
    const curN = Number(v.current ?? v.curr ?? v.value ?? v);
    const maxN = Number(v.max ?? v.maximum ?? v.limit ?? 12);
    const cur = Number.isFinite(curN) ? curN : 0;
    const max = Number.isFinite(maxN) ? maxN : 12;
    // clamp to 0–12 to match UI + Zod
    return {
      current: Math.max(0, Math.min(12, cur)),
      max: Math.max(1, Math.min(12, max)),
    };
  }
  return v;
}

function safeMergeResources(oldR: any, newR: any) {
  const base = typeof oldR === "object" && oldR ? oldR : {};
  const incoming = typeof newR === "object" && newR ? newR : {};
  const merged: any = { ...base, ...incoming };

  // normalize grit shape if present
  if (merged.grit != null) {
    merged.grit = normalizeGrit(merged.grit);
  } else if (base.grit != null) {
    merged.grit = normalizeGrit(base.grit);
  }

  // ensure counters don’t get dropped if not provided this patch
  ["adrenaline", "spotlight", "luck", "cash"].forEach((k) => {
    if (merged[k] == null && base[k] != null) merged[k] = base[k];
  });

  // keep youLook and flags and ride unless explicitly overridden
  ["youLookSelected", "isBroken", "deathRoulette", "ride"].forEach((k) => {
    if (merged[k] == null && base[k] != null) merged[k] = base[k];
  });

  return merged;
}

function pickTopLevelResourceOverrides(body: any) {
  const r: Record<string, any> = {};
  if (body == null) return r;
  if ("grit" in body) r.grit = body.grit;
  if ("spotlight" in body) r.spotlight = body.spotlight;
  if ("cash" in body) r.cash = body.cash;
  if ("ride" in body) r.ride = body.ride;
  if ("youLookSelected" in body) r.youLookSelected = body.youLookSelected;
  if ("isBroken" in body) r.isBroken = body.isBroken;
  if ("deathRoulette" in body) r.deathRoulette = body.deathRoulette;

  // 🔗 Unify adrenaline/luck (either can be provided; treat as one pool)
  const a = body?.adrenaline;
  const l = body?.luck;
  if (a != null || l != null) {
    const v = Number(a ?? l) || 0;
    r.adrenaline = v;
    r.luck = v;
  }

  return r;
}


// 🔎 quick ping
characters.get("/__ping", (c) => c.text("OK: characters router mounted"));

// LIST (optional ?campaignId=...)
characters.get("/", async (c) => {
  const campaignId = c.req.query("campaignId");

  const rows = (campaignId
    ? await q(
        c.env.DB,
        "SELECT * FROM characters WHERE campaignId = ? ORDER BY createdAt DESC",
        [campaignId]
      )
    : await q(
        c.env.DB,
        "SELECT * FROM characters ORDER BY createdAt DESC",
        []
      )) as CharRow[];

  for (const row of rows) parseJsonFields(row);
  return c.json(rows);
});

// GET one
characters.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = (await one(
    c.env.DB,
    "SELECT * FROM characters WHERE id = ?",
    [id]
  )) as CharRow | null;
  if (!row) return c.notFound();
  parseJsonFields(row);
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
    return c.json(
      { error: "validation_error", issues: e?.errors ?? String(e) },
      422
    );
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  // Pass-through meta (not in schema)
  const campaignId = body.campaignId ?? "demo-camp";
  const ownerId = body.ownerId ?? "demo-user";
  const tropeAttribute = body.tropeAttribute ?? null;

  // Split canonical DTO into your DB columns
  const name = dto.name.trim();
  const role = dto.role;
  const trope = dto.trope ?? null;
  const age = dto.age ?? null;

  // Prefer body.job; then legacy background; then dto.jobOrBackground
  const job =
    getMaybeName(body.job) ??
    getMaybeName(body.background) ??
    getMaybeName((dto as any).jobOrBackground) ??
    null;

  const catchphrase = dto.catchphrase ?? null;
  const flaw = dto.flaw ?? null;

  const feats = JSON.stringify(dto.feats ?? []);
  const attributes = JSON.stringify(dto.attributes ?? {});
  const skills = JSON.stringify(dto.skills ?? {});

  // Build resources for CREATE from: body.resources + top-level overrides + only youLook-ish overlay
  const bodyResourceObj =
    body && typeof body.resources === "object" ? body.resources : {};
  const topLevelOverrides = pickTopLevelResourceOverrides(body);
  const mergedForPost = safeMergeResources({}, { ...bodyResourceObj, ...topLevelOverrides });

  // Only overlay fields normalized by normalizeYouLook; DO NOT overlay grit/adrenaline/spotlight/luck/cash from dto
  const dtoYouLookOverlay = {
    youLookSelected: (dto as any).youLookSelected,
    isBroken: (dto as any).isBroken,
    deathRoulette: (dto as any).deathRoulette,
  };
  const finalResourcesPost = safeMergeResources(mergedForPost, dtoYouLookOverlay);
  const resources = JSON.stringify(finalResourcesPost);

  const gear = JSON.stringify(
    (dto as any).storage ?? { backpack: [], bag: [], gunsAndGear: [] }
  );

  // Conditions mirror what ended up in resources
  const conditions = JSON.stringify(finalResourcesPost.youLookSelected ?? []);

  // Notes: drop missionOrTreasure; accept a plain "notes" if provided
  const notes =
    typeof body.notes === "string" && body.notes.trim().length
      ? body.notes.trim()
      : null;

  if (!name) return c.json({ error: "name is required" }, 400);

  await c.env.DB
    .prepare(
      `INSERT INTO characters
        (id, campaignId, ownerId, name, role, trope, age, job, catchphrase, flaw, tropeAttribute,
         feats, attributes, skills, resources, gear, conditions, notes, revision, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
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
    )
    .run();

  const row = (await one(
    c.env.DB,
    "SELECT * FROM characters WHERE id = ?",
    [id]
  )) as CharRow | null;
  if (!row) return c.notFound();
  parseJsonFields(row);
  return c.json(row, 201);
});

// UPDATE (partial, schema-coerced)
characters.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = (await one(
    c.env.DB,
    "SELECT * FROM characters WHERE id = ?",
    [id]
  )) as CharRow | null;
  if (!existing) return c.notFound();

  let body: any = null;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "bad_request", message: "Invalid JSON" }, 400);
  }

  // Rebuild a DTO-like object from existing row (so we can parse with defaults)
  let existingAttributes = {};
  let existingSkills = {};
  let existingResources: any = {};
  let existingGear = { backpack: [], bag: [], gunsAndGear: [] as any[] };
  let existingFeats: any[] = [];
  try {
    if (existing.attributes) existingAttributes = JSON.parse(existing.attributes);
  } catch {}
  try {
    if (existing.skills) existingSkills = JSON.parse(existing.skills);
  } catch {}
  try {
    if (existing.resources) existingResources = JSON.parse(existing.resources);
  } catch {}
  try {
    if (existing.gear) existingGear = JSON.parse(existing.gear);
  } catch {}
  try {
    if (existing.feats) existingFeats = JSON.parse(existing.feats);
  } catch {}

  const existingDTO: Partial<CharacterDTO> = {
    id: existing.id,
    name: existing.name,
    role: existing.role,
    trope: existing.trope ?? "",
    age: existing.age ?? "Adult",
    jobOrBackground: existing.job ?? "",
    catchphrase: existing.catchphrase ?? "",
    flaw: existing.flaw ?? "",
    attributes: existingAttributes as any,
    skills: existingSkills as any,
    // Bring resource-like fields up so schema/coercion works the same as POST
    ...(typeof existingResources === "object" && existingResources
      ? {
          grit: existingResources.grit,
          adrenaline: existingResources.adrenaline,
          spotlight: existingResources.spotlight,
          luck: existingResources.luck,
          cash: existingResources.cash,
          youLookSelected: existingResources.youLookSelected,
          isBroken: existingResources.isBroken,
          deathRoulette: existingResources.deathRoulette,
        }
      : {}),
    storage: existingGear,
    feats: existingFeats,
  };

  // Merge PATCH body over the reconstructed DTO and validate
  let dto: CharacterDTO;
  try {
    dto = normalizeYouLook(characterSchema.parse({ ...existingDTO, ...body }));
  } catch (e: any) {
    return c.json(
      { error: "validation_error", issues: e?.errors ?? String(e) },
      422
    );
  }

  // Column splits (same as POST)
  const name = dto.name.trim();
  const role = dto.role;
  const trope = dto.trope ?? null;
  const age = dto.age ?? null;

  // Prefer new body.job value; support legacy background; then fall back to dto/existing
  const job =
    getMaybeName(body.job) ??
    getMaybeName(body.background) ??
    getMaybeName((dto as any).jobOrBackground) ??
    existing.job ??
    null;

  const catchphrase = dto.catchphrase ?? null;
  const flaw = dto.flaw ?? null;
  const tropeAttribute = body.tropeAttribute ?? existing.tropeAttribute ?? null;

  const feats = JSON.stringify(dto.feats ?? []);
  const attributes = JSON.stringify(dto.attributes ?? {});
  const skills = JSON.stringify(dto.skills ?? {});

  // Merge resources:
  //  - existing.resources (DB)
  //  - body.resources (if provided)
  //  - top-level overrides (grit, adrenaline, etc.) if provided
  const bodyResourceObj =
    body && typeof body.resources === "object" ? body.resources : {};
  const topLevelOverrides = pickTopLevelResourceOverrides(body);
  const mergedResources = safeMergeResources(
    existingResources,
    { ...bodyResourceObj, ...topLevelOverrides }
  );

  // Only overlay the fields that normalizeYouLook() adjusts; DO NOT overlay grit/adrenaline/spotlight/luck/cash from dto
  const dtoYouLookOverlay = {
    youLookSelected: (dto as any).youLookSelected,
    isBroken: (dto as any).isBroken,
    deathRoulette: (dto as any).deathRoulette,
  };
  const finalResourcesPatch = safeMergeResources(mergedResources, dtoYouLookOverlay);

  // 🔗 Final guard: keep adrenaline and luck equal (single pool)
  const vPool = Number(finalResourcesPatch?.adrenaline ?? finalResourcesPatch?.luck ?? 0) || 0;
  finalResourcesPatch.adrenaline = vPool;
  finalResourcesPatch.luck = vPool;

  const resources = JSON.stringify(finalResourcesPatch);


  const gear = JSON.stringify(
    (dto as any).storage ?? { backpack: [], bag: [], gunsAndGear: [] }
  );

  // Conditions mirror what ended up in resources (final)
  const conditions = JSON.stringify(
    finalResourcesPatch.youLookSelected ?? (dto as any).youLookSelected ?? []
  );

  // Notes: keep existing unless an explicit "notes" string is provided
  const notes =
    typeof body.notes === "string"
      ? body.notes
      : existing.notes ?? null;

  await c.env.DB
    .prepare(
      `UPDATE characters SET
        name = COALESCE(?, name),
        role = COALESCE(?, role),
        trope = COALESCE(?, trope),
        age = COALESCE(?, age),
        job = COALESCE(?, job),
        catchphrase = COALESCE(?, catchphrase),
        flaw = COALESCE(?, flaw),
        tropeAttribute = COALESCE(?, tropeAttribute),
        feats = COALESCE(?, feats),
        attributes = COALESCE(?, attributes),
        skills = COALESCE(?, skills),
        resources = COALESCE(?, resources),
        gear = COALESCE(?, gear),
        conditions = COALESCE(?, conditions),
        notes = COALESCE(?, notes),
        revision = COALESCE(revision, 0) + 1
      WHERE id = ?`
    )
    .bind(
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
      id
    )
    .run();

  const row = (await one(
    c.env.DB,
    "SELECT * FROM characters WHERE id = ?",
    [id]
  )) as CharRow | null;
  if (!row) return c.notFound();
  parseJsonFields(row);
  return c.json(row);
});

characters.delete("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    await c.env.DB.prepare("DELETE FROM characters WHERE id = ?").bind(id).run();
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: "delete_failed", message: String(e) }, 500);
  }
});

export default characters;
