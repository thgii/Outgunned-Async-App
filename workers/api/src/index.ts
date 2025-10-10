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

app.route("/", campaigns);
app.route("/", games);
app.route("/", messages);
app.route("/", characters);
app.route("/", rolls);

app.get("/", (c) => c.json({ ok: true }));

export default app;
