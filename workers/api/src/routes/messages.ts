import { Hono } from "hono";
import { q, one } from "../utils/db";
import type { AuthedUser } from "../utils/auth";

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
    ? `${baseSql} AND m.createdAt > ? ORDER BY m.createdAt`
    : `${baseSql} ORDER BY m.createdAt LIMIT 100`;

  const params = since ? [gameId, since] : [gameId];
  const rows = await q(c.env.DB, sql, params);
  return c.json(rows);
});

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
  return c.json(row);
});

messages.patch("/messages/:id", async (c) => {
  const id = c.req.param("id");
  const { content } = await c.req.json();
  const editedAt = new Date().toISOString();
  // append to versions JSON
  const prev = await one<any>(c.env.DB, "SELECT * FROM messages WHERE id = ?", [id]);
  if (!prev) return c.notFound();
  const versions = Array.isArray(prev.versions ? JSON.parse(prev.versions) : []) ? JSON.parse(prev.versions ?? "[]") : [];
  versions.push({ content: prev.content, editedAt });
  await c.env.DB.prepare("UPDATE messages SET content = ?, editedAt = ?, versions = ? WHERE id = ?")
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
  return c.json(row);
});
