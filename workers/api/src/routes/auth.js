import { Hono } from "hono";
export const auth = new Hono();
auth.get("/dev-login", (c) => {
    // In real app, use proper auth; this returns demo user id
    return c.json({ userId: "demo-user" });
});
