import { Hono } from "hono";
import { q, one } from "../utils/db";
import ogData from "../lib/outgunned_data.server.json"; // <— static JSON for validation

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

// CREATE
characters.post("/", async (c) => {
  const body = await c.req.json();

  const id        = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const campaignId = body.campaignId ?? "demo-camp";
  const ownerId    = body.ownerId    ?? "demo-user";
  const name       = body.name?.trim();
  if (!name) return c.json({ error: "name is required" }, 400);

  // Normalize role/trope to string names
  const role  = typeof body.role  === "string" ? body.role  : body.role?.name ?? null;
  const trope = typeof body.trope === "string" ? body.trope : body.trope?.name ?? null;

  // NEW: normalize simple scalars
  const age            = body.age ?? null;
  const job            = body.job ?? null;
  const catchphrase    = body.catchphrase ?? null;
  const flaw           = body.flaw ?? null;
  const tropeAttribute = body.tropeAttribute ?? null;

  // OPTIONAL: lightweight validation (using static ogData import)
  try {
    const roles  = (ogData as any).roles ?? [];
    const tropes = (ogData as any).tropes ?? [];

    const roleObj  = roles.find((r: any) => r.name === role) ?? null;
    const tropeObj = tropes.find((t: any) => t.name === trope) ?? null;

    const allowedFeats = new Set<string>([
      ...((roleObj?.feat_options ?? roleObj?.feats) ?? []),
      ...((tropeObj?.feat_options ?? tropeObj?.feats) ?? []),
    ]);
    const invalidFeats = (body.feats ?? []).filter((f: string) => !allowedFeats.has(f));
    if (invalidFeats.length) {
      return c.json({ error: "validation", message: `Invalid feats: ${invalidFeats.join(", ")}` }, 400);
    }

    if (job && !(roleObj?.jobs_options ?? roleObj?.jobs ?? []).includes(job)) {
      return c.json({ error: "validation", message: "Invalid job for role." }, 400);
    }
    if (catchphrase && !(roleObj?.catchphrases_options ?? roleObj?.catchphrases ?? []).includes(catchphrase)) {
      return c.json({ error: "validation", message: "Invalid catchphrase for role." }, 400);
    }
    if (flaw && !(roleObj?.flaws_options ?? roleObj?.flaws ?? []).includes(flaw)) {
      return c.json({ error: "validation", message: "Invalid flaw for role." }, 400);
    }
    if (tropeAttribute && tropeObj?.attribute_options?.length && !tropeObj.attribute_options.includes(tropeAttribute)) {
      return c.json({ error: "validation", message: "Invalid tropeAttribute for trope." }, 400);
    }
  } catch {
    // If ogData import fails in build, just skip validation
  }

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

  // return the new row
  const row = await one<any>(c.env.DB, "SELECT * FROM characters WHERE id = ?", [id]);
  for (const k of ["attributes","skills","resources","feats","gear","conditions"]) {
    if (row[k]) row[k] = JSON.parse(row[k]);
  }
  return c.json(row, 201);
});

// UPDATE (partial)
characters.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await one<any>(c.env.DB, "SELECT * FROM characters WHERE id = ?", [id]);
  if (!existing) return c.notFound();

  const body = await c.req.json();

  const name           = body.name ?? existing.name;
  const role           = typeof body.role  === "string" ? body.role  : body.role?.name ?? existing.role;
  const trope          = typeof body.trope === "string" ? body.trope : body.trope?.name ?? existing.trope;
  const age            = body.age ?? existing.age;
  const job            = body.job ?? existing.job;
  const catchphrase    = body.catchphrase ?? existing.catchphrase;
  const flaw           = body.flaw ?? existing.flaw;
  const tropeAttribute = body.tropeAttribute ?? existing.tropeAttribute;

  const feats      = JSON.stringify(body.feats      ?? (existing.feats      ? JSON.parse(existing.feats)      : []));
  const attributes = JSON.stringify(body.attributes ?? (existing.attributes ? JSON.parse(existing.attributes) : {}));
  const skills     = JSON.stringify(body.skills     ?? (existing.skills     ? JSON.parse(existing.skills)     : {}));
  const resources  = JSON.stringify(body.resources  ?? (existing.resources  ? JSON.parse(existing.resources)  : {}));
  const gear       = JSON.stringify(body.gear       ?? (existing.gear       ? JSON.parse(existing.gear)       : []));
  const conditions = JSON.stringify(body.conditions ?? (existing.conditions ? JSON.parse(existing.conditions) : []));

  await c.env.DB.prepare(
    `UPDATE characters SET
      name=?, role=?, trope=?, age=?, job=?, catchphrase=?, flaw=?, tropeAttribute=?,
      feats=?, attributes=?, skills=?, resources=?, gear=?, conditions=?,
      revision=COALESCE(revision,0)+1
     WHERE id=?`
  ).bind(
    name, role, trope, age, job, catchphrase, flaw, tropeAttribute,
    feats, attributes, skills, resources, gear, conditions,
    id
  ).run();

  const row = await one<any>(c.env.DB, "SELECT * FROM characters WHERE id = ?", [id]);
  for (const k of ["attributes","skills","resources","feats","gear","conditions"]) {
    if (row[k]) row[k] = JSON.parse(row[k]);
  }
  return c.json(row);
});
