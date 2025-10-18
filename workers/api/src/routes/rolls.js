import { Hono } from "hono";
import { rollD6, analyze } from "../utils/dice";
export const rolls = new Hono();
rolls.post("/games/:id/rolls", async (c) => {
    const gameId = c.req.param("id");
    const { pool: n = 4, type = "Action", tags = [] } = (await c.req.json().catch(() => ({})));
    // compute roll/result in memory
    const pool = rollD6(n);
    const result = analyze(pool);
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    // store as JSON strings
    await c.env.DB.prepare("INSERT INTO rolls (id, gameId, actorId, type, tags, pool, result, createdAt) VALUES (?,?,?,?,?,?,?,?)")
        .bind(id, gameId, "demo-user", type, JSON.stringify(tags), JSON.stringify(pool), JSON.stringify(result), createdAt)
        .run();
    // return parsed fields (arrays/objects), not strings
    // you can skip fetching from DB and just return the objects we already have
    return c.json({
        id,
        gameId,
        actorId: "demo-user",
        type,
        tags,
        pool, // <— array
        result, // <— object
        createdAt
    });
});
