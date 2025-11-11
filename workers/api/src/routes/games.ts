import { Hono } from "hono";
import { one, q } from "../utils/db";
import { z } from "zod";
import type { GameOptions } from "@action-thread/types";

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
  const body = await c.req.json<{ role: "director" | "hero" }>().catch(() => null);
  if (!body || (body.role !== "director" && body.role !== "hero")) {
    return c.json({ error: "Invalid role" }, 400);
  }

  const currentUser = c.get("user") as { id: string } | undefined;
  if (!currentUser) return c.json({ error: "Unauthorized" }, 401);

  // Verify the current user is a director for this game's CAMPAIGN
  const mem = await getCampaignMembershipByGame(c.env.DB, currentUser.id, gameId);
  if (!mem || mem.role !== "director") {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Ensure membership row exists (optional; safe to update without this if you prefer)
  // Update role and backfill campaignId if missing
  await c.env.DB
    .prepare(`
      UPDATE memberships
         SET role = ?,
             campaignId = COALESCE(campaignId, (SELECT campaignId FROM games WHERE id = ?))
       WHERE userId = ? AND gameId = ?
    `)
    .bind(body.role, gameId, userId, gameId)
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

// === Scene Options: Heat / Countdowns / Chase ===
const OptionsSchema = z.object({
  heat: z.number().int().min(0).max(12).optional(),
  countdowns: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      total: z.number().int().min(1).max(20),
      current: z.number().int().min(0),
    })
  ).optional(),
  chase: z.object({
    need: z.number().int().min(1).max(20),
    progress: z.number().int().min(0),
    speedHeroes: z.number().int().min(-5).max(10),
    speedTarget: z.number().int().min(-5).max(10),
  }).optional(),
}).partial();

function parseOptions(raw: any): GameOptions {
  try {
    const json = raw ? JSON.parse(raw) : {};
    const safe = OptionsSchema.parse(json);
    return { heat: 0, countdowns: [], ...safe };
  } catch {
    return { heat: 0, countdowns: [] };
  }
}

// GET /games/:id/options  (any member can read)
games.get("/:id/options", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT options FROM games WHERE id = ?").bind(id).first<{ options: string | null }>();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(parseOptions(row.options));
});

// PATCH /games/:id/options  (Director only)
games.patch("/:id/options", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user") as { id: string } | undefined;
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  // Check membership role at the CAMPAIGN level (memberships table supports campaignId)
  const roleRow = await c.env.DB
    .prepare("SELECT role FROM memberships WHERE userId = ? AND campaignId = (SELECT campaignId FROM games WHERE id = ?) LIMIT 1")
    .bind(user.id, id)
    .first<{ role: string }>();

  if (!roleRow || roleRow.role.toLowerCase() !== "director") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const currentRow = await c.env.DB.prepare("SELECT options FROM games WHERE id = ?").bind(id).first<{ options: string | null }>();
  if (!currentRow) return c.json({ error: "Not found" }, 404);

  const prev = parseOptions(currentRow.options);
  const body = await c.req.json().catch(() => ({}));
  const patch = OptionsSchema.parse(body);
  const next = { ...prev, ...patch };

  await c.env.DB.prepare("UPDATE games SET options = ? WHERE id = ?")
    .bind(JSON.stringify(next), id)
    .run();

  return c.json(next);
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