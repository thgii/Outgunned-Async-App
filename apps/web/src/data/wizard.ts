// apps/web/src/data/wizard.ts
import raw from "./outgunned_data.json";
import type { CharacterDTO, AttrKey, SkillKey } from "@action-thread/types";
// Gear grants (shared types)
import type { GearGrant, GearSelector } from "@action-thread/types";


// ---- attribute normalizers (array/single, case-insensitive) ----
const ATTR_KEYS: AttrKey[] = ["brawn", "nerves", "smooth", "focus", "crime"];

export const normalizeAttr = (a?: string | null): AttrKey | null => {
  if (!a) return null;
  const k = a.trim().toLowerCase();
  return (ATTR_KEYS as string[]).includes(k) ? (k as AttrKey) : null;
};

export const getRoleAttrOptions = (role?: { attribute?: string | string[] }): AttrKey[] => {
  if (!role || !role.attribute) return [];
  const raw = role.attribute;
  if (Array.isArray(raw)) {
    return raw.map(normalizeAttr).filter(Boolean) as AttrKey[];
  }
  const one = normalizeAttr(raw);
  return one ? [one] : [];
};

/* ===============================
 * Types reflecting your JSON shape
 * =============================== */
type RoleDef = {
  name: string;
  description?: string;
  // regular roles: string, special roles may provide an array (add both)
  attribute: string | string[];
  // optional: if present on regular roles, let the user choose
  attribute_options?: string[];
  skills: string[];
  feats: string[];
  gear_options?: string[];
  jobs_options?: string[];
  flaws_options?: string[];
  catchphrases_options?: string[];
};

type TropeDef = {
  name: string;
  description?: string;
  attribute?: string;
  attribute_options?: string[];
  skills: string[];
  feats: string[];
  feat_options?: string[];
};

type FeatCat = { name: string; description?: string; requires_meter?: boolean };

export const FEATS_CATALOG: FeatCat[] = RAW_FEATS.map((f: any) => ({
  name: String(f?.name ?? "").trim(),
  description: String(f?.description ?? "").trim() || undefined,
  requires_meter: !!f?.requires_meter, // <-- pull through the JSON flag
}));

/* ===============================
 * Data exposure + optional catalog
 * =============================== */
export const DATA = {
  roles: (raw.roles as RoleDef[]) || [],
  tropes: (raw.tropes as TropeDef[]) || [],
  ages: (Array.isArray((raw as any).ages) ? (raw as any).ages : []).map((a: any) => a.age),
};

// ===== Feats catalog / descriptions =====

// Keep a raw feats array around so we can expose extra metadata like `requires_meter`
const RAW_FEATS: any[] = (() => {
  // Accept either `feats_catalog` or `feats` from the JSON
  const rawFeats =
    Array.isArray((raw as any).feats_catalog) && (raw as any).feats_catalog.length
      ? (raw as any).feats_catalog
      : (Array.isArray((raw as any).feats) ? (raw as any).feats : []);

  return rawFeats;
})();

export const FEATS_CATALOG: { name: string; description?: string }[] = RAW_FEATS.map((f: any) => ({
  name: String(f?.name ?? "").trim(),
  description: String(f?.description ?? "").trim() || undefined,
}));

export const FEAT_DESC: Record<string, string> =
  Object.fromEntries(FEATS_CATALOG.map((f) => [f.name, f.description || ""])) || {};

// Minimal feat metadata: right now we only care about requires_meter,
// which is true for feats that cost Adrenaline/Spotlight/etc.
export const FEAT_META: Record<string, { requires_meter: boolean }> =
  Object.fromEntries(
    RAW_FEATS.map((f: any) => [
      String(f?.name ?? "").trim(),
      { requires_meter: !!f?.requires_meter },
    ])
  );

/** Special Role helper */
export function isSpecialRole(name?: string | null) {
  return !!name && name.trim().toLowerCase().startsWith("special:");
}

/* ===============================
 * Lookups
 * =============================== */
export function findRole(name: string) {
  const needle = String(name ?? "").trim().toLowerCase();
  return (
    DATA.roles.find((r) => r.name.trim().toLowerCase() === needle) ||
    null
  );
}
export function findTrope(name: string) {
  const needle = String(name ?? "").trim().toLowerCase();
  return (
    DATA.tropes.find((t) => t.name.trim().toLowerCase() === needle) ||
    null
  );
}

/* ===============================
 * Mappings
 * =============================== */
const ATTR_MAP: Record<string, AttrKey> = {
  Brawn: "brawn",
  Nerves: "nerves",
  Smooth: "smooth",
  Focus: "focus",
  Crime: "crime",
};

const SKILL_MAP: Record<string, SkillKey> = {
  Endure: "endure",
  Fight: "fight",
  Force: "force",
  Stunt: "stunt",
  Cool: "cool",
  Drive: "drive",
  Shoot: "shoot",
  Survival: "survival",
  Flirt: "flirt",
  Leadership: "leadership",
  Speech: "speech",
  Style: "style",
  Detect: "detect",
  Fix: "fix",
  Heal: "heal",
  Know: "know",
  Awareness: "awareness",
  Dexterity: "dexterity",
  Stealth: "stealth",
  Streetwise: "streetwise",
};

/* ===============================
 * Helpers
 * =============================== */
function normalizeName(n: string | undefined | null): string {
  return String(n ?? "").trim();
}
function featObject(name: string): { name: string; description?: string } {
  const n = normalizeName(name);
  const d = normalizeName(FEAT_DESC[n]);
  return d ? { name: n, description: d } : { name: n };
}

// ---- Gear grants loader: prefer structured, fallback to strings ----
function getGearGrants(def: { gear_grants?: GearGrant[]; gear?: string[] }): GearGrant[] {
  if (Array.isArray(def.gear_grants) && def.gear_grants.length) {
    return def.gear_grants;
  }
  // Minimal legacy fallback rules for common phrases
  const strings = def.gear ?? [];
  const grants: GearGrant[] = [];
  for (const s of strings) {
    const t = s.toLowerCase().trim();

    if (t.includes("pistol or rifle or shotgun")) {
      grants.push({ mode: "choose", of: { type: "ids", ids: ["pistol","rifle","shotgun"] }, count: 1 });
      continue;
    }
    if (/\$1.*item.*choice/.test(t)) {
      grants.push({ mode: "choose", of: { type: "custom", label: "$1 item of your choice", constraint: { costEq: 1 } }, count: 1 });
      continue;
    }
    if (/ride.*speed\s*1/.test(t) || /common rides/i.test(t)) {
      grants.push({ mode: "choose", of: { type: "ride", speed: 1 }, count: 1 });
      continue;
    }
    if (/weapon of choice/.test(t)) {
      grants.push({ mode: "choose", of: { type: "kind", kind: "weapon" }, count: 1 });
      continue;
    }
    // Last resort: generic picker with a label (UI will handle)
    grants.push({ mode: "choose", of: { type: "custom", label: s }, count: 1 });
  }
  return grants;
}

// === Expose gear grants for UI (role / trope) ===
export function roleGearGrants(roleName: string): GearGrant[] {
  const r = findRole(roleName);
  return r ? getGearGrants(r as any) : [];
}

export function tropeGearGrants(tropeName: string): GearGrant[] {
  const t = findTrope(tropeName);
  return t ? getGearGrants(t as any) : [];
}

/* ===============================
 * Builder (trope required)
 * =============================== */
// Returns a DTO with all derived values applied (base 2/1 stats + role/trope adds)
export function buildDerivedDTO(
  base: Partial<CharacterDTO> & {
  name: string;
  role: string;
  trope: string; // ← required
  age: "Young" | "Adult" | "Old";
  // attribute picks coming from the wizard
  roleAttribute?: AttrKey;      // when a regular Role exposes attribute_options
  tropeAttribute?: AttrKey;     // when a Trope exposes attribute_options
  specialAttributes?: AttrKey[]; // NPC Special: choose any two
  selectedFeats: string[];
  skillBumps: SkillKey[];
  jobOrBackground?: string;
  flaw?: string;
  catchphrase?: string;
  gearChosen?: string[];
}
): CharacterDTO {
  // --- validation ---
  if (!base.name?.trim()) throw new Error("Name is required.");
  if (!base.role?.trim()) throw new Error("Role is required.");
  if (!base.trope?.trim()) throw new Error("Trope is required.");

  const dtoTemplate: CharacterDTO = {
    id: undefined,
    name: base.name,
    role: base.role,
    trope: base.trope ?? "",
    age: base.age,
    jobOrBackground: base.jobOrBackground ?? "",
    catchphrase: base.catchphrase ?? "",
    flaw: base.flaw ?? "",
    // Base scores: attributes = 2 each, skills = 1 each
    attributes: { brawn: 2, nerves: 2, smooth: 2, focus: 2, crime: 2 },
    skills: {
      endure: 1,
      fight: 1,
      force: 1,
      stunt: 1,
      cool: 1,
      drive: 1,
      shoot: 1,
      survival: 1,
      flirt: 1,
      leadership: 1,
      speech: 1,
      style: 1,
      detect: 1,
      fix: 1,
      heal: 1,
      know: 1,
      awareness: 1,
      dexterity: 1,
      stealth: 1,
      streetwise: 1,
    },
    grit: { current: 0, max: 12 },
    adrenaline: 1, // start pool
    spotlight: 1,
    luck: 1,
    experiences: [],
    feats: [],
    youLookSelected: [],
    isBroken: false,
    deathRoulette: [true, false, false, false, false, false], // updated for Old

    cash: 1,
    storage: { backpack: [], bag: [], gunsAndGear: [] },
    ride: { name: "", speed: 0, armor: 0, tags: [] },

    missionOrTreasure: "",
    achievementsBondsScarsReputations: "",
    createdAt: undefined,
    updatedAt: undefined,
  };

 // Role adds
const role = findRole(base.role);
if (!role) throw new Error("Invalid role.");

// Special?
const specialRole = isSpecialRole(base.role);
const roleName = String(base.role || "").toLowerCase();
const isNPCSpecial = specialRole && roleName.includes("n.p.c");

// ---- normalizer so "Brawn"/"brawn" both work and map safely ----
const toAttrKey = (x: any): AttrKey | undefined => {
  if (!x) return undefined;
  const k = String(x).trim().toLowerCase() as AttrKey;
  return (["brawn","nerves","smooth","focus","crime"] as const).includes(k) ? k : undefined;
};

// 1) NPC Special: do NOT auto-add; user will choose any two later (handled elsewhere)
if (isNPCSpecial) {
  // no-op here; see later where you apply base.specialAttributes picks (+2 total)
}
// 2) Special Role (non-NPC): add +1 for each listed attribute (array or single), capped at 3
else if (specialRole) {
  const attrs = Array.isArray(role.attribute) ? role.attribute : [role.attribute];
  for (const a of attrs) {
    const k = toAttrKey(a);
    if (k) dtoTemplate.attributes[k] = Math.min(3, (dtoTemplate.attributes[k] as number) + 1);
  }
}
// 3) Regular Role: fixed attribute, capped at 3
else {
  const fixed = Array.isArray(role.attribute) ? role.attribute[0] : role.attribute;
  const rAttr = toAttrKey(fixed);
  if (rAttr) dtoTemplate.attributes[rAttr] = Math.min(3, (dtoTemplate.attributes[rAttr] as number) + 1);
}

// Role skills (+1 each, cap=3)
for (const s of role.skills || []) {
  const key = SKILL_MAP[s];
  if (key) dtoTemplate.skills[key] = Math.min(3, (dtoTemplate.skills[key] as number) + 1);
}

  // Trope adds — skip entirely for Special Roles
  if (!specialRole) {
    const trope = findTrope(base.trope);
    if (!trope) throw new Error("Invalid trope.");

    // Prefer attribute_options if present; otherwise fall back to fixed attribute
    const hasTropeOptions = !!(trope.attribute_options?.length);
    if (hasTropeOptions && !base.tropeAttribute) {
      throw new Error("Select an attribute for the chosen trope.");
    }
    const tAttr = hasTropeOptions
      ? ((ATTR_MAP as any)[base.tropeAttribute as any] ?? base.tropeAttribute)
      : (trope.attribute ? ATTR_MAP[trope.attribute] : undefined);
    if (tAttr) dtoTemplate.attributes[tAttr] = Math.min(3, (dtoTemplate.attributes[tAttr] as number) + 1);

    for (const s of trope.skills || []) {
      const key = SKILL_MAP[s];
      if (key) dtoTemplate.skills[key] = Math.min(3, (dtoTemplate.skills[key] as number) + 1);
    }

  }



// 🔧 FIX: Feats (source-agnostic, no DTO-side caps)
// The wizard UI already enforces how many feats can be picked.
// Here we *only* normalize and enrich what the user actually selected.
const chosenObjects = Array.from(
  new Set((base.selectedFeats || []).map(normalizeName))
).map((name) => featObject(name));

dtoTemplate.feats = chosenObjects;

  if (base.age === "Young") {
    dtoTemplate.adrenaline = 2;
  }
  
  if (base.age === "Old") {
    dtoTemplate.deathRoulette = [true, true, false, false, false, false];
  }

  // Extra skill bumps (+1 each; duplicates allowed; clamp to 3 per skill)
  const bumpList = (base.skillBumps || []).slice(0, specialRole ? 6 : 2);
  for (const k of bumpList) {
    if (k && k in dtoTemplate.skills) {
      dtoTemplate.skills[k] = Math.min(3, (dtoTemplate.skills[k] as number) + 1);
    }
  }

  // Default Job/Background to the Special Role's name if left blank
  if (specialRole && !dtoTemplate.jobOrBackground.trim()) {
    dtoTemplate.jobOrBackground = base.role;
  }


  // Gear → simple name-only entries
  if (base.gearChosen?.length) {
    dtoTemplate.storage.gunsAndGear = base.gearChosen.map((name) => ({
      name,
      tags: [],
      ranges: {},
    }));
  }

  return dtoTemplate;
}

/* ===============================
 * Age rules (for UI)
 * =============================== */
export function featsAllowanceByAge(age: "Young" | "Adult" | "Old") {
  return age === "Young"
    ? { picks: 1, auto: ["Too Young to Die"] }
    : age === "Old"
    ? { picks: 3, auto: [] }
    : { picks: 2, auto: [] };
}

/** Feat selection rules (source-aware):
 * Young: auto TYtD, and choose 1 Role + 1 Trope (exactly).
 * Adult: 2 Role + 1 Trope (exactly; if no Trope feats exist, fallback to 3 Role).
 * Old: Adult + 1 extra from either source → total 4 with mins (Role>=2, Trope>=1).
 * Special: any 3 from Role/Trope.
 *
 * We return totals and minimums (roleMin/tropeMin). The UI enforces caps for
 * Young/Adult; Old only caps by total (and Next requires mins satisfied).
 */
export function featRules(
  age: "Young" | "Adult" | "Old",
  isSpecial: boolean,
  roleFeatsCount: number,
  tropeFeatsCount: number
): { total: number; roleMin: number; tropeMin: number; auto: string[] } {
  if (isSpecial) {
    return { total: 3, roleMin: 0, tropeMin: 0, auto: [] };
  }

  if (age === "Young") {
    // Always include TYtD, plus exactly 1 Role and 1 Trope pick
    const hasTrope = tropeFeatsCount > 0;
    return {
      total: hasTrope ? 2 : 1,        // user picks (auto TYtD is separate)
      roleMin: hasTrope ? 1 : 1,      // require 1 role
      tropeMin: hasTrope ? 1 : 0,     // require 1 trope only if available
      auto: ["Too Young to Die"],
    };
  }

  if (age === "Adult") {
    const hasTrope = tropeFeatsCount > 0;
    return hasTrope
      ? { total: 3, roleMin: 2, tropeMin: 1, auto: [] }
      : { total: 3, roleMin: 3, tropeMin: 0, auto: [] }; // fallback if no trope feats
  }

  // Old: Adult + 1 flexible pick (either source), keep mins Role>=2, Trope>=1
  const hasTrope = tropeFeatsCount > 0;
  return hasTrope
    ? { total: 4, roleMin: 2, tropeMin: 1, auto: [] }
    : { total: 4, roleMin: 4, tropeMin: 0, auto: [] }; // if no trope feats exist
}


/* ===============================
 * Role option lists
 * =============================== */
export function roleOptionLists(roleName: string) {
  const r = findRole(roleName);
  if (!r) return { jobs: [], flaws: [], catchphrases: [], gear: [], gear_grants: [] as GearGrant[] };

  return {
    jobs: r.jobs_options ?? [],
    flaws: r.flaws_options ?? [],
    catchphrases: r.catchphrases_options ?? [],
    gear: r.gear_options ?? [],                 // legacy strings still exposed
    gear_grants: getGearGrants(r as any),       // <-- new: structured grants for the UI
  };
}

