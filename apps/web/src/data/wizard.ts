import raw from "./outgunned_data.json";
import type { CharacterDTO, AttrKey, SkillKey } from "@action-thread/types";

type RoleDef = {
  name: string;
  attribute: string;           // "Brawn" etc
  skills: string[];            // ["Endure", ...]
  feats: string[];
  gear_options: string[];
  jobs_options: string[];
  flaws_options: string[];
  catchphrases_options: string[];
};

type TropeDef = {
  name: string;
  attribute?: string;
  attribute_options?: string[];
  skills: string[];
  feats: string[];
  feat_options?: string[];
};

export const DATA = {
  roles: (raw.roles as RoleDef[]),
  tropes: (raw.tropes as TropeDef[]),
  ages: raw.ages.map(a => a.age), // ["Young","Adult","Old"]
};

export function findRole(name: string) {
  return DATA.roles.find(r => r.name === name) || null;
}
export function findTrope(name: string) {
  return DATA.tropes.find(t => t.name === name) || null;
}

const ATTR_MAP: Record<string, AttrKey> = {
  Brawn: "brawn", Nerves: "nerves", Smooth: "smooth", Focus: "focus", Crime: "crime",
};

const SKILL_MAP: Record<string, SkillKey> = {
  Endure:"endure", Fight:"fight", Force:"force", Stunt:"stunt",
  Cool:"cool", Drive:"drive", Shoot:"shoot", Survival:"survival",
  Flirt:"flirt", Leadership:"leadership", Speech:"speech", Style:"style",
  Detect:"detect", Fix:"fix", Heal:"heal", Know:"know",
  Awareness:"awareness", Dexterity:"dexterity", Stealth:"stealth", Streetwise:"streetwise",
};

// returns a deep-cloned DTO with all derived values applied
export function buildDerivedDTO(base: Partial<CharacterDTO> & {
  name: string;
  role: string;
  trope?: string;
  age: "Young" | "Adult" | "Old";
  tropeAttribute?: AttrKey; // required when trope has attribute_options
  selectedFeats: string[];  // user-chosen feats (not including auto TYtD)
  skillBumps: SkillKey[];   // exactly two skills to +1 (can include dupes? we enforce unique)
  jobOrBackground?: string;
  flaw?: string;
  catchphrase?: string;
  gearChosen?: string[];    // from role gear_options or custom lines
}) : CharacterDTO {
  const dtoTemplate: CharacterDTO = {
    id: undefined,
    name: base.name,
    role: base.role,
    trope: base.trope ?? "",
    age: base.age,
    jobOrBackground: base.jobOrBackground ?? "",
    catchphrase: base.catchphrase ?? "",
    flaw: base.flaw ?? "",

    attributes: { brawn:0, nerves:0, smooth:0, focus:0, crime:0 },
    skills: {
      endure:0, fight:0, force:0, stunt:0,
      cool:0, drive:0, shoot:0, survival:0,
      flirt:0, leadership:0, speech:0, style:0,
      detect:0, fix:0, heal:0, know:0,
      awareness:0, dexterity:0, stealth:0, streetwise:0,
    },

    grit: { current: 6, max: 6 },
    adrenaline: 1,      // per your flow: start with 1 adrenaline/luck
    spotlight: 1,       // start with 1 spotlight
    luck: 1,            // start with 1 luck (covers Adventure too)

    experiences: [],
    feats: [],
    youLookSelected: [],
    isBroken: false,
    deathRoulette: [false,false,false,false,false,false], // updated below for Old

    cash: 1,
    storage: { backpack: [], bag: [], gunsAndGear: [] },
    ride: { name: "", speed: 0, armor: 0, tags: [] },

    missionOrTreasure: "",
    achievementsBondsScarsReputations: "",
    createdAt: undefined,
    updatedAt: undefined,
  };

  const role = findRole(base.role);
  if (!role) return dtoTemplate;

  // Role: +1 attribute, +1 in listed skills
  const rAttr = ATTR_MAP[role.attribute];
  if (rAttr) dtoTemplate.attributes[rAttr] += 1;
  for (const s of role.skills) {
    const key = SKILL_MAP[s];
    if (key) dtoTemplate.skills[key] += 1;
  }

  // Trope (optional)
  if (base.trope) {
    const trope = findTrope(base.trope);
    if (trope) {
      const tAttr =
        trope.attribute
          ? ATTR_MAP[trope.attribute]
          : (base.tropeAttribute ? base.tropeAttribute : undefined);
      if (tAttr) dtoTemplate.attributes[tAttr] += 1;
      for (const s of trope.skills) {
        const key = SKILL_MAP[s];
        if (key) dtoTemplate.skills[key] += 1;
      }
    }
  }

  // Age → feats count rules from your requested flow:
  // Adult: choose 2 feats
  // Young: choose 1 feat + auto "Too Young to Die"
  // Old:   choose 3 feats and start with 2 lethal bullets filled
  const chosen = [...base.selectedFeats];
  if (base.age === "Young") {
    // ensure auto TYtD is in list
    if (!chosen.includes("Too Young to Die")) chosen.unshift("Too Young to Die");
  } else if (base.age === "Old") {
    dtoTemplate.deathRoulette = [true, true, false, false, false, false];
  }
  dtoTemplate.feats = chosen.slice(0, 6);

  // Two extra skill bumps (+1 each; enforce unique)
  const uniq = Array.from(new Set(base.skillBumps)).slice(0, 2);
  for (const k of uniq) dtoTemplate.skills[k] = Math.min(6, dtoTemplate.skills[k] + 1);

  // Gear → simple “name-only” gun/gear entries; you can enhance tags/ranges later if you want
  if (base.gearChosen?.length) {
    dtoTemplate.storage.gunsAndGear = base.gearChosen.map(name => ({ name, tags: [], ranges: {} }));
  }

  return dtoTemplate;
}

export function featsAllowanceByAge(age: "Young"|"Adult"|"Old") {
  return age === "Young" ? { picks: 1, auto: ["Too Young to Die"] }
       : age === "Old"   ? { picks: 3, auto: [] }
                         : { picks: 2, auto: [] };
}

export function roleOptionLists(roleName: string){
  const r = findRole(roleName);
  if (!r) return { jobs:[], flaws:[], catchphrases:[], gear:[] };
  return {
    jobs: r.jobs_options ?? [],
    flaws: r.flaws_options ?? [],
    catchphrases: r.catchphrases_options ?? [],
    gear: r.gear_options ?? [],
  };
}
