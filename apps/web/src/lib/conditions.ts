// apps/web/src/lib/conditions.ts
import type { CharacterDTO, AttrKey } from "@action-thread/types";

/**
 * RAW mapping: each condition hits a specific Attribute; Broken hits all.
 * - Hurt        -> Brawn    (-1)
 * - Nervous     -> Nerves   (-1)
 * - Distracted  -> Focus    (-1)
 * - Like a Fool -> Smooth   (-1)
 * - Scared      -> Crime    (-1)
 * - Broken      -> -1 to every roll (stacks)
 */
const COND_TO_ATTR: Record<string, AttrKey> = {
  Hurt: "brawn",
  Nervous: "nerves",
  Distracted: "focus",
  "Like a Fool": "smooth",
  Scared: "crime",
};

const NORMALIZE: Record<string, string> = {
  "hurt": "Hurt",
  "nervous": "Nervous",
  "distracted": "Distracted",
  "like a fool": "Like a Fool",
  "fool": "Like a Fool",
  "scared": "Scared",
  "broken": "Broken",
};

function normalizeCondition(raw: unknown): string | null {
  if (!raw) return null;
  const name =
    typeof raw === "string"
      ? raw
      : typeof raw === "object" && "name" in (raw as any)
      ? (raw as any).name
      : null;

  if (typeof name !== "string") return null;
  const key = name.trim().toLowerCase();
  return NORMALIZE[key] ?? name.trim();
}

function looksBroken(s: string): boolean {
  // robust token match so "BROKEN!", "broken status", "is-broken" all count
  return /\bbroken\b/i.test(s);
}

/**
 * Returns the total dice penalty (<= 0) for the given attribute.
 * Rules:
 * - Each matching attribute-specific condition applies -1.
 * - "Broken" always applies -1 to any roll, and stacks.
 */
export function conditionPenaltyForAttribute(
  attribute: AttrKey,
  dto: Pick<CharacterDTO, "conditions"> | { conditions?: unknown }
): number {
  const raw = dto?.conditions;
  if (!raw) return 0;

  // flatten into list of normalized names
  const conds: string[] = Array.isArray(raw)
    ? (raw.map(normalizeCondition).filter(Boolean) as string[])
    : typeof raw === "object"
    ? (Object.entries(raw)
        .filter(([_, v]) => Boolean(v))
        .map(([k]) => normalizeCondition(k))
        .filter(Boolean) as string[])
    : [];

  if (!conds.length) return 0;

  let penalty = 0;

  // 1) Broken: unconditional -1 (stacks)
  if (conds.some((c) => c === "Broken" || looksBroken(c))) {
    penalty -= 1;
  }

  // 2) Attribute-specific hits (each -1)
  for (const name of conds) {
    const hitAttr = COND_TO_ATTR[name];
    if (hitAttr === attribute) penalty -= 1;
  }

  return penalty; // e.g., -1, -2, ...
}
