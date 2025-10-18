import { Hono } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
export type Env = { DB: D1Database };
import { cors } from "hono/cors";
import { campaigns } from "./routes/campaigns";
import { games } from "./routes/games";
import { messages } from "./routes/messages";
import { characters } from "./routes/characters";
import { rolls } from "./routes/rolls";
const app = new Hono();
// Router ping
characters.get("/__ping", (c) => c.text("OK: characters router mounted"));
// CORS (safe even if same-origin)
app.use('/*', cors({
  origin: '*', // tighten to your Pages origin in prod
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
  credentials: false,
}));
app.route("/campaigns", campaigns);
app.route("/games", games);
app.route("/", messages); // these already use absolute paths like /games/:id/messages
app.route("/characters", characters);
app.route("/api/characters", characters);
app.route("/", rolls); // also uses absolute path /games/:id/rolls
export default app;
