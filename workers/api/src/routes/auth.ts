import { Hono } from "hono";
import { one } from "../utils/db";
import type { D1Database } from "@cloudflare/workers-types";

export const auth = new Hono<{ Bindings: { DB: D1Database } }>();

function getBearerToken(c: import("hono").Context) {
  const h = c.req.header("authorization") || c.req.header("Authorization");
  if (h?.startsWith("Bearer ")) return h.slice(7).trim();
  // optional: also support ?token=... for quick tests
  const url = new URL(c.req.url);
  return url.searchParams.get("token") || null;
}

function id() { return crypto.randomUUID(); }
function nowISO() { return new Date().toISOString(); }

auth.post("/login-dev", async (c) => {
  const body = await c.req.json<{ name?: string; email?: string }>().catch(() => ({} as any));

  // Normalize the display name once; use it for both SELECT and INSERT
  const displayName = (body?.name ?? "").trim() || "Hero";
  const email = body?.email ?? null;

  // Try to find by normalized name
  let user = await one<any>(
    c.env.DB,
    "SELECT id, name, email FROM users WHERE name = ? LIMIT 1",
    [displayName]
  );

  if (!user) {
    // Create the user; if someone raced us or the name already exists, ignore the insert
    const userId = crypto.randomUUID();
    await c.env.DB
      .prepare("INSERT OR IGNORE INTO users (id, name, email, createdAt) VALUES (?, ?, ?, ?)")
      .bind(userId, displayName, email, new Date().toISOString())
      .run();

    // Re-select (will succeed whether we inserted or the row already existed)
    user = await one<any>(
      c.env.DB,
      "SELECT id, name, email FROM users WHERE name = ? LIMIT 1",
      [displayName]
    );
  }

  // Issue session token
  const token = crypto.randomUUID().replace(/-/g, "");
  await c.env.DB
    .prepare("INSERT INTO sessions (token, userId, createdAt) VALUES (?, ?, ?)")
    .bind(token, user.id, new Date().toISOString())
    .run();

  return c.json({ token, user });
});


auth.post("/logout", async (c) => {
  const { token } = await c.req.json<{ token?: string }>().catch(() => ({}));
  if (token) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }
  return c.json({ ok: true });
});

// GET /auth/me  -> returns the current authenticated user based on session token
auth.get("/auth/me", async (c) => {
  const token = getBearerToken(c);
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const user = await one<any>(
    c.env.DB,
    `SELECT u.id, u.name, u.email
       FROM sessions s
       JOIN users u ON u.id = s.userId
      WHERE s.token = ?
      LIMIT 1`,
    [token]
  );

  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json(user);
});

