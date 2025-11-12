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
  "hurt": "brawn",
  "nervous": "nerves",
  "distracted": "focus",
  "like a fool": "smooth",
  "scared": "crime",
  "broken": "all",
};

// Normalize a free-form condition name to a safe lookup key.
// - lowercases
// - trims
// - strips punctuation
// - compresses whitespace
function normalizeKey(s: string): string {
  const noPunct = s
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // drop punctuation/symbols to spaces
    .replace(/\s+/g, " ")              // collapse spaces
    .trim()
    .toLowerCase();
  return noPunct;
}

// Try to extract a display-ish string from many shapes.
function extractRawName(x: unknown): string | null {
  if (!x) return null;
  if (typeof x === "string") return x;
  if (typeof x === "object") {
    const o = x as any;
    // common fields we’ve seen
    return o.name ?? o.label ?? o.key ?? null;
  }
  return null;
}

// Decide if a map value counts as "active"
function isActive(val: unknown): boolean {
  if (val == null) return false;
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val > 0;
  if (typeof val === "string") return /^(true|1|on|yes)$/i.test(val.trim());
  return true; // any non-null object counts
}

function extractConditionKeys(conds: unknown): string[] {
  // Array of strings/objects
  if (Array.isArray(conds)) {
    return conds
      .map(extractRawName)
      .filter(Boolean)
      .map((s) => normalizeKey(s as string));
  }

  // Object map: { broken: true, nervous: 1, ...}
  if (conds && typeof conds === "object") {
    const out: string[] = [];
    for (const [k, v] of Object.entries(conds as Record<string, unknown>)) {
      if (!isActive(v)) continue;
      out.push(normalizeKey(k));
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
  const keys = extractConditionKeys(dto?.conditions);
  if (!keys.length) return 0;

  let penalty = 0;

  for (const key of keys) {
    // Robust matching:
    // - exact key match (preferred)
    // - OR token-based includes for tricky strings like "broken status" or "is broken"
    const hitAttr =
      COND_TO_ATTR[key] ??
      (() => {
        // token/contains fallbacks
        if (/\bbroken\b/.test(key)) return "all";
        if (/\bhurt\b/.test(key)) return "brawn";
        if (/\bnervous\b/.test(key)) return "nerves";
        if (/\bdistracted\b/.test(key)) return "focus";
        if (/\blike a fool\b/.test(key) || /\bfool\b/.test(key)) return "smooth";
        if (/\bscared\b/.test(key)) return "crime";
        return undefined;
      })();

    if (!hitAttr) continue;
    if (hitAttr === "all" || hitAttr === attribute) penalty -= 1;
  }

  return penalty; // e.g., -1, -2, ...
}
