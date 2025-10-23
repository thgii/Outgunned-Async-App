import { Hono } from "hono";
import { one } from "../utils/db";

export const auth = new Hono<{ Bindings: { DB: D1Database } }>();

function id() { return crypto.randomUUID(); }
function nowISO() { return new Date().toISOString(); }

auth.post("/login-dev", async (c) => {
  const { name, email } = await c.req.json<{ name?: string; email?: string }>().catch(() => ({}));

  // If email provided, try to find by email; otherwise create an anonymous user
  let user =
    email
      ? await one<any>(c.env.DB, "SELECT id, name, email FROM users WHERE email = ? LIMIT 1", [email])
      : null;

  if (!user) {
    const userId = id();
    const displayName = name?.trim() || "Player";
    await c.env.DB
      .prepare("INSERT INTO users (id, name, email, createdAt) VALUES (?, ?, ?, ?)")
      .bind(userId, displayName, email || null, nowISO())
      .run();
    user = await one<any>(c.env.DB, "SELECT id, name, email FROM users WHERE id = ?", [userId]);
  }

  // Issue session token
  const token = crypto.randomUUID().replace(/-/g, "");
  await c.env.DB
    .prepare("INSERT INTO sessions (token, userId, createdAt) VALUES (?, ?, ?)")
    .bind(token, user.id, nowISO())
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
