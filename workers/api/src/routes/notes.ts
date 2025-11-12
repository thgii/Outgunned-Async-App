import { Hono } from "hono";
import { z } from "zod";

export const notes = new Hono<{ Bindings: { DB: D1Database }, Variables: { user?: { id: string } } }>();

const NoteSchema = z.object({
  visibility: z.enum(["public", "director_private", "hero"]),
  title: z.string().optional(),
  content: z.string().min(1),
  heroId: z.string().optional().nullable(),
});

const now = () => new Date().toISOString();

// --- visibility mapping: API <-> DB ---
function toDbVisibility(v: "public" | "director_private" | "hero") {
  return v === "hero" ? "player" : v; // DB expects 'player'
}
function isHeroLike(v: string) {
  return v === "hero" || v === "player";
}
// Normalize rows coming *out* of DB so UI always sees 'hero'
function normalizeRow<T extends { visibility?: string } | null | undefined>(row: T): T {
  if (row && (row as any).visibility === "player") {
    (row as any).visibility = "hero";
  }
  return row;
}
function normalizeRows(rows: any[] | null | undefined) {
  return (rows ?? []).map(normalizeRow);
}

async function isDirectorForGame(DB: D1Database, userId: string | undefined, gameId: string) {
  if (!userId) return false;
  const row = await DB
    .prepare("SELECT role FROM memberships WHERE userId = ? AND campaignId = (SELECT campaignId FROM games WHERE id = ?) LIMIT 1")
    .bind(userId, gameId)
    .first<{ role: string }>();
  return !!row && row.role.toLowerCase() === "director";
}

// GET /games/:id/notes
// Directors: all notes. Heroes: public + their own hero/player notes
notes.get("/games/:id/notes", async (c) => {
  const gameId = c.req.param("id");
  const user = c.get("user") as { id: string } | undefined;

  const isDirector = await isDirectorForGame(c.env.DB, user?.id, gameId);

  if (isDirector) {
    const all = await c.env.DB
      .prepare("SELECT * FROM game_notes WHERE gameId = ? ORDER BY createdAt ASC")
      .bind(gameId).all<any>();
    return c.json(normalizeRows(all.results));
  } else {
    const uid = user?.id ?? "__anon__";
    const res = await c.env.DB
      .prepare(`SELECT * FROM game_notes
               WHERE gameId = ?
                 AND (visibility = 'public' OR (visibility IN ('hero','player') AND userId = ?))
               ORDER BY createdAt ASC`)
      .bind(gameId, uid)
      .all<any>();
    return c.json(normalizeRows(res.results));
  }
});

// POST /games/:id/notes
// - Director can create public or director_private
// - Hero can create only "hero" notes (auto-assign userId)
//   (We map 'hero' -> 'player' when writing to DB; return 'hero' to client)
notes.post("/games/:id/notes", async (c) => {
  const gameId = c.req.param("id");
  const user = c.get("user") as { id: string } | undefined;
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const data = NoteSchema.parse(await c.req.json());
  const isDirector = await isDirectorForGame(c.env.DB, user.id, gameId);

  if (!isDirector && data.visibility !== "hero") {
    return c.json({ error: "Forbidden: Heroes can only create 'Hero' notes" }, 403);
  }

  const id = crypto.randomUUID();
  const ts = now();
  const dbVisibility = toDbVisibility(data.visibility);

  await c.env.DB.prepare(
    `INSERT INTO game_notes (id, gameId, heroId, userId, visibility, title, content, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, gameId, data.heroId ?? null, user.id, dbVisibility, data.title ?? null, data.content, ts, ts
  ).run();

  const row = await c.env.DB.prepare("SELECT * FROM game_notes WHERE id = ?").bind(id).first<any>();
  return c.json(normalizeRow(row), 201);
});

// PATCH /games/:id/notes/:noteId
// - Director can edit any
// - Heroes can edit only their own hero/player notes
//   (If visibility is changed via PATCH, map 'hero' -> 'player' before saving; return 'hero')
notes.patch("/games/:id/notes/:noteId", async (c) => {
  const gameId = c.req.param("id");
  const noteId = c.req.param("noteId");
  const user = c.get("user") as { id: string } | undefined;
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const patch = NoteSchema.partial().parse(await c.req.json());
  const isDirector = await isDirectorForGame(c.env.DB, user.id, gameId);

  const note = await c.env.DB
    .prepare("SELECT * FROM game_notes WHERE id = ? AND gameId = ?")
    .bind(noteId, gameId)
    .first<any>();
  if (!note) return c.json({ error: "Not found" }, 404);

  if (!isDirector && !(isHeroLike(note.visibility) && note.userId === user.id)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const updatedAt = now();
  const mappedVis = patch.visibility ? toDbVisibility(patch.visibility) : null;

  await c.env.DB.prepare(
    `UPDATE game_notes SET
       visibility = COALESCE(?, visibility),
       title      = COALESCE(?, title),
       content    = COALESCE(?, content),
       heroId     = COALESCE(?, heroId),
       updatedAt  = ?
     WHERE id = ?`
  ).bind(
    mappedVis, patch.title ?? null, patch.content ?? null, patch.heroId ?? null, updatedAt, noteId
  ).run();

  const updated = await c.env.DB.prepare("SELECT * FROM game_notes WHERE id = ?").bind(noteId).first<any>();
  return c.json(normalizeRow(updated));
});

// DELETE /games/:id/notes/:noteId  (Director or author of hero/player note)
notes.delete("/games/:id/notes/:noteId", async (c) => {
  const gameId = c.req.param("id");
  const noteId = c.req.param("noteId");
  const user = c.get("user") as { id: string } | undefined;
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const isDirector = await isDirectorForGame(c.env.DB, user.id, gameId);
  const note = await c.env.DB
    .prepare("SELECT * FROM game_notes WHERE id = ? AND gameId = ?")
    .bind(noteId, gameId)
    .first<any>();
  if (!note) return c.json({ error: "Not found" }, 404);

  if (!isDirector && !(isHeroLike(note.visibility) && note.userId === user.id)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await c.env.DB.prepare("DELETE FROM game_notes WHERE id = ?").bind(noteId).run();
  return c.json({ ok: true });
});

export default notes;
