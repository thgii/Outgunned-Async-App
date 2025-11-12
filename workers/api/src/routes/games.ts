import { Hono } from "hono";
import { one, q } from "../utils/db";
import { z } from "zod";
import type { GameOptions } from "@action-thread/types";
import { getCampaignMembershipByGame } from "../utils/auth";

export const games = new Hono<{ Bindings: { DB: D1Database } }>();

// GET /games/:id  -> return game row + membershipRole (campaign-level)
games.get("/:id", async (c) => {
  const id = c.req.param("id");

  // Load the game (need campaignId to check membership)
  const row = await one<any>(c.env.DB, "SELECT * FROM games WHERE id = ?", [id]);
  if (!row) return c.notFound();

  // Resolve the caller's campaign-level role (mirrors campaigns.ts behavior)
  const currentUser = c.get("user") as { id: string } | undefined;
  let membershipRole: string | null = null;

  if (currentUser?.id && row.campaignId) {
    const mem = await c.env.DB
      .prepare("SELECT role FROM memberships WHERE campaignId = ? AND userId = ? LIMIT 1")
      .bind(row.campaignId, currentUser.id)
      .first<{ role: string }>();
    membershipRole = mem?.role ?? null;
  }

  // Optional: gate non-members
  // if (!membershipRole) return c.json({ error: "Forbidden" }, 403);

  return c.json({ ...row, membershipRole });
});

// --- Director Admin: Change a user's role within a game ---
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
  const currentUser = c.get("user") as { id: string } | undefined;
  if (!currentUser) return c.json({ error: "Unauthorized" }, 401);

  // Verify the caller is a director for this game's campaign
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

  return c.json(rs.results ?? []);
});

const gameUpdateSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  summary: z.string().max(20000).optional(),
});

// === Scene Options: Heat / Countdowns / Chase ===

// New chase schema: no speedTarget; tighter bounds; progress <= need
const ChaseSchema = z
  .object({
    need: z.number().int().min(6).max(18),
    progress: z.number().int().min(0),
    speedHeroes: z.number().int().min(0).max(6),
  })
  .superRefine((val, ctx) => {
    if (val.progress > val.need) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["progress"],
        message: "progress cannot exceed need",
      });
    }
  });

const CountdownSchema = z.object({
  id: z.string(),
  label: z.string(),
  total: z.number().int().min(1).max(20),
  current: z.number().int().min(0),
});

const OptionsSchema = z.object({
  heat: z.number().int().min(0).max(12).optional(),
  countdowns: z.array(CountdownSchema).optional(),
  chase: ChaseSchema.optional(),
});

// Normalize/clamp helper for chase options (also strips legacy fields)
function normalizeChase(chase: any | undefined | null) {
  if (!chase) return undefined;
  const n = Number.isFinite(chase.need) ? Math.max(6, Math.min(18, chase.need)) : 6;
  const pRaw = Number.isFinite(chase.progress) ? chase.progress : 0;
  const p = Math.max(0, Math.min(n, pRaw));
  const shRaw = Number.isFinite(chase.speedHeroes) ? chase.speedHeroes : 0;
  const speedHeroes = Math.max(0, Math.min(6, shRaw));
  return { need: n, progress: p, speedHeroes };
}

function parseOptions(raw: any): GameOptions {
  try {
    const json = raw ? JSON.parse(raw) : {};
    const parsed = OptionsSchema.safeParse(json);
    if (!parsed.success) {
      // If stored JSON is old/loose, do a best-effort salvage instead of throwing
      const heat = Math.max(0, Math.min(12, Number(json?.heat ?? 0)));
      const countdowns = Array.isArray(json?.countdowns) ? json.countdowns : [];
      const chase = normalizeChase(json?.chase);
      return { heat, countdowns, ...(chase ? { chase } : {}) };
    }
    const safe = parsed.data;
    const chase = normalizeChase(safe.chase);
    return { heat: safe.heat ?? 0, countdowns: safe.countdowns ?? [], ...(chase ? { chase } : {}) };
  } catch {
    return { heat: 0, countdowns: [] };
  }
}

// GET /games/:id/options  (any member can read)
games.get("/:id/options", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB
    .prepare("SELECT options FROM games WHERE id = ?")
    .bind(id)
    .first<{ options: string | null }>();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(parseOptions(row.options));
});

// GET /games/:id/role  -> { role: "director" | "hero" | null }
games.get("/:id/role", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user") as { id: string } | undefined;
  if (!user) return c.json({ role: null }); // or return 401 if you prefer

  const row = await c.env.DB
    .prepare(`
      SELECT role
        FROM memberships
       WHERE userId = ?
         AND campaignId = (SELECT campaignId FROM games WHERE id = ?)
       LIMIT 1
    `)
    .bind(user.id, id)
    .first<{ role: string }>();

  const role = row?.role?.toLowerCase?.() === "director"
    ? "director"
    : row?.role?.toLowerCase?.() === "hero"
    ? "hero"
    : null;

  return c.json({ role });
});

// PATCH /games/:id/options  (Director only)
games.patch("/:id/options", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user") as { id: string } | undefined;
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  // Check membership role at the CAMPAIGN level
  const roleRow = await c.env.DB
    .prepare("SELECT role FROM memberships WHERE userId = ? AND campaignId = (SELECT campaignId FROM games WHERE id = ?) LIMIT 1")
    .bind(user.id, id)
    .first<{ role: string }>();

  if (!roleRow || roleRow.role.toLowerCase() !== "director") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const currentRow = await c.env.DB
    .prepare("SELECT options FROM games WHERE id = ?")
    .bind(id)
    .first<{ options: string | null }>();
  if (!currentRow) return c.json({ error: "Not found" }, 404);

  const prev = parseOptions(currentRow.options);

  let bodyUnknown: unknown;
  try {
    bodyUnknown = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const parsed = OptionsSchema.safeParse(bodyUnknown);
  if (!parsed.success) {
    console.error("options zod error", parsed.error.flatten());
    return c.json({ error: "validation_failed", details: parsed.error.flatten() }, 400);
  }

  // Merge, then normalize/clamp, and strip legacy fields
  const patch = parsed.data;
  const next: GameOptions = {
    heat: Math.max(0, Math.min(12, patch.heat ?? prev.heat ?? 0)),
    countdowns: patch.countdowns ?? prev.countdowns ?? [],
    ...(patch.chase !== undefined || prev.chase !== undefined
      ? { chase: normalizeChase(patch.chase ?? prev.chase)! }
      : {}),
  };

  await c.env.DB
    .prepare("UPDATE games SET options = ? WHERE id = ?")
    .bind(JSON.stringify(next), id)
    .run();

  return c.json(next);
});

// PATCH /games/:id -> partial update of title/name/summary
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
