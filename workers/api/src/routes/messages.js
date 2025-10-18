import { Hono } from "hono";
import { q, one } from "../utils/db";
export const messages = new Hono();
messages.get("/games/:id/messages", async (c) => {
    const gameId = c.req.param("id");
    const since = c.req.query("since");
    const sql = since
        ? "SELECT * FROM messages WHERE gameId = ? AND createdAt > ? ORDER BY createdAt"
        : "SELECT * FROM messages WHERE gameId = ? ORDER BY createdAt LIMIT 100";
    const params = since ? [gameId, since] : [gameId];
    const rows = await q(c.env.DB, sql, params);
    return c.json(rows);
});
messages.post("/games/:id/messages", async (c) => {
    const gameId = c.req.param("id");
    const { content } = await c.req.json();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await c.env.DB.prepare("INSERT INTO messages (id, gameId, authorId, content, createdAt) VALUES (?,?,?,?,?)").bind(id, gameId, "demo-user", content, createdAt).run();
    const row = await one(c.env.DB, "SELECT * FROM messages WHERE id = ?", [id]);
    return c.json(row);
});
messages.patch("/messages/:id", async (c) => {
    const id = c.req.param("id");
    const { content } = await c.req.json();
    const editedAt = new Date().toISOString();
    // append to versions JSON
    const prev = await one(c.env.DB, "SELECT * FROM messages WHERE id = ?", [id]);
    if (!prev)
        return c.notFound();
    const versions = Array.isArray(prev.versions ? JSON.parse(prev.versions) : []) ? JSON.parse(prev.versions ?? "[]") : [];
    versions.push({ content: prev.content, editedAt });
    await c.env.DB.prepare("UPDATE messages SET content = ?, editedAt = ?, versions = ? WHERE id = ?")
        .bind(content, editedAt, JSON.stringify(versions), id)
        .run();
    const row = await one(c.env.DB, "SELECT * FROM messages WHERE id = ?", [id]);
    return c.json(row);
});
