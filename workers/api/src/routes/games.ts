import { Hono } from "hono";
import { one, q } from "../utils/db";

export const games = new Hono<{ Bindings: { DB: D1Database } }>();

games.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await one(c.env.DB, "SELECT * FROM games WHERE id = ?", [id]);
  if (!row) return c.notFound();
  return c.json(row);
});
