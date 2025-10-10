import { Hono } from "hono";
import { rollD6, analyze } from "../utils/dice";
import { one } from "../utils/db";

export const rolls = new Hono<{ Bindings: { DB: D1Database } }>();

rolls.post("/games/:id/rolls", async (c) => {
  const gameId = c.req.param("id");
  const { pool: n = 4, type = "Action", tags = [] } = await c.req.json() ?? {};
  const pool = rollD6(n);
  const result = analyze(pool);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await c.env.DB.prepare(
    "INSERT INTO rolls (id, gameId, actorId, type, tags, pool, result, createdAt) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(id, gameId, "demo-user", type, JSON.stringify(tags), JSON.stringify(pool), JSON.stringify(result), createdAt).run();
  const row = await one(c.env.DB, "SELECT * FROM rolls WHERE id = ?", [id]);
  return c.json(row);
});
