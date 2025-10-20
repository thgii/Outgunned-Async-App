// apps/web/src/data/wizard.ts
import raw from "./outgunned_data.json";
import type { CharacterDTO, AttrKey, SkillKey } from "@action-thread/types";

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

type FeatCat = { name: string; description?: string };

/* ===============================
 * Data exposure + optional catalog
 * =============================== */
export const DATA = {
  roles: (raw.roles as RoleDef[]) || [],
  tropes: (raw.tropes as TropeDef[]) || [],
  ages: (Array.isArray((raw as any).ages) ? (raw as any).ages : []).map((a: any) => a.age),
};

// ===== Feats catalog / descriptions =====
export const FEATS_CATALOG: { name: string; description?: string }[] = (() => {
  // Accept either `feats_catalog` or `feats` from the JSON
  const rawFeats =
    Array.isArray((raw as any).feats_catalog) && (raw as any).feats_catalog.length
      ? (raw as any).feats_catalog
      : (Array.isArray((raw as any).feats) ? (raw as any).feats : []);

  // Normalize to the minimal shape we need
  return rawFeats.map((f: any) => ({
    name: String(f?.name ?? "").trim(),
    description: String(f?.description ?? "").trim() || undefined,
  }));
})();

export const FEAT_DESC: Record<string, string> =
  Object.fromEntries(FEATS_CATALOG.map((f) => [f.name, f.description || ""])) || {};

/** Special Role helper */
export function isSpecialRole(name: string | undefined | null): boolean {
  const n = String(name ?? "").trim().toLowerCase();
  return n.startsWith("special:");
}

/* ===============================
 * Lookups
 * =============================== */
export function findRole(name: string) {
  return DATA.roles.find((r) => r.name === name) || null;
}
export function findTrope(name: string) {
  return DATA.tropes.find((t) => t.name === name) || null;
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
    deathRoulette: [false, false, false, false, false, false], // updated for Old

    cash: 1,
    storage: { backpack: [], bag: [], gunsAndGear: [] },
    ride: { name: "", speed: 0, armor: 0, tags: [] },

    missionOrTreasure: "",
    achievementsBondsScarsReputations: "",
    createdAt: undefined,
    updatedAt: undefined,
  };

  // Special Role?
  const specialRole = isSpecialRole(base.role);

  // Role adds
  const role = findRole(base.role);
if (!role) throw new Error("Invalid role.");

// Special?
const specialRole = isSpecialRole(base.role);
const roleName = String(base.role || "").toLowerCase();
const isNPCSpecial = specialRole && roleName.includes("n.p.c");

// 1) Special Role with array: add both fixed attributes from the array
if (specialRole && Array.isArray(role.attribute)) {
  for (const a of role.attribute) {
    const k = ATTR_MAP[a];
    if (k) dtoTemplate.attributes[k] += 1;
  }
// 2) NPC Special: user picks any two (required)
} else if (isNPCSpecial) {
  const picks = Array.isArray(base.specialAttributes) ? Array.from(new Set(base.specialAttributes)) : [];
  if (picks.length !== 2) throw new Error("Select two attributes for the Special: N.P.C. role.");
  for (const a of picks) {
    if (a) dtoTemplate.attributes[a] += 1;
  }
// 3) Regular Role with options
} else if (!specialRole && Array.isArray(role.attribute_options) && role.attribute_options.length) {
  if (!base.roleAttribute) throw new Error("Select a Role attribute option.");
  dtoTemplate.attributes[base.roleAttribute] += 1;
// 4) Regular Role with fixed attribute (string)
} else {
  const fixed = Array.isArray(role.attribute) ? role.attribute[0] : role.attribute;
  const rAttr = fixed ? ATTR_MAP[fixed] : undefined;
  if (rAttr) dtoTemplate.attributes[rAttr] += 1;
}

for (const s of role.skills || []) {
  const key = SKILL_MAP[s];
  if (key) dtoTemplate.skills[key] += 1;
}

  // Trope adds (Special Roles act as their own Trope; if no matching trope entry, skip adds)
  const trope = findTrope(base.trope);
  if (!trope) {
    if (!specialRole) throw new Error("Invalid trope.");
  } else {
// Prefer attribute_options if present; otherwise fall back to fixed attribute
const hasTropeOptions = !!(trope.attribute_options?.length);
if (hasTropeOptions && !base.tropeAttribute) {
  throw new Error("Select an attribute for the chosen trope.");
}
const tAttr = hasTropeOptions
  ? base.tropeAttribute
  : (trope.attribute ? ATTR_MAP[trope.attribute] : undefined);
if (tAttr) dtoTemplate.attributes[tAttr] += 1;
    for (const s of trope.skills || []) {
      const key = SKILL_MAP[s];
      if (key) dtoTemplate.skills[key] += 1;
    }
  }


  // Feats by age (normalize, de-dupe, clamp)
  const picksByAge = base.age === "Young" ? 1 : base.age === "Old" ? 3 : 2;
  const autoYoung = base.age === "Young" ? ["Too Young to Die"] : [];

  const cleaned = Array.from(new Set(base.selectedFeats || []))
    .map(normalizeName)
    .filter(Boolean)
    .filter((f) => (base.age === "Young" ? true : f !== "Too Young to Die"));

  const chosenNames =
    base.age === "Young"
      ? [...autoYoung, ...cleaned.slice(0, picksByAge)]
      : cleaned.slice(0, picksByAge);

  // 👉 Enrich feats so DTO carries { name, description }
  const chosenObjects = chosenNames.map(featObject);
  dtoTemplate.feats = chosenObjects;

  if (base.age === "Old") {
    dtoTemplate.deathRoulette = [true, true, false, false, false, false];
  }

  // Two extra skill bumps (+1 each; unique; clamp to 6)
  const uniq = Array.from(new Set(base.skillBumps || [])).slice(0, specialRole ? 6 : 2);
  for (const k of uniq) {
    // Guard against undefined keys just in case
    if (k && k in dtoTemplate.skills) {
      dtoTemplate.skills[k] = Math.min(6, (dtoTemplate.skills[k] as number) + 1);
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
  if (!r) return { jobs: [], flaws: [], catchphrases: [], gear: [] };
  return {
    jobs: r.jobs_options ?? [],
    flaws: r.flaws_options ?? [],
    catchphrases: r.catchphrases_options ?? [],
    gear: r.gear_options ?? [],
  };
}
