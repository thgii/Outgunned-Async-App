import { z } from "zod";

export const ATTRS = ["brawn","nerves","smooth","focus","crime"] as const;
export const SKILLS = [
  "endure","fight","force","stunt",
  "cool","drive","shoot","survival",
  "flirt","leadership","speech","style",
  "detect","fix","heal","know",
  "awareness","dexterity","stealth","streetwise"
] as const;

export type AttrKey = typeof ATTRS[number];
export type SkillKey = typeof SKILLS[number];

const _0to6 = z.number().int().min(0).max(6);
const _0to12 = z.number().int().min(0).max(12);

const skillsBlock = z.object(
  Object.fromEntries(SKILLS.map(k => [k, _0to6])) as Record<SkillKey, z.ZodNumber>
);

const attributes = z.object({
  brawn: _0to6, nerves: _0to6, smooth: _0to6, focus: _0to6, crime: _0to6,
});

const youLookEnum = z.enum(["Hurt","Tired","Nervous","LikeAFool","Distracted","Scared"]);

export const characterSchema = z.object({
  id: z.string().uuid().optional(),

  // Identity
  name: z.string().min(1),
  role: z.string().min(1),
  trope: z.string().optional().default(""),
  jobOrBackground: z.string().optional().default(""),
  age: z.enum(["Young","Adult","Old"]).default("Adult"),
  flaw: z.string().optional().default(""),
  catchphrase: z.string().optional().default(""),

  // Attributes + Skills
  attributes,
  skills: skillsBlock,

  // Resources
  grit: z
  .object({
    current: _0to12.default(0),
    max: _0to12.default(12),
  })
  .default({ current: 0, max: 12 }),
  adrenaline: _0to6.default(0),
  spotlight: _0to6.default(0),
  luck: _0to6.default(0),

  experiences: z.array(z.string()).default([]),
  feats: z.array(z.string()).max(6).default([]),

  // You Look + Broken
  youLookSelected: z.array(youLookEnum).max(6).default([]),
  isBroken: z.boolean().default(false),

  // Death Roulette (1..6 lethal flags)
  deathRoulette: z.tuple([z.boolean(),z.boolean(),z.boolean(),z.boolean(),z.boolean(),z.boolean()])
                 .default([false,false,false,false,false,false]),

  // Inventory
  cash: z.number().int().min(0).max(5).default(1),
  storage: z
  .object({
    backpack: z.array(z.string()).default([]),
    bag: z.array(z.string()).default([]),
    gunsAndGear: z
      .array(
        z.object({
          name: z.string(),
          tags: z.array(z.string()).default([]),
          ranges: z
            .object({
              melee: z.string().optional(),
              close: z.string().optional(),
              medium: z.string().optional(),
              long: z.string().optional(),
            })
            .partial(),
        })
      )
      .default([]),
  })
  .default({ backpack: [], bag: [], gunsAndGear: [] }),

ride: z
  .object({
    name: z.string().optional().default(""),
    speed: z.number().int().min(0).max(5).optional().default(0),
    armor: z.number().int().min(0).max(5).optional().default(0),
    tags: z.array(z.string()).default([]),
  })
  .default({ name: "", speed: 0, armor: 0, tags: [] }),

  // Notes
  missionOrTreasure: z.string().optional().default(""),
  achievementsBondsScarsReputations: z.string().optional().default(""),

  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type CharacterDTO = z.infer<typeof characterSchema>;

export function normalizeYouLook(dto: CharacterDTO): CharacterDTO {
  const unique = Array.from(new Set(dto.youLookSelected));
  const isBroken = unique.length >= 3 ? true : dto.isBroken;
  return { ...dto, youLookSelected: unique, isBroken };
}
