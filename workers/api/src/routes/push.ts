import { Hono } from "hono";
import type { AuthedUser } from "../utils/auth";
import { one, q } from "../utils/db";

export const push = new Hono<{ Bindings: { DB: D1Database } }>();

push.post("/push/subscribe", async (c) => {
  const user = c.get("user") as AuthedUser | undefined;
  if (!user?.id) return c.json({ error: "Unauthorized" }, 401);

  const { subscription } = await c.req.json<any>();
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return c.json({ error: "Invalid subscription" }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await c.env.DB
    .prepare(
      `INSERT INTO push_subscriptions (id, userId, endpoint, p256dh, auth, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET
         userId=excluded.userId,
         p256dh=excluded.p256dh,
         auth=excluded.auth,
         createdAt=excluded.createdAt`
    )
    .bind(id, user.id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, createdAt)
    .run();

  return c.json({ ok: true });
});
