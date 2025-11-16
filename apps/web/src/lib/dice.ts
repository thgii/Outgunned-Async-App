// apps/web/src/lib/dice.ts
// Outgunned DiceEngine — pool build, analyze, difficulty, rerolls (incl. free reroll)

export type SuccessTier = "none" | "basic" | "critical" | "extreme" | "impossible" | "jackpot";
export type Difficulty = "basic" | "critical" | "extreme" | "impossible";

export type RollBreakdown = {
  faces: number[];              // the raw dice faces (sorted ascending for readability)
  counts: Record<number, number>; // 1..6 => count
  sets: number[];               // sizes of all matching sets >=2, e.g. [2,3,4]
  tierPerSet: SuccessTier[];    // parallel to sets: ["basic","critical",...]
  totalBasicEq: number;         // total “basic equivalents” after applying Three=One/One=Three
  highestTier: SuccessTier;     // the single highest set tier present
};

export type RollFlags = {
  betterThan?: "first" | "previous" | null;
  lostOneOnReroll?: boolean;
  allInBust?: boolean;
  rerollsUsed?: number;   // how many times applyReroll has been called
  allInUsed?: boolean;    // has goAllIn been used on this roll chain
};

export type RollResult = {
  poolSize: number;
  minMaxClamped: boolean;
  breakdown: RollBreakdown;
  // normalized success buckets
  basic: number;     // count of Basic successes (after conversions)
  critical: number;  // count of Critical successes (after conversions)
  extreme: number;   // count of Extreme successes (after conversions)
  impossible: number; // count of Impossible successes (after conversions)
  jackpot: number;   // count of Jackpot (6+) — generally 1 at most
  flags: RollFlags;
};

export type PoolOptions = {
  attribute: number;
  skill: number;
  modifier?: number;        // +help, +gear, +adrenaline, -conditions, -hindrances => single summed mod
  minDice?: number;         // RAW: 2
  maxDice?: number;         // RAW: 9
};

export type CheckOptions = {
  difficulty: Difficulty;   // what level you need to pass
};

export type ReRollOptions = {
  free?: boolean;           // true for Free Re-roll (no “lose 1” risk, and allowed even if no success)
  // which dice to re-roll: default is all dice NOT part of largest-scoring combination(s)
  // You can pass explicit indexes to re-roll if you want more control from the UI.
  rerollIndexes?: number[];
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// Build final pool size with min/max guard
export function buildPool(opts: PoolOptions): { pool: number; clamped: boolean } {
  const { attribute, skill, modifier = 0, minDice = 2, maxDice = 9 } = opts;
  const raw = (attribute || 0) + (skill || 0) + (modifier || 0);
  const clamped = clamp(raw, minDice, maxDice);
  return { pool: clamped, clamped: clamped !== raw };
}

// Roll n d6
export function rollD6Pool(n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < n; i++) r.push(1 + Math.floor(Math.random() * 6));
  return r;
}

// Count 2+ sets and classify tiers for each set
function classifySet(size: number): SuccessTier {
  if (size >= 6) return "jackpot";      // 6+ of a kind
  if (size === 5) return "impossible";  // quint
  if (size === 4) return "extreme";     // quad
  if (size === 3) return "critical";    // trip
  if (size === 2) return "basic";       // pair
  return "none";
}

// Three = One / One = Three conversion rules:
// 3 Basic = 1 Critical; 3 Critical = 1 Extreme. (You can also spend down larger → smaller as needed.)
function convertSetsToBuckets(sets: number[]): { basic: number; critical: number; extreme: number; impossible: number; jackpot: number } {
  // First, bucket by tier
  let basic = 0, critical = 0, extreme = 0, impossible = 0, jackpot = 0;
  for (const s of sets) {
    const t = classifySet(s);
    if (t === "basic") basic += 1;
    else if (t === "critical") critical += 1;
    else if (t === "extreme") extreme += 1;
    else if (t === "impossible") impossible += 1;
    else if (t === "jackpot") jackpot += 1;
  }

  // “Bubble up” smaller to larger:
  // 3 Basic -> 1 Critical
  if (basic >= 3) {
    const promo = Math.floor(basic / 3);
    basic = basic % 3;
    critical += promo;
  }
  // 3 Critical -> 1 Extreme
  if (critical >= 3) {
    const promo = Math.floor(critical / 3);
    critical = critical % 3;
    extreme += promo;
  }
  // Note: RAW does not promote Extreme -> Impossible; Impossible and Jackpot are direct from 5+/6+ of a kind.

  return { basic, critical, extreme, impossible, jackpot };
}

// Highest tier present in the roll
function highestTierFromSets(sets: number[]): SuccessTier {
  let hi: SuccessTier = "none";
  for (const s of sets) {
    const t = classifySet(s);
    const order = tierOrder(t);
    if (order > tierOrder(hi)) hi = t;
  }
  return hi;
}

function tierOrder(t: SuccessTier): number {
  switch (t) {
    case "none": return 0;
    case "basic": return 1;
    case "critical": return 2;
    case "extreme": return 3;
    case "impossible": return 4;
    case "jackpot": return 5;
  }
}

// Analyze a pool into sets/tiers and buckets
export function analyzePool(faces: number[]): RollBreakdown & {
  buckets: { basic: number; critical: number; extreme: number; impossible: number; jackpot: number };
} {
  const sorted = [...faces].sort((a, b) => a - b);
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const f of sorted) counts[f] = (counts[f] ?? 0) + 1;

  const sets: number[] = [];
  for (let p = 1; p <= 6; p++) {
    if (counts[p] >= 2) sets.push(counts[p]);
  }
  const tierPerSet = sets.map(classifySet);
  const buckets = convertSetsToBuckets(sets);
  const totalBasicEq =
    buckets.basic + 3 * buckets.critical + 9 * buckets.extreme + 27 * (buckets.impossible + buckets.jackpot); // basic=1, critical=3, extreme=9, impossible/jackpot treated as huge

  return {
    faces: sorted,
    counts,
    sets,
    tierPerSet,
    totalBasicEq,
    highestTier: highestTierFromSets(sets),
    buckets,
  };
}

// Perform a full roll from pool options
export function performRoll(opts: PoolOptions): RollResult {
  const { pool, clamped } = buildPool(opts);
  const faces = rollD6Pool(pool);
  return finalizeResult(faces, pool, clamped, {
    betterThan: null,
    lostOneOnReroll: false,
    allInBust: false,
    rerollsUsed: 0,
    allInUsed: false,
  });
}

// Convert analysis to RollResult
function finalizeResult(faces: number[], poolSize: number, minMaxClamped: boolean, flags: RollFlags): RollResult {
  const breakdown = analyzePool(faces);
  const { basic, critical, extreme, impossible, jackpot } = breakdown.buckets;
  return {
    poolSize,
    minMaxClamped,
    breakdown,
    basic,
    critical,
    extreme,
    impossible,
    jackpot,
    flags,
  };
}

// Decide pass/fail given a difficulty target
export function passesDifficulty(result: RollResult, check: CheckOptions): boolean {
  // Needed counts for each difficulty (after conversion):
  // BASIC: need at least 1 Basic-equivalent
  // CRITICAL: need at least 1 Critical (or 3 Basics)
  // EXTREME: need at least 1 Extreme (or 3 Criticals or 9 Basics)
  // IMPOSSIBLE: need at least 1 Impossible (or 1 Jackpot)
  const { basic, critical, extreme, impossible, jackpot } = result;

  switch (check.difficulty) {
    case "basic":
      return basic + critical + extreme + impossible + jackpot > 0;
    case "critical":
      return critical + extreme + impossible + jackpot > 0 || basic >= 3;
    case "extreme":
      return extreme + impossible + jackpot > 0 || critical >= 3 || basic >= 9;
    case "impossible":
      return impossible + jackpot > 0; // must have a 5+ of a kind
  }
}

// Indices NOT part of any set (naive heuristic: keep dice contributing to the biggest set(s))
export function defaultRerollIndexes(result: RollResult): number[] {
  const faces = result.breakdown.faces;
  // Find the value(s) with max count
  const counts = result.breakdown.counts;
  let max = 0;
  for (let p = 1; p <= 6; p++) max = Math.max(max, counts[p]);
  const keepValues = new Set<number>();
  for (let p = 1; p <= 6; p++) if (counts[p] === max && counts[p] >= 2) keepValues.add(p);

  // If we had no success at all, keepValues may be empty → reroll all
  const idxs: number[] = [];
  for (let i = 0; i < faces.length; i++) {
    if (!keepValues.has(faces[i])) idxs.push(i);
  }
  return idxs;
}

// Apply a (Free) Re-roll to an existing RollResult
export function applyReroll(prev: RollResult, opts: ReRollOptions = {}): RollResult {
  const used = prev.flags?.rerollsUsed ?? 0;
  if (used >= 1) {
    // RAW: only one reroll total
    return prev;
  }

  const hasAnySuccess =
    prev.basic + prev.critical + prev.extreme + prev.impossible + prev.jackpot > 0;

  if (!opts.free && !hasAnySuccess) {
    // Normal reroll requires at least one success
    return prev;
  }

  const faces = [...prev.breakdown.faces];
  const toReroll = opts.rerollIndexes ?? defaultRerollIndexes(prev);
  for (const idx of toReroll) {
    faces[idx] = 1 + Math.floor(Math.random() * 6);
  }

  let next = finalizeResult(
    faces,
    prev.poolSize,
    prev.minMaxClamped,
    {
      ...prev.flags,
      betterThan: null,
      lostOneOnReroll: false,
      allInBust: false,
      rerollsUsed: used + 1,
    }
  );

  const better =
    rankScore(next) > rankScore(prev) ? "previous" : null;

  let lostOne = false;
  if (!opts.free && !better) {
    const dec = degradeOneSuccess(next);
    if (dec) {
      next = dec;
      lostOne = true;
    }
  }

  next.flags.betterThan = better;
  next.flags.lostOneOnReroll = lostOne;
  // rerollsUsed is already baked into flags above
  return next;
}

// “All In”: reroll all non-set dice again; bust if not better -> lose all successes.
export function goAllIn(prev: RollResult): RollResult {
  const usedAllIn = prev.flags?.allInUsed ?? false;
  const rerollsUsed = prev.flags?.rerollsUsed ?? 0;

  // RAW: must have done a reroll, and it must have been better
  if (!prev.flags?.betterThan || rerollsUsed < 1 || usedAllIn) {
    return prev;
  }

  const faces = [...prev.breakdown.faces];
  const toReroll = defaultRerollIndexes(prev);
  for (const idx of toReroll) {
    faces[idx] = 1 + Math.floor(Math.random() * 6);
  }

  let next = finalizeResult(
    faces,
    prev.poolSize,
    prev.minMaxClamped,
    {
      ...prev.flags,
      betterThan: null,
      allInBust: false,
      allInUsed: true,
    }
  );

  if (rankScore(next) > rankScore(prev)) {
    next.flags.betterThan = "previous";
    return next;
  } else {
    next.basic = 0;
    next.critical = 0;
    next.extreme = 0;
    next.impossible = 0;
    next.jackpot = 0;
    next.flags.allInBust = true;
    return next;
  }
}

// A simple comparator score for “is this roll better?”
function rankScore(r: RollResult): number {
  // weight tiers by value (Basic 1, Crit 3, Extreme 9, Impossible 27, Jackpot 27)
  return (
    r.basic * 1 +
    r.critical * 3 +
    r.extreme * 9 +
    (r.impossible + r.jackpot) * 27
  );
}

// Drop exactly one success, preferring to remove a Basic if possible
function degradeOneSuccess(r: RollResult): RollResult | null {
  const clone: RollResult = JSON.parse(JSON.stringify(r));
  if (clone.basic > 0) clone.basic -= 1;
  else if (clone.critical > 0) clone.critical -= 1;
  else if (clone.extreme > 0) clone.extreme -= 1;
  else if (clone.impossible > 0) clone.impossible -= 1;
  else if (clone.jackpot > 0) clone.jackpot -= 1;
  else return null;
  return clone;
}
