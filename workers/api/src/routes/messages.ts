import { Hono } from "hono";
import { q, one } from "../utils/db";
import type { AuthedUser } from "../utils/auth";
import { getCampaignMembershipByGame } from "../utils/auth";
import { buildPushHTTPRequest } from "@pushforge/builder";
import type { D1Database } from "@cloudflare/workers-types";

export const messages = new Hono<{ Bindings: { DB: D1Database } }>();

messages.get("/games/:id/messages", async (c) => {
  const gameId = c.req.param("id");
  const since = c.req.query("since");

  const baseSql = `SELECT m.*, u.name as authorName, c.name as characterName
     FROM messages m
     LEFT JOIN users u ON u.id = m.authorId
     LEFT JOIN characters c ON c.id = m.characterId
    WHERE m.gameId = ?`;

  const sql = since
    ? `${baseSql} AND m.updatedAt > ? ORDER BY m.createdAt`
    : `${baseSql} ORDER BY m.createdAt LIMIT 1000`;

  const params = since ? [gameId, since] : [gameId];
  const rows = await q(c.env.DB, sql, params);
  return c.json(rows);
});

async function notifyGameSubscribers(
  c: any,
  gameId: string,
  authorId: string,
  messageRow: any
) {
  const raw = (c.env as any).VAPID_PRIVATE_KEY as any;
  if (!raw) {
    console.error("notifyGameSubscribers: VAPID_PRIVATE_KEY is missing");
    return;
  }

  // Your secret is a JSON JWK string; parse it into an object
  let privateJWK: any;
  try {
    privateJWK = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (err) {
    console.error("notifyGameSubscribers: invalid VAPID_PRIVATE_KEY format", err);
    return;
  }

  // Find all users in this game who have push subscriptions, excluding the author
  const subs = await q<any>(
    c.env.DB,
    `SELECT ps.endpoint, ps.p256dh, ps.auth, u.name as userName
      FROM push_subscriptions ps
      JOIN memberships m ON m.userId = ps.userId
      JOIN games g ON g.campaignId = m.campaignId
      JOIN users u ON u.id = ps.userId
      WHERE g.id = ? AND ps.userId != ?`,
    [gameId, authorId]
  );

  console.log(
    "notifyGameSubscribers: gameId",
    gameId,
    "authorId",
    authorId,
    "subscriber count",
    subs.length
  );

  if (!subs.length) return;

  const title =
    messageRow?.authorName && messageRow?.characterName
      ? `${messageRow.characterName} (${messageRow.authorName})`
      : messageRow?.authorName
      ? `${messageRow.authorName} posted in chat`
      : "New message in your game";

  const body = (messageRow?.content ?? "").slice(0, 140);

  const payload = {
    title,
    body,
    icon: "/icons/icon-192.png",
    clickUrl: `/games/${gameId}`,
  };

  for (const sub of subs) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      const { endpoint, headers, body: encodedBody } = await buildPushHTTPRequest({
        privateJWK,
        subscription,
        message: {
          payload,
          options: {
            ttl: 3600,
            urgency: "high",
            topic: `game-${gameId}`,
          },
          adminContact: "mailto:you@example.com",
        },
      });

      const send = async () => {
        const resp = await fetch(endpoint, {
          method: "POST",
          headers,
          body: encodedBody,
        });

        if (!resp.ok) {
          console.error(
            "Push send failed",
            resp.status,
            await resp.text().catch(() => "")
          );
        } else {
          console.log("Push sent OK to", endpoint);
        }
      };

      // Use waitUntil if present; otherwise just run inline
      if (c.executionCtx && typeof c.executionCtx.waitUntil === "function") {
        c.executionCtx.waitUntil(send());
      } else {
        send().catch((err) =>
          console.error("Push send failed (no executionCtx)", err)
        );
      }
    } catch (err) {
      console.error("Failed to build push request", err);
    }
  }
}

messages.post("/games/:id/messages", async (c) => {
  const gameId = c.req.param("id");
  const { content } = await c.req.json();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const updatedAt = createdAt;

  // Authenticated user set by requireUser middleware
  const user = c.get("user") as AuthedUser | undefined;
  const authorId = user?.id ?? "demo-user";

  // Try to attach the player's character for this game (if any)
  let characterId: string | null = null;
  const game = await one<any>(c.env.DB, "SELECT campaignId FROM games WHERE id = ?", [gameId]);
  if (game && authorId !== "demo-user") {
    const char = await one<any>(
      c.env.DB,
      "SELECT id FROM characters WHERE campaignId = ? AND ownerId = ? ORDER BY createdAt LIMIT 1",
      [game.campaignId, authorId]
    );
    if (char?.id) characterId = char.id;
  }

  await c.env.DB
    .prepare(
      "INSERT INTO messages (id, gameId, authorId, characterId, content, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)"
    )
    .bind(id, gameId, authorId, characterId, content, createdAt, updatedAt)
    .run();

  const row = await one<any>(
    c.env.DB,
    `SELECT m.*, u.name as authorName, c.name as characterName
       FROM messages m
       LEFT JOIN users u ON u.id = m.authorId
       LEFT JOIN characters c ON c.id = m.characterId
      WHERE m.id = ?`,
    [id]
  );

  // 🔔 Kick off push notifications (fire-and-forget)
  if (user?.id && row) {
    try {
      c.executionCtx?.waitUntil?.(
        notifyGameSubscribers(c, gameId, user.id, row)
      );
    } catch (err) {
      console.error("Failed to schedule push notification", err);
    }
  }

  return c.json(row);
});

messages.post("/messages/:id/react", async (c) => {
  const messageId = c.req.param("id");
  const { type } = await c.req.json().catch(() => ({}));

  if (!["like", "laugh", "wow"].includes(type)) {
    return c.json({ error: "Invalid reaction type" }, 400);
  }

  const column =
    type === "like"
      ? "likeCount"
      : type === "laugh"
      ? "laughCount"
      : "wowCount";

  const now = new Date().toISOString();

  await c.env.DB
    .prepare(
      `UPDATE messages
       SET ${column} = ${column} + 1,
           updatedAt = ?
       WHERE id = ?`
    )
    .bind(now, messageId)
    .run();

  const updated = await one(
    c.env.DB,
    `SELECT likeCount, laughCount, wowCount FROM messages WHERE id = ?`,
    [messageId]
  );

  return c.json(updated);
});

messages.patch("/messages/:id", async (c) => {
  const id = c.req.param("id");
  const { content } = await c.req.json();
  const editedAt = new Date().toISOString();
  const updatedAt = editedAt; 

  // Authenticated user set by requireUser middleware
  const user = c.get("user") as AuthedUser | undefined;
  if (!user?.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Load the existing message so we know who wrote it and which game it's in
  const prev = await one<any>(c.env.DB, "SELECT * FROM messages WHERE id = ?", [id]);
  if (!prev) return c.notFound();

  // Check the user's role in this game's campaign
  const mem = await getCampaignMembershipByGame(c.env.DB, user.id, prev.gameId);
  if (!mem) {
    // Not part of this campaign at all
    return c.json({ error: "Forbidden" }, 403);
  }

  const isDirector = mem.role === "director";
  const isAuthor = prev.authorId === user.id;

  // Directors can edit any message; players can only edit their own
  if (!isDirector && !isAuthor) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // append to versions JSON
  const versions = Array.isArray(prev.versions ? JSON.parse(prev.versions) : [])
    ? JSON.parse(prev.versions ?? "[]")
    : [];
  versions.push({ content: prev.content, editedAt });

  await c.env.DB
    .prepare("UPDATE messages SET content = ?, editedAt = ?, versions = ?, updatedAt = ? WHERE id = ?")
    .bind(content, editedAt, JSON.stringify(versions), updatedAt, id)
    .run();

  const row = await one<any>(
    c.env.DB,
    `SELECT m.*, u.name as authorName, c.name as characterName
       FROM messages m
       LEFT JOIN users u ON u.id = m.authorId
       LEFT JOIN characters c ON c.id = m.characterId
      WHERE m.id = ?`,
    [id]
  );

  // 🔔 Kick off push notifications
  if (user?.id && row) {
    try {
      if (c.executionCtx && typeof c.executionCtx.waitUntil === "function") {
        c.executionCtx.waitUntil(
          notifyGameSubscribers(c, prev.gameId, user.id, row)
        );
      } else {
        notifyGameSubscribers(c, prev.gameId, user.id, row).catch((err: any) => {
          console.error("notifyGameSubscribers failed (no executionCtx)", err);
        });
      }
    } catch (err) {
      console.error("Failed to schedule push notification", err);
    }
  }

  return c.json(row);
});

