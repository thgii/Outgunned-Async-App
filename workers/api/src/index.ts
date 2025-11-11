import { Hono } from "hono";
import { cors } from "hono/cors";
import { campaigns } from "./routes/campaigns";
import { games } from "./routes/games";
import { messages } from "./routes/messages";
import { characters } from "./routes/characters";
import { rolls } from "./routes/rolls";
import { auth } from "./routes/auth";
import { requireUser } from "./utils/auth";
import { npcs } from './routes/npcs';
import { uploads } from "./routes/uploads";
import notes from "./routes/notes";
import villains from "./routes/villains";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

// Router ping
characters.get("/__ping", (c) => c.text("OK: characters router mounted"));

// CORS (safe even if same-origin)
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["content-type", "authorization"],
  })
);

app.route("/", auth);
app.use("*", requireUser);
app.route("/campaigns", campaigns);
app.route("/games", games);
app.route("/", messages);     // these already use absolute paths like /games/:id/messages
app.route("/characters", characters);
app.route("/api/characters", characters);
app.route("/", rolls);        // also uses absolute path /games/:id/rolls
app.route('/', npcs);
app.route("/", uploads);
app.route("/", notes); // notes registers /games/:id/notes...
app.route("/", villains); // exposes /campaigns/:id/villains...

export default app;
