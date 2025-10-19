// apps/web/src/data/wizard.ts
import raw from "./outgunned_data.json";
import type { CharacterDTO, AttrKey, SkillKey } from "@action-thread/types";

/* ===============================
 * Types reflecting your JSON shape
 * =============================== */
type RoleDef = {
  name: string;
  description?: string;
  attribute: string;
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
  feats?: string[];
  feat_options?: string[];
  gear_options?: string[];
  jobs_options?: string[];
  flaws_options?: string[];
  catchphrases_options?: string[];
};

export const DATA: {
  roles: RoleDef[];
  tropes: TropeDef[];
  feats: { name: string; description?: string }[];
} = raw as any;

/* ===============================
 * Finders
 * =============================== */
export function findRole(name: string | undefined | null): RoleDef | null {
  const n = normalizeName(name);
  return DATA.roles.find((r) => normalizeName(r.name) === n) ?? null;
}
export function findTrope(name: string | undefined | null): TropeDef | null {
  const n = normalizeName(name);
  return DATA.tropes.find((t) => normalizeName(t.name) === n) ?? null;
}

/* ===============================
 * Maps
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

export function isSpecialTropeName(n: string | undefined | null): boolean {
  return /^\s*Special:\s*/i.test(String(n ?? ""));
}

const FEAT_DESC: Record<string, string> = Object.fromEntries(
  (DATA.feats || []).map((f) => [normalizeName(f.name), f.description || ""])
);

function featObject(name: string): { name: string; description?: string } {
  const n = normalizeName(name);
  const d = normalizeName(FEAT_DESC[n]);
  return d ? { name: n, description: d } : { name: n };
}

/* ===============================
 * Builder (trope required)
 * =============================== */
export function buildDerivedDTO(
  base: Partial<CharacterDTO> & {
    name: string;
    role: string;
    trope: string; // required
    age: "Young" | "Adult" | "Old";
    tropeAttribute?: AttrKey; // required when trope has attribute_options
    selectedFeats: string[]; // not including auto TYtD
    skillBumps: SkillKey[]; // 2 normally; 6 if Special Role
    jobOrBackground?: string;
    flaw?: string;
    catchphrase?: string;
    gearChosen?: string[];
  }
): CharacterDTO {
  // --- validation ---
  if (!base.name?.trim()) throw new Error("Name is required.");
  if (!base.role?.trim() && !isSpecialTropeName(base.trope)) throw new Error("Role is required.");
  if (!base.trope?.trim()) throw new Error("Trope is required.");

  const dtoTemplate: CharacterDTO = {
    id: undefined,
    name: base.name,
    role: base.role,
    trope: base.trope ?? "",
    age: base.age,
    jobOrBackground: (base.jobOrBackground ?? "") || (isSpecialTropeName(base.trope) ? base.trope : ""),
    catchphrase: base.catchphrase ?? "",
    flaw: base.flaw ?? "",

    // Base scores: attributes = 2 each, skills = 1 each
    attributes: { brawn: 2, nerves: 2, smooth: 2, focus: 2, crime: 2 },
    skills: {
      endure: 1, fight: 1, force: 1, stunt: 1,
      cool: 1, drive: 1, shoot: 1, survival: 1,
      flirt: 1, leadership: 1, speech: 1, style: 1,
      detect: 1, fix: 1, heal: 1, know: 1,
      awareness: 1, dexterity: 1, stealth: 1, streetwise: 1,
    },

    grit: { current: 0, max: 12 },
    adrenaline: 1,
    spotlight: 1,
    luck: 1,

    experiences: [],
    feats: [],
    youLookSelected: [],
    isBroken: false,
    deathRoulette: [false, false, false, false, false, false],

    cash: 1,
    storage: { backpack: [], bag: [], gunsAndGear: [] },
    ride: { name: "", speed: 0, armor: 0, tags: [] },

    missionOrTreasure: "",
    achievementsBondsScarsReputations: "",
    createdAt: undefined,
    updatedAt: undefined,
  };

  // Role adds (skip the strict requirement if the Trope is a Special Role)
  const role = findRole(base.role);
  if (!role) {
    if (!isSpecialTropeName(base.trope)) throw new Error("Invalid role.");
  } else {
    const rAttr = ATTR_MAP[role.attribute];
    if (rAttr) dtoTemplate.attributes[rAttr] += 1;
    for (const s of role.skills || []) {
      const key = SKILL_MAP[s];
      if (key) dtoTemplate.skills[key] += 1;
    }
  }

  // Trope adds (required)
  const trope = findTrope(base.trope);
  if (!trope) throw new Error("Invalid trope.");
  const tropeNeedsAttr = !!(trope.attribute_options?.length && !trope.attribute);
  if (tropeNeedsAttr && !base.tropeAttribute) {
    throw new Error("Select an attribute for the chosen trope.");
  }
  const tAttr = trope.attribute ? ATTR_MAP[trope.attribute] : base.tropeAttribute;
  if (tAttr) dtoTemplate.attributes[tAttr] += 1;
  for (const s of trope.skills || []) {
    const key = SKILL_MAP[s];
    if (key) dtoTemplate.skills[key] += 1;
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

  // Enrich feats
  const chosenObjects = chosenNames.map(featObject);
  dtoTemplate.feats = chosenObjects;

  if (base.age === "Old") {
    dtoTemplate.deathRoulette = [true, true, false, false, false, false];
  }

  // Extra skill bumps (+1 each; unique; clamp to 6). Special Roles get 6 instead of 2.
  const maxBumps = isSpecialTropeName(base.trope) ? 6 : 2;
  const uniq = Array.from(new Set(base.skillBumps || [])).slice(0, maxBumps);
  for (const k of uniq) {
    if (k && k in dtoTemplate.skills) {
      dtoTemplate.skills[k] = Math.min(6, (dtoTemplate.skills[k] as number) + 1);
    }
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
