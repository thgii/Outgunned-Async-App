import { Hono } from "hono";
import { cors } from "hono/cors";
import { campaigns } from "./routes/campaigns";
import { games } from "./routes/games";
import { messages } from "./routes/messages";
import { characters } from "./routes/characters";
import { rolls } from "./routes/rolls";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.route("/campaigns", campaigns);
app.route("/games", games);
app.route("/", messages);     // these already use absolute paths like /games/:id/messages
app.route("/characters", characters);
app.route("/", rolls);        // also uses absolute path /games/:id/rolls

app.get("/", (c) => c.json({ ok: true }));

export default app;
