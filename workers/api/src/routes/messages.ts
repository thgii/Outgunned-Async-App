import { Hono } from "hono";
import { q, one } from "../utils/db";
import type { AuthedUser } from "../utils/auth";
import { getCampaignMembershipByGame } from "../utils/auth";
import { buildPushHTTPRequest } from "@pushforge/builder";

type ReactionType = "like" | "laugh" | "wow";

export const messages = new Hono<{ Bindings: { DB: D1Database } }>();

messages.get("/games/:id/messages", async (c) => {
  const gameId = c.req.param("id");
  const since = c.req.query("since");

  const user = c.get("user") as AuthedUser | undefined;
  const userId = user?.id ?? null;

  const baseSql = `SELECT m.*, u.name as authorName, c.name as characterName
     FROM messages m
     LEFT JOIN users u ON u.id = m.authorId
     LEFT JOIN characters c ON c.id = m.characterId
    WHERE m.gameId = ?`;

  const sql = since
    ? `${baseSql} AND m.createdAt > ? ORDER BY m.createdAt`
    : `${baseSql} ORDER BY m.createdAt LIMIT 1000`;

  const params = since ? [gameId, since] : [gameId];
  const rows = await q<any>(c.env.DB, sql, params);

  const results: any[] = [];

  for (const m of rows) {
    // aggregate counts for this message
    const counts = await q<{ type: ReactionType; count: number }>(
      c.env.DB,
      `SELECT type, COUNT(*) as count
         FROM message_reactions
        WHERE messageId = ?
        GROUP BY type`,
      [m.id]
    );

    let like = 0;
    let laugh = 0;
    let wow = 0;

    for (const r of counts) {
      if (r.type === "like") like = Number(r.count);
      if (r.type === "laugh") laugh = Number(r.count);
      if (r.type === "wow") wow = Number(r.count);
    }

    let myReaction: ReactionType | null = null;

    if (userId) {
      const mine = await one<{ type: ReactionType }>(
        c.env.DB,
        `SELECT type
           FROM message_reactions
          WHERE messageId = ? AND userId = ?`,
        [m.id, userId]
      );
      myReaction = mine?.type ?? null;
    }

    results.push({
      ...m,
      reactions: {
        like,
        laugh,
        wow,
        myReaction,
      },
    });
  }

  return c.json(results);
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
      "INSERT INTO messages (id, gameId, authorId, characterId, content, createdAt) VALUES (?,?,?,?,?,?)"
    )
    .bind(id, gameId, authorId, characterId, content, createdAt)
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

messages.post("/games/:gameId/messages/:messageId/reactions", async (c) => {
  const gameId = c.req.param("gameId");
  const messageId = c.req.param("messageId");

  const user = c.get("user") as AuthedUser | undefined;
  if (!user?.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = user.id;

  let body: { type?: ReactionType } = {};
  try {
    body = await c.req.json();
  } catch {
    // ignore, handled below
  }

  const type = body.type;
  if (type !== "like" && type !== "laugh" && type !== "wow") {
    return c.json({ error: "Invalid reaction type" }, 400);
  }

  // Make sure the message exists and belongs to this game
  const msgRow = await one<{ gameId: string }>(
    c.env.DB,
    "SELECT gameId FROM messages WHERE id = ?",
    [messageId]
  );
  if (!msgRow || msgRow.gameId !== gameId) {
    return c.notFound();
  }

  const existing = await one<{ id: string; type: ReactionType }>(
    c.env.DB,
    `SELECT id, type
       FROM message_reactions
      WHERE messageId = ? AND userId = ?`,
    [messageId, userId]
  );

  if (!existing) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await c.env.DB
      .prepare(
        `INSERT INTO message_reactions (id, messageId, userId, type, createdAt)
         VALUES (?,?,?,?,?)`
      )
      .bind(id, messageId, userId, type, createdAt)
      .run();
  } else if (existing.type === type) {
    // Same reaction → toggle off (delete)
    await c.env.DB
      .prepare(`DELETE FROM message_reactions WHERE id = ?`)
      .bind(existing.id)
      .run();
  } else {
    // Different reaction → update
    await c.env.DB
      .prepare(`UPDATE message_reactions SET type = ? WHERE id = ?`)
      .bind(type, existing.id)
      .run();
  }

  // Return updated aggregate for this message (just reactions)
  const counts = await q<{ type: ReactionType; count: number }>(
    c.env.DB,
    `SELECT type, COUNT(*) as count
       FROM message_reactions
      WHERE messageId = ?
      GROUP BY type`,
    [messageId]
  );

  let like = 0,
    laugh = 0,
    wow = 0;

  for (const r of counts) {
    if (r.type === "like") like = Number(r.count);
    if (r.type === "laugh") laugh = Number(r.count);
    if (r.type === "wow") wow = Number(r.count);
  }

  const mine = await one<{ type: ReactionType }>(
    c.env.DB,
    `SELECT type
       FROM message_reactions
      WHERE messageId = ? AND userId = ?`,
    [messageId, userId]
  );

  return c.json({
    like,
    laugh,
    wow,
    myReaction: (mine?.type ?? null) as ReactionType | null,
  });
});

messages.patch("/messages/:id", async (c) => {
  const id = c.req.param("id");
  const { content } = await c.req.json();
  const editedAt = new Date().toISOString();

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
    .prepare("UPDATE messages SET content = ?, editedAt = ?, versions = ? WHERE id = ?")
    .bind(content, editedAt, JSON.stringify(versions), id)
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
        c.executionCtx.waitUntil(notifyGameSubscribers(c, gameId, user.id, row));
      } else {
        notifyGameSubscribers(c, gameId, user.id, row).catch((err: any) => {
          console.error("notifyGameSubscribers failed (no executionCtx)", err);
        });
      }
    } catch (err) {
      console.error("Failed to schedule push notification", err);
    }
  }

  return c.json(row);
});

