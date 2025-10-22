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

/** Returns the total dice penalty (<= 0) for the given attribute. */
export function conditionPenaltyForAttribute(
  attribute: AttrKey,
  dto: Pick<CharacterDTO, "conditions">
): number {
  const conds = dto.conditions ?? [];
  if (!Array.isArray(conds) || !conds.length) return 0;

  let penalty = 0;
  for (const name of conds) {
    const hit = COND_TO_ATTR[name];
    if (!hit) continue;
    if (hit === "all" || hit === attribute) penalty -= 1;
  }
  return penalty; // e.g. -1, -2...
}
