import { Hono } from "hono";
import { q } from "../utils/db";

export const campaigns = new Hono<{ Bindings: { DB: D1Database } }>();

campaigns.get("/:id/games", async (c) => {
  const id = c.req.param("id");
  const rows = await q(c.env.DB, "SELECT * FROM games WHERE campaignId = ? ORDER BY createdAt", [id]);
  return c.json(rows);
});
