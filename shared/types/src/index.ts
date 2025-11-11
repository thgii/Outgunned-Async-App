export type ID = string;

export type UserRole = "director" | "hero";

export interface User {
  id: ID;
  name: string;
  email?: string;
  createdAt: string;
}

export interface Campaign {
  id: ID;
  title: string;
  system: "Outgunned" | "Adventure";
  ownerId: ID;
  createdAt: string;
  heatEnabled?: boolean;
}

export interface Game {
  id: ID;
  campaignId: ID;
  title: string;
  status: "active" | "paused" | "ended";
  options?: Record<string, unknown>;
  createdAt: string;
}

export interface Membership {
  userId: ID;
  gameId: ID;
  role: UserRole;
}

export interface Character {
  id: ID;
  campaignId: ID;
  ownerId: ID;
  name: string;
  role?: string;   // e.g. Role/Trope
  trope?: string;
  feats?: string[];
  attributes: Record<string, number>; // e.g. Brawn, Finesse...
  skills: Record<string, number>;
  resources?: { luck?: number; spotlight?: number; grit?: number };
  gear?: string[];
  conditions?: string[];
  notes?: string;
  revision?: number;
  createdAt: string;
}

export interface Message {
  id: ID;
  gameId: ID;
  authorId: ID;
  characterId?: ID;
  content: string;
  editedAt?: string;
  createdAt: string;
  embeds?: Array<{ kind: "roll" | "image" | "sheet" | "handout"; refId: ID | string }>;
  versions?: Array<{ content: string; editedAt: string }>;
}

export type RollType = "Action" | "Reaction" | "Opposed" | "Extended";
export type RollTag = "Dangerous" | "Gamble" | "Critical";

export interface Roll {
  id: ID;
  gameId: ID;
  actorId: ID;
  characterId?: ID;
  type: RollType;
  tags: RollTag[];
  pool: number[];     // raw d6 results
  result: {
    counts: Record<string, number>; // face -> count
    pairs: number;
    triples: number;
    quads: number;
    outcome: "Fail" | "Basic Success" | "Critical Success";
  };
  luckSpent?: number;
  rerolls?: number[][];
  createdAt: string;
}

export interface Clock {
  id: ID;
  gameId: ID;
  label: string;
  max: number;
  value: number;
}

export * from "./character";

export { GEAR } from "./data/gear";
export type {
  GearItem, GearKind, GearSource, GearId,
  GunProfile, ParsedGunCell
} from "./data/gear";
export { parseGunCell, parseGunRanges } from "./data/gear";

export * from './npc';


// ---------------------------------------------------------------------------
// ADDITIONS BELOW: Scene State, Notes, and Villains
// ---------------------------------------------------------------------------

// ---- Scene (Game Options) ----
export interface Countdown {
  id: string;
  label: string;
  total: number;
  current: number; // 0..total
}

export interface ChaseState {
  need: number;        // total boxes to complete
  progress: number;    // filled boxes
  speedHeroes: number; // relative speed marker for heroes
  speedTarget: number; // relative speed marker for target
}

export interface GameOptions {
  heat?: number;               // default 0
  countdowns?: Countdown[];    // default []
  chase?: ChaseState;          // optional
}

// ---- Notes ----
export type GameNoteVisibility = 'public' | 'director_private' | 'player';

export interface GameNote {
  id: ID;
  gameId: ID;
  heroId?: ID | null;
  userId?: ID | null;
  visibility: GameNoteVisibility;
  title?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Villains (per-campaign) ----
export type Level3 = 'Basic' | 'Critical' | 'Extreme';
export type EnemyType = 'goon' | 'bad_guy' | 'boss';

export interface Villain {
  id: ID;
  campaignId: ID;
  name: string;
  type?: EnemyType | null;
  portraitUrl?: string | null;
  gritMax?: number | null;
  grit?: number | null;
  attackLevel?: Level3 | null;
  defenseLevel?: Level3 | null;
  tags?: string | null;                // comma-separated
  bio?: string | null;
  data?: Record<string, unknown> | null; // parsed from JSON
  createdAt: string;
  updatedAt: string;
}

// ---- Optional UI helpers
export const defaultGameOptions = (): GameOptions => ({
  heat: 0,
  countdowns: [],
});

export const makeCountdown = (label = 'Clock', total = 6): Countdown => ({
  id: (globalThis as any)?.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  label, total, current: 0,
});
