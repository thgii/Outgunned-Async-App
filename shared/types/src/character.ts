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

const Meter = z.object({
  current: z.number().int().min(0).default(0),
  max: z.number().int().min(0).max(12).default(12),
});

// Keep guns/gear permissive but typed
const GunsAndGearItem = z.object({
  name: z.string(),
  tags: z.array(z.string()).optional(),
  ranges: z.record(z.string(), z.string().or(z.undefined())).optional(),
}).strict().passthrough();

const Storage = z.object({
  gunsAndGear: z.array(GunsAndGearItem).default([]),
  backpack: z.array(z.string()).default([]),
  bag: z.array(z.string()).default([]),
})
  .partial()
  .default({ gunsAndGear: [], backpack: [], bag: [] });

/**
 * Use z.object(...).partial() instead of z.record(...).partial()
 * because .partial() is not available on ZodRecord.
 */
const Attributes = z
  .object({
    brawn: z.number().int().min(0).optional(),
    nerves: z.number().int().min(0).optional(),
    smooth: z.number().int().min(0).optional(),
    focus: z.number().int().min(0).optional(),
    crime: z.number().int().min(0).optional(),
  })
  .partial()
  .default({});

const Skills = z
  .object({
    endure: z.number().int().min(0).optional(),
    fight: z.number().int().min(0).optional(),
    force: z.number().int().min(0).optional(),
    stunt: z.number().int().min(0).optional(),
    cool: z.number().int().min(0).optional(),
    drive: z.number().int().min(0).optional(),
    shoot: z.number().int().min(0).optional(),
    survival: z.number().int().min(0).optional(),
    flirt: z.number().int().min(0).optional(),
    leadership: z.number().int().min(0).optional(),
    speech: z.number().int().min(0).optional(),
    style: z.number().int().min(0).optional(),
    detect: z.number().int().min(0).optional(),
    fix: z.number().int().min(0).optional(),
    heal: z.number().int().min(0).optional(),
    know: z.number().int().min(0).optional(),
    awareness: z.number().int().min(0).optional(),
    dexterity: z.number().int().min(0).optional(),
    stealth: z.number().int().min(0).optional(),
    streetwise: z.number().int().min(0).optional(),
  })
  .partial()
  .default({});

const FeatNameOrObj = z.union([
  z.string(),
  z.object({ name: z.string(), description: z.string().optional() }).strict().passthrough(),
]);

const YouLook = z.enum(["Hurt","Tired","Nervous","LikeAFool","Distracted","Scared"]);

export const characterSchema = z.object({
  id: z.string().uuid().optional(),

  // identity
  name: z.string().min(1),
  role: z.string().min(1),
  trope: z.string().optional().default(""),
  age: z.enum(["Young","Adult","Old"]).optional().default("Adult"),

  // flavor
  jobOrBackground: z.string().optional().default(""),
  catchphrase: z.string().optional().default(""),
  flaw: z.string().optional().default(""),

  // numbers
  attributes: Attributes,
  skills: Skills,

  // resources – top-level
  grit: Meter.optional().default({ current: 0, max: 12 }),
  adrenaline: z.number().int().min(0).optional().default(0),
  spotlight: z.number().int().min(0).optional().default(0),
  luck: z.number().int().min(0).optional().default(0),
  cash: z.number().int().min(0).optional().default(0),

  feats: z.array(FeatNameOrObj).optional().default([]),
  storage: Storage.optional().default({ gunsAndGear: [], backpack: [], bag: [] }),

  // allow nested 'resources' shape as legacy input
  resources: z.object({
    grit: Meter.optional(),
    adrenaline: z.number().int().min(0).optional(),
    spotlight: z.number().int().min(0).optional(),
    luck: z.number().int().min(0).optional(),
    cash: z.number().int().min(0).optional(),
    storage: Storage.optional(),
  }).partial().optional(),

  youLookSelected: z.array(YouLook).optional().default([]),
  isBroken: z.boolean().optional().default(false),
  deathRoulette: z
    .tuple([z.boolean(),z.boolean(),z.boolean(),z.boolean(),z.boolean(),z.boolean()])
    .optional()
    .default([false,false,false,false,false,false]),
  achievementsBondsScarsReputations: z.string().optional().default(""),

  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).transform((dto) => {
  // prefer top-level resources; fall back to nested resources
  const r = (dto as any).resources ?? {};
  return {
    ...dto,
    grit: dto.grit ?? r.grit ?? { current: 0, max: 12 },
    adrenaline: dto.adrenaline ?? r.adrenaline ?? 0,
    spotlight: dto.spotlight ?? r.spotlight ?? 0,
    luck: dto.luck ?? r.luck ?? 0,
    cash: dto.cash ?? r.cash ?? 0,
    storage: dto.storage ?? r.storage ?? { gunsAndGear: [], backpack: [], bag: [] },
  };
});

export type CharacterDTO = z.infer<typeof characterSchema>;

/**
 * Guard that the value is an array before deduping.
 */
export function normalizeYouLook(dto: CharacterDTO): CharacterDTO {
  const selected = Array.isArray(dto.youLookSelected) ? dto.youLookSelected : [];
  const unique = Array.from(new Set(selected));
  const isBroken = unique.length >= 3 ? true : dto.isBroken;
  return { ...dto, youLookSelected: unique, isBroken };
}
