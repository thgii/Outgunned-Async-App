// apps/web/src/lib/conditions.ts
import type { CharacterDTO, AttrKey } from "@action-thread/types";

/**
 * RAW mapping: each condition hits a specific Attribute; Broken hits all.
 * - Hurt        -> Brawn    (-1)
 * - Nervous     -> Nerves   (-1)
 * - Distracted  -> Focus    (-1)
 * - Like a Fool -> Smooth   (-1)
 * - Scared      -> Crime    (-1)
 * - Broken      -> All      (-1)
 */
const COND_TO_ATTR: Record<string, AttrKey | "all"> = {
  Hurt: "brawn",
  Nervous: "nerves",
  Distracted: "focus",
  "Like a Fool": "smooth",
  Scared: "crime",
  Broken: "all",
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
  return NORMALIZE[key] ?? name;
}

/**
 * Returns the total dice penalty (<= 0) for the given attribute.
 * - Each matching condition applies -1.
 * - "Broken" also applies -1 to ALL attributes,
 *   and stacks with attribute-specific ones.
 */
export function conditionPenaltyForAttribute(
  attribute: AttrKey,
  dto: Pick<CharacterDTO, "conditions"> | { conditions?: unknown }
): number {
  const raw = dto?.conditions;
  if (!raw) return 0;

  // flatten into list of normalized names
  const conds: string[] = Array.isArray(raw)
    ? raw.map(normalizeCondition).filter(Boolean) as string[]
    : typeof raw === "object"
    ? Object.entries(raw)
        .filter(([_, v]) => v)
        .map(([k]) => normalizeCondition(k))
        .filter(Boolean) as string[]
    : [];

  if (!conds.length) return 0;

  let penalty = 0;
  for (const name of conds) {
    const hit = COND_TO_ATTR[name];
    if (!hit) continue;

    // "Broken" hits all attributes and stacks with others
    if (hit === "all" || hit === attribute) {
      penalty -= 1;
    }
  }
  return penalty; // e.g. -1, -2, ...
}
