import { Hono } from "hono";
import { one, q } from "../utils/db";
import { z } from "zod";

export const games = new Hono<{ Bindings: { DB: D1Database } }>();

games.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await one(c.env.DB, "SELECT * FROM games WHERE id = ?", [id]);
  if (!row) return c.notFound();
  return c.json(row);
});

// --- Director Admin: Change a user's role within a game ---
import { getCampaignMembershipByGame } from "../utils/auth";

games.post("/:gameId/members/:userId/role", async (c) => {
  const { gameId, userId } = c.req.param();
  const { role } = await c.req.json<{ role: "director" | "hero" }>().catch(() => ({}));

  // Validate input
  if (role !== "director" && role !== "hero") {
    return c.json({ error: "Invalid role" }, 400);
  }

  // Require authenticated user
  const currentUser = c.get("user");

  // Verify the current user is a director in this game
  const membership = await getCampaignMembershipByGame(c.env.DB, currentUser.id, gameId);
    if (!membership || membership.role !== "director") {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Update the target user's role
  await c.env.DB
    .prepare(`
      UPDATE memberships
      SET role = ?
        campaignId = COALESCE(campaignId, (SELECT campaignId FROM games WHERE id = ?))
      WHERE userId = ? AND gameId = ?
      `)
    .bind(role, userId, gameId)
    .run();

  return c.json({ ok: true });
});

// --- List members in a game (Director-only) ---
games.get("/:gameId/members", async (c) => {
  const { gameId } = c.req.param();
  const currentUser = c.get("user");

  // Verify the caller is a director for this game
  const { getCampaignMembershipByGame } = await import("../utils/auth");
  const mem = await getCampaignMembershipByGame(c.env.DB, currentUser.id, gameId);
  if (!mem || mem.role !== "director") {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Return all members with user profile info
  const rs = await c.env.DB.prepare(`
    SELECT m.userId, m.role, u.name, u.email
    FROM memberships m
    JOIN users u ON u.id = m.userId
    WHERE m.gameId = ?
    ORDER BY u.name COLLATE NOCASE
  `).bind(gameId).all<any>();

  return c.json(rs.results || []);
});

const gameUpdateSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  summary: z.string().max(20000).optional(),
});

games.patch("/:id", async (c) => {
  const { id } = c.req.param();

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const parsed = gameUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "validation_failed", details: parsed.error.flatten() }, 400);
  }

  const { title, name, summary } = parsed.data;

  // Build dynamic SET clause
  const sets: string[] = [];
  const args: any[] = [];

  if (typeof title !== "undefined")   { sets.push("title = ?");   args.push(title ?? null); }
  if (typeof name !== "undefined")    { sets.push("name = ?");    args.push(name ?? null); }
  if (typeof summary !== "undefined") { sets.push("summary = ?"); args.push(summary ?? null); }

  if (sets.length === 0) return c.json({ ok: true, message: "Nothing to update" });

  args.push(id);
  const sql = `UPDATE games SET ${sets.join(", ")} WHERE id = ?`;
  await q(c.env.DB, sql, args);

  const updated = await one(c.env.DB, "SELECT * FROM games WHERE id = ?", [id]);
  return c.json(updated ?? { ok: true });
});