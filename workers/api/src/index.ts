import { Hono } from "hono";
import { cors } from "hono/cors";
import { campaigns } from "./routes/campaigns";
import { games } from "./routes/games";
import { messages } from "./routes/messages";
import { characters } from "./routes/characters";
import { rolls } from "./routes/rolls";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

// CORS (safe even if same-origin)
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowHeaders: ["content-type", "authorization"],
  })
);

app.route("/campaigns", campaigns);
app.route("/games", games);
app.route("/", messages);     // these already use absolute paths like /games/:id/messages
app.route("/characters", characters);
app.route("api/characters", characters);
app.route("/", rolls);        // also uses absolute path /games/:id/rolls

// 🔎 Catch-all echo to help diagnose 404s during testing
app.all("*", (c) => c.json({ error: "Not found here", method: c.req.method, path: new URL(c.req.url).pathname }, 404));


// 🔎 HEALTH / DEBUG
app.get("/", (c) => c.text("OK: root"));
app.get("/__whoami", (c) => c.json({ ok: true, worker: "action-thread-api", mounts: ["/characters", "/api/characters"] }));

export default app;
