import { Hono } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import { one } from "../utils/db";
import { getBearerToken } from "../utils/auth";

export const auth = new Hono<{ Bindings: { DB: D1Database } }>();

type UserRow = {
  id: string;
  name: string;
  email?: string | null;
  passcode?: string | null;
};

function newId() {
  return crypto.randomUUID();
}

function nowISO() {
  return new Date().toISOString();
}

// POST /login
// Body: { name: string; email?: string; passcode: string (6 digits) }
auth.post("/login", async (c) => {
  const body = await c.req.json<{
    name?: string;
    email?: string;
    passcode?: string;
  }>();

  const name = body.name?.trim();
  const email = body.email?.trim();
  const passcode = body.passcode?.trim();

  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }
  if (!passcode || !/^[0-9]{6}$/.test(passcode)) {
    return c.json({ error: "Passcode must be a 6-digit code" }, 400);
  }

  const DB = c.env.DB;
  const now = nowISO();

  // Look up by name; this app treats name as the primary login identifier
  let user = await one<UserRow>(
    DB,
    "SELECT id, name, email, passcode FROM users WHERE name = ? LIMIT 1",
    [name]
  );

  if (!user) {
    // First-time login for this name: create the user with this passcode
    const id = newId();
    await DB.prepare(
      "INSERT INTO users (id, name, email, passcode, createdAt) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(id, name, email || null, passcode, now)
      .run();

    user = { id, name, email: email || null, passcode };
  } else {
    // Existing user must match passcode
    if (user.passcode && user.passcode !== passcode) {
      return c.json({ error: "Invalid name or passcode" }, 401);
    }

    // If they never had a passcode set, take the first one they use
    if (!user.passcode) {
      await DB.prepare("UPDATE users SET passcode = ? WHERE id = ?")
        .bind(passcode, user.id)
        .run();
      user.passcode = passcode;
    }

    // Keep email up to date if supplied
    if (email && email !== user.email) {
      await DB.prepare("UPDATE users SET email = ? WHERE id = ?")
        .bind(email, user.id)
        .run();
      user.email = email;
    }
  }

  // Create a session token
  const token = crypto.randomUUID().replace(/-/g, "");
  await DB.prepare(
    "INSERT INTO sessions (token, userId, createdAt) VALUES (?, ?, ?)"
  )
    .bind(token, user.id, now)
    .run();

  // Don't send passcode back to the client
  return c.json({
    token,
    user: { id: user.id, name: user.name, email: user.email ?? undefined },
  });
});

// POST /logout
auth.post("/logout", async (c) => {
  const token = getBearerToken(c);
  if (!token) return c.json({ ok: true });

  await c.env.DB.prepare("DELETE FROM sessions WHERE token = ?")
    .bind(token)
    .run();

  return c.json({ ok: true });
});

// GET /me – return the current user from the session token, if any
auth.get("/me", async (c) => {
  const token = getBearerToken(c);
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const user = await one<UserRow>(
    c.env.DB,
    `SELECT u.id, u.name, u.email
       FROM sessions s
       JOIN users u ON u.id = s.userId
      WHERE s.token = ?
      LIMIT 1`,
    [token]
  );

  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ id: user.id, name: user.name, email: user.email ?? undefined });
});

// Optional: simple dev helper that bypasses passcodes entirely
auth.get("/dev-login", async (c) => {
  const DB = c.env.DB;
  const now = nowISO();

  let user = await one<UserRow>(
    DB,
    "SELECT id, name, email FROM users WHERE email = ? LIMIT 1",
    ["demo@example.com"]
  );

  if (!user) {
    const id = newId();
    await DB.prepare(
      "INSERT INTO users (id, name, email, createdAt) VALUES (?, ?, ?, ?)"
    )
      .bind(id, "Demo User", "demo@example.com", now)
      .run();
    user = { id, name: "Demo User", email: "demo@example.com" };
  }

  const token = crypto.randomUUID().replace(/-/g, "");
  await DB.prepare(
    "INSERT INTO sessions (token, userId, createdAt) VALUES (?, ?, ?)"
  )
    .bind(token, user.id, now)
    .run();

  return c.json({
    token,
    user: { id: user.id, name: user.name, email: user.email ?? undefined },
  });
});
