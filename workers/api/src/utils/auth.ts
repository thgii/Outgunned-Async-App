import type { Context } from "hono";
import { one } from "./db";

export type AuthedUser = { id: string; name: string; email?: string };

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

// Middleware to require an authenticated user
export async function requireUser(
  c: Context<{ Bindings: { DB: D1Database }; Variables: { user: AuthedUser } }>,
  next: Function
) {
  const user = await getUserFromAuthHeader(c.env.DB, c.req.header("authorization") || null);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  c.set("user", user);
  await next();
}

// Check membership (game-based in your schema)
export async function getGameMembership(DB: D1Database, userId: string, gameId: string) {
  return one<{ userId: string; role: "director" | "hero" }>(
    DB,
    "SELECT userId, role FROM memberships WHERE userId = ? AND gameId = ?",
    [userId, gameId]
  );
}
