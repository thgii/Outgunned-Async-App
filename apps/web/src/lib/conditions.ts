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

export type ConditionName =
  | "Hurt"
  | "Nervous"
  | "Distracted"
  | "Like a Fool"
  | "Scared"
  | "Broken";

const COND_TO_ATTR: Record<ConditionName, AttrKey | "all"> = {
  Hurt: "brawn",
  Nervous: "nerves",
  Distracted: "focus",
  "Like a Fool": "smooth",
  Scared: "crime",
  Broken: "all",
};

// Normalize common variants/casing to canonical ConditionName.
const NORM: Record<string, ConditionName> = {
  "hurt": "Hurt",
  "nervous": "Nervous",
  "distracted": "Distracted",
  "like a fool": "Like a Fool",
  "fool": "Like a Fool",
  "scared": "Scared",
  "broken": "Broken",
};

function toCondName(x: unknown): ConditionName | null {
  if (!x) return null;
  // Accept strings or objects with { name }
  const raw = typeof x === "string" ? x : (typeof x === "object" && (x as any).name);
  if (!raw || typeof raw !== "string") return null;

  const key = raw.trim().toLowerCase();
  // Try direct canonical
  if ((["Hurt","Nervous","Distracted","Like a Fool","Scared","Broken"] as ConditionName[]).includes(raw as ConditionName)) {
    return raw as ConditionName;
  }
  // Normalize via dictionary
  return NORM[key] ?? null;
}

/** Extracts a flat list of canonical condition names from many possible shapes. */
function extractConditionNames(conds: unknown): ConditionName[] {
  if (!conds) return [];

  // 1) Array of strings or objects with {name}
  if (Array.isArray(conds)) {
    return conds
      .map(toCondName)
      .filter(Boolean) as ConditionName[];
  }

  // 2) Object map: { hurt: true, nervous: 1, ... }
  if (typeof conds === "object") {
    const out: ConditionName[] = [];
    for (const [k, v] of Object.entries(conds as Record<string, unknown>)) {
      const truthy =
        typeof v === "number" ? v > 0 :
        typeof v === "boolean" ? v :
        v != null; // any non-null-ish value
      if (!truthy) continue;

      const cname = toCondName(k);
      if (cname) out.push(cname);
    }
    return out;
  }

  return [];
}

/** Returns the total dice penalty (<= 0) for the given attribute. */
export function conditionPenaltyForAttribute(
  attribute: AttrKey,
  dto: Pick<CharacterDTO, "conditions"> | { conditions?: unknown }
): number {
  const names = extractConditionNames(dto?.conditions);
  if (!names.length) return 0;

  let penalty = 0;
  for (const name of names) {
    const hit = COND_TO_ATTR[name];
    if (hit === "all" || hit === attribute) penalty -= 1;
  }
  return penalty;
}
