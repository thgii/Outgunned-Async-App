// workers/api/src/utils/auth.ts
import type { Context } from "hono";
import { one } from "./db";

export type AuthedUser = { id: string; name: string; email?: string };

// ---------- token helpers ----------
export function getBearerToken(c: Context): string | null {
  const h = c.req.header("authorization") || c.req.header("Authorization");
  if (h?.startsWith("Bearer ")) return h.slice(7).trim();
  // convenience for CLI tests: /path?token=...
  const url = new URL(c.req.url);
  return url.searchParams.get("token");
}

export async function getUserFromAuthHeader(DB: D1Database, authHeader: string | null) {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = m?.[1]?.trim();
  if (!token) return null;

  const row = await one<{ userId: string }>(DB, "SELECT userId FROM sessions WHERE token = ?", [token]);
  if (!row) return null;

  const user = await one<AuthedUser>(DB, "SELECT id, name, email FROM users WHERE id = ?", [row.userId]);
  return user || null;
}

// ---------- middleware ----------
export async function requireUser(
  c: Context<{ Bindings: { DB: D1Database }; Variables: { user: AuthedUser } }>,
  next: Function
) {
  // prefer header; also allow ?token= for manual curl
  const token = getBearerToken(c);
  const user =
    token
      ? await (async () => {
          const row = await one<{ userId: string }>(c.env.DB, "SELECT userId FROM sessions WHERE token = ?", [token]);
          if (!row) return null;
          return await one<AuthedUser>(c.env.DB, "SELECT id, name, email FROM users WHERE id = ?", [row.userId]);
        })()
      : null;

  if (!user) return c.json({ error: "Unauthorized" }, 401);
  c.set("user", user);
  await next();
}

// Non-blocking: sets user if present, otherwise continues without 401
export async function maybeUser(
  c: Context<{ Bindings: { DB: D1Database }; Variables: { user?: AuthedUser } }>,
  next: Function
) {
  const token = getBearerToken(c);
  if (token) {
    const row = await one<{ userId: string }>(c.env.DB, "SELECT userId FROM sessions WHERE token = ?", [token]);
    if (row?.userId) {
      const user = await one<AuthedUser>(c.env.DB, "SELECT id, name, email FROM users WHERE id = ?", [row.userId]);
      if (user) c.set("user", user);
    }
  }
  await next();
}

// ---------- membership helpers ----------
export async function getGameMembership(DB: D1Database, userId: string, gameId: string) {
  return one<{ userId: string; role: "director" | "hero" }>(
    DB,
    "SELECT userId, role FROM memberships WHERE userId = ? AND gameId = ? LIMIT 1",
    [userId, gameId]
  );
}

export async function getCampaignMembership(DB: D1Database, userId: string, campaignId: string) {
  return one<{ userId: string; role: "director" | "hero" }>(
    DB,
    `SELECT m.userId, m.role
       FROM memberships m
      WHERE m.userId = ? AND m.campaignId = ?
      LIMIT 1`,
    [userId, campaignId]
  );
}

export async function getCampaignMembershipByGame(DB: D1Database, userId: string, gameId: string) {
  const game = await one<{ campaignId: string }>(DB, "SELECT campaignId FROM games WHERE id = ?", [gameId]);
  if (!game?.campaignId) return null;
  return getCampaignMembership(DB, userId, game.campaignId);
}

// ---------- guard helpers (centralize 401/403) ----------
export async function requireDirectorForCampaign(
  c: Context<{ Bindings: { DB: D1Database }; Variables: { user: AuthedUser } }>,
  campaignId: string
) {
  const user = c.get("user") as AuthedUser | undefined;
  if (!user?.id) return { ok: false as const, status: 401, body: { error: "Unauthorized" } };

  const mem = await getCampaignMembership(c.env.DB, user.id, campaignId);
  if (!mem || mem.role !== "director") {
    return { ok: false as const, status: 403, body: { error: "Forbidden" } };
  }
  return { ok: true as const, user };
}

export async function requireDirectorForGame(
  c: Context<{ Bindings: { DB: D1Database }; Variables: { user: AuthedUser } }>,
  gameId: string
) {
  const user = c.get("user") as AuthedUser | undefined;
  if (!user?.id) return { ok: false as const, status: 401, body: { error: "Unauthorized" } };

  const mem = await getCampaignMembershipByGame(c.env.DB, user.id, gameId);
  if (!mem || mem.role !== "director") {
    return { ok: false as const, status: 403, body: { error: "Forbidden" } };
  }
  return { ok: true as const, user };
}
