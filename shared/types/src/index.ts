export type ID = string;

export type UserRole = "GM" | "Player";

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

export { GEAR } from "./data/gear";               // or GEAR_WITH_TAGS if you use it
export type {
  GearItem, GearKind, GearSource, GearId,
  GunProfile, ParsedGunCell
} from "./data/gear";
export { parseGunCell, parseGunRanges } from "./data/gear";

