import { Hono } from "hono";
import { one } from "../utils/db";

export const characters = new Hono<{ Bindings: { DB: D1Database } }>();

characters.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await one(c.env.DB, "SELECT * FROM characters WHERE id = ?", [id]);
  if (!row) return c.notFound();
  // parse JSON fields
  for (const k of ["attributes","skills","resources","feats","gear","conditions"]) {
    if (row[k]) row[k] = JSON.parse(row[k]);
  }
  return c.json(row);
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
