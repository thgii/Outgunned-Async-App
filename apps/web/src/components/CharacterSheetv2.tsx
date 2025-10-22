import React, { useEffect, useMemo, useState } from "react";
import { FEAT_DESC } from "../data/wizard";

/** Types aligned to your DTO (kept permissive for safety) */
type Meter = { current?: number; max?: number };

type GearItem =
  | string
  | { name: string; tags?: string[]; ranges?: Record<string, string | undefined> };

type CharacterDTO = {
  id: string;
  name: string;
  role: string;
  trope?: string;
  jobOrBackground?: string;
  age?: "Young" | "Adult" | "Old" | string;
  catchphrase?: string;
  flaw?: string;

  attributes?: Partial<Record<"brawn" | "nerves" | "smooth" | "focus" | "crime", number>>;
  skills?: Partial<
    Record<
      | "endure"
      | "fight"
      | "force"
      | "stunt"
      | "cool"
      | "drive"
      | "shoot"
      | "survival"
      | "flirt"
      | "leadership"
      | "speech"
      | "style"
      | "detect"
      | "fix"
      | "heal"
      | "know"
      | "awareness"
      | "dexterity"
      | "stealth"
      | "streetwise",
      number
    >
  >;

  grit?: Meter;
  adrenaline?: number;
  spotlight?: number;
  luck?: number;

  youLookSelected?: Array<"Hurt" | "Tired" | "Nervous" | "LikeAFool" | "Distracted" | "Scared">;
  isBroken?: boolean;

  deathRoulette?: [boolean, boolean, boolean, boolean, boolean, boolean];

  /** Preferred top-level storage */
  storage?: {
    gunsAndGear?: Array<{ name: string; tags?: string[]; ranges?: Record<string, string | undefined> }>;
    backpack?: string[];
    bag?: string[];
  };

  /** Some older/newer records keep storage inside resources */
  resources?: {
    storage?: {
      gunsAndGear?: Array<{ name: string; tags?: string[]; ranges?: Record<string, string | undefined> }>;
      backpack?: string[];
      bag?: string[];
    };
    grit?: Meter;
    adrenaline?: number;
    spotlight?: number;
    luck?: number;
    cash?: number;
    ride?: string;
    youLookSelected?: CharacterDTO["youLookSelected"];
    isBroken?: boolean;
    deathRoulette?: CharacterDTO["deathRoulette"];
  };

  /** Some data sets store gear as a top-level array; we’ll support that too. */
  gear?: GearItem[];

  cash?: number;

  // Ride can be string (preferred) or an object with name
  ride?: string | { name?: string; speed?: number; armor?: number; tags?: string[] };

  feats?: Array<string | { name: string; description?: string }>;
  notes?: string;
};

/** ---------- Small UI bits ---------- */
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg font-semibold tracking-wide text-zinc-800">{children}</h2>
);
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ${className || ""}`}>{children}</div>
);
const Labeled: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className,
}) => (
  <label className={`flex flex-col gap-1 ${className || ""}`}>
    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
    {children}
  </label>
);
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`h-9 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-indigo-500 ${props.className || ""}`}
  />
);
const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    className={`min-h-[84px] rounded-xl border border-zinc-300 bg-white p-3 text-sm text-zinc-900 outline-none focus:border-indigo-500 ${props.className || ""}`}
  />
);

function ToggleBox({
  checked,
  onChange,
  label,
  emphasis,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  emphasis?: "bad" | "hot";
}) {
  const base =
    "inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md border text-[10px] font-bold cursor-pointer select-none transition";
  const styles = checked ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-zinc-300 text-zinc-700 hover:border-indigo-400";
  const emph = emphasis === "bad" ? "ring-2 ring-red-500" : emphasis === "hot" ? "ring-2 ring-orange-500" : "";
  return (
    <button
      type="button"
      className={`${base} ${styles} ${emph}`}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      title={label}
    >
      {label ?? ""}
    </button>
  );
}

const BoxRow: React.FC<{
  count: number;
  value: number;
  onChange: (n: number) => void;
  specials?: Record<number, { label?: string; emphasis?: "bad" | "hot" }>;
  grow?: boolean;
}> = ({ count, value, onChange, specials, grow }) => (
  <div className={`flex ${grow ? "flex-wrap" : ""} gap-1`}>
    {Array.from({ length: count }, (_, i) => {
      const idx = i + 1;
      return (
        <ToggleBox
          key={idx}
          checked={value >= idx}
          onChange={(v) => onChange(v ? idx : idx - 1)}
          label={specials?.[idx]?.label}
          emphasis={specials?.[idx]?.emphasis}
        />
      );
    })}
  </div>
);

/** Visual grouping */
const ATTR_GROUPS: Record<"Brawn" | "Nerves" | "Smooth" | "Focus" | "Crime", string[]> = {
  Brawn: ["endure", "fight", "force", "stunt"],
  Nerves: ["cool", "drive", "shoot", "survival"],
  Smooth: ["flirt", "leadership", "speech", "style"],
  Focus: ["detect", "fix", "heal", "know"],
  Crime: ["awareness", "dexterity", "stealth", "streetwise"],
};

/** --- helpers --- */
function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return (v as any[])
      .map((it) => {
        if (typeof it === "string") return it;
        if (it && typeof it === "object" && "name" in (it as any)) return String((it as any).name ?? "");
        return typeof it === "number" ? String(it) : "";
      })
      .filter(Boolean);
  }
  if (typeof v === "string") return [v];
  if (v && typeof v === "object" && "name" in (v as any)) return [String((v as any).name ?? "")].filter(Boolean);
  if (v && typeof v === "object") {
    try {
      return Object.values(v as Record<string, unknown>).flatMap(asStringArray);
    } catch {
      return [];
    }
  }
  return [];
}

function getMaybeName(v: any): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "object") return v.name ?? v.value ?? v.label ?? undefined;
  if (typeof v === "string") return v || undefined;
  return String(v);
}

export default function CharacterSheetV2({
  value,
  onChange,
}: {
  value: CharacterDTO | null | undefined; // accepts undefined during first render
  onChange: (c: CharacterDTO) => void;
}) {
  // Guard against the very first render while the route is still loading
  if (!value) return null;

  // Hydrate safe defaults + mirror counters into resources for a consistent local view
  const safe: CharacterDTO = {
    ...value,
    grit: value.grit ?? (value as any)?.resources?.grit ?? { current: 0, max: 12 },
    adrenaline: value.adrenaline ?? (value as any)?.resources?.adrenaline ?? 0,
    spotlight: value.spotlight ?? (value as any)?.resources?.spotlight ?? 0,
    luck: value.luck ?? (value as any)?.resources?.luck ?? 0,
    cash: value.cash ?? (value as any)?.resources?.cash ?? 0,
    // If ride is only in resources (string), bubble it up for the input
    ride: value.ride ?? (value as any)?.resources?.ride ?? value.ride,
    resources: {
      ...((value as any)?.resources ?? {}),
      grit: (value as any)?.resources?.grit ?? (value.grit ?? { current: 0, max: 12 }),
      adrenaline: (value as any)?.resources?.adrenaline ?? (value.adrenaline ?? 0),
      spotlight: (value as any)?.resources?.spotlight ?? (value.spotlight ?? 0),
      luck: (value as any)?.resources?.luck ?? (value.luck ?? 0),
      cash: (value as any)?.resources?.cash ?? (value.cash ?? 0),
      ride:
        (typeof value.ride === "string" ? value.ride : getMaybeName(value.ride)) ??
        (value as any)?.resources?.ride,
    },
  };

  const [local, setLocal] = useState<CharacterDTO>(safe);
  useEffect(() => setLocal(safe), [value?.id]);

  const update = (patch: Partial<CharacterDTO>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };
  const pathUpdate = <K extends keyof CharacterDTO>(key: K, v: CharacterDTO[K]) => update({ [key]: v } as any);

  /** ---------- Header bindings ---------- */
  const setHeader =
    (k: keyof CharacterDTO) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      pathUpdate(k, e.target.value as any);

  /** ---------- Grit / Adrenaline / Spotlight ---------- */
  const gritCurrent = Math.max(0, Math.min(12, local.grit?.current ?? 0));
  const setGrit = (n: number) => {
    const clamped = Math.max(0, Math.min(12, n));
    update({
      grit: { current: clamped, max: 12 },
      resources: { ...(local.resources ?? {}), grit: { current: clamped, max: 12 } },
    });
  };

  // Treat adrenaline and luck as the same pool for reading
  const adrenaline = Math.max(0, Math.min(6, (local.adrenaline ?? local.luck ?? 0)));

  const setAdrenaline = (n: number) => {
    const clamped = Math.max(0, Math.min(6, n));
    update({
      adrenaline: clamped,
      luck: clamped,
      resources: { ...(local.resources ?? {}), adrenaline: clamped, luck: clamped },
    });
  };


  const spotlight = Math.max(0, Math.min(3, local.spotlight ?? 0));
  const setSpotlight = (n: number) => {
    const clamped = Math.max(0, Math.min(3, n));
    update({
      spotlight: clamped,
      resources: { ...(local.resources ?? {}), spotlight: clamped },
    });
  };

  /** ---------- Death Roulette ---------- */
  const death = (local.deathRoulette ?? [false, false, false, false, false, false]).slice() as boolean[];
  const deathValue = death.reduce((acc, v) => acc + (v ? 1 : 0), 0);
  const setDeathFromCount = (n: number) => {
    const next = Array.from({ length: 6 }, (_, i) => i < n);
    update({
      deathRoulette: next as any,
      resources: { ...(local.resources ?? {}), deathRoulette: next as any },
    });
  };

  /** ---------- You Look ---------- */
  const youLookSelected = new Set(local.youLookSelected ?? []);
  const isBroken = !!local.isBroken;
  const toggleYouLook =
    (k: "Hurt" | "Tired" | "Nervous" | "LikeAFool" | "Distracted" | "Scared") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = new Set(youLookSelected);
      if (e.target.checked) next.add(k);
      else next.delete(k);
      const arr = Array.from(next);
      update({
        youLookSelected: arr,
        isBroken,
        resources: { ...(local.resources ?? {}), youLookSelected: arr, isBroken },
      });
    };

  /** ---------- Attributes + Skills ---------- */
  const setAttr =
    (k: keyof NonNullable<CharacterDTO["attributes"]>) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = Math.max(0, Number(e.target.value || 0));
      pathUpdate("attributes", { ...(local.attributes ?? {}), [k]: n });
    };
  const setSkill =
    (k: keyof NonNullable<CharacterDTO["skills"]>) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = Math.max(0, Number(e.target.value || 0));
      pathUpdate("skills", { ...(local.skills ?? {}), [k]: n });
    };

  /** ---------- Storage ---------- */
  const topStorage = local.storage;
  const resStorage = local.resources?.storage;
  const effectiveStorage = topStorage ?? resStorage ?? {};

  // Character portrait (data URL)
const portrait =
  (effectiveStorage as any)?.portrait ??
  (local.storage as any)?.portrait ??
  (local.resources?.storage as any)?.portrait ??
  null;

// Helper to update portrait in both top-level storage and resources.storage
function setPortrait(nextDataUrl: string | null) {
  const nextStorage = { ...(effectiveStorage || {}), portrait: nextDataUrl ?? undefined };
  update({
    storage: nextStorage,
    resources: { ...(local.resources ?? {}), storage: nextStorage },
  });
}

// File input handler for portrait replacement
function onPortraitFile(e: React.ChangeEvent<HTMLInputElement>) {
  const f = e.target.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => setPortrait(String(reader.result || ""));
  reader.readAsDataURL(f);
}


  const asStringArrayLocal = asStringArray;

  const gearNamesFromTop = asStringArrayLocal(local.gear);
  const gearNamesFromStorage = asStringArrayLocal(effectiveStorage.gunsAndGear);
  const mergedGearNames = useMemo(() => {
    const set = new Set<string>([...gearNamesFromTop, ...gearNamesFromStorage]);
    return Array.from(set);
  }, [local.gear, effectiveStorage.gunsAndGear]);

  const gunsAndGearText = mergedGearNames.join("\n");

  const setGunsAndGearText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const nextStorage = { ...(effectiveStorage || {}), gunsAndGear: lines.map((name) => ({ name })) };
    update({
      gear: lines,
      storage: nextStorage,
      resources: { ...(local.resources ?? {}), storage: nextStorage },
    });
  };

  const offPersonText = ((effectiveStorage?.bag ?? []) as string[]).join("\n");
  const setOffPersonText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const nextStorage = { ...(effectiveStorage || {}), bag: lines };
    update({
      storage: nextStorage,
      resources: { ...(local.resources ?? {}), storage: nextStorage },
    });
  };

  const backpackText = ((effectiveStorage?.backpack ?? []) as string[]).join("\n");
  const setBackpackText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const nextStorage = { ...(effectiveStorage || {}), backpack: lines };
    update({
      storage: nextStorage,
      resources: { ...(local.resources ?? {}), storage: nextStorage },
    });
  };

  /** ---------- Money & Ride ---------- */
  const cash = Number.isFinite(local.cash) ? Number(local.cash) : 0;
  const setCash = (e: React.ChangeEvent<HTMLInputElement>) =>
    update({
      cash: Math.max(0, Number(e.target.value || 0)),
      resources: { ...(local.resources ?? {}), cash: Math.max(0, Number(e.target.value || 0)) },
    });

  // Read ride from top-level or resources, accept string or {name}
  const rideString =
    (typeof local.ride === "string" ? local.ride : local.ride?.name) ??
    (local.resources?.ride as string | undefined) ??
    "";
  const setRideString = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    update({
      // top-level ride: keep it a plain string for easier mapping
      ride: val,
      // also mirror under resources.ride so it's visible after reloads
      resources: { ...(local.resources ?? {}), ride: val },
    });
  };

  // Feats already include descriptions in the DTO
  const feats = (local.feats ?? []).map((f) => {
    if (typeof f === "string") {
      const name = f;
      return { name, description: FEAT_DESC[name] || "" };
    }
    const name = (f as any).name;
    const description = (f as any).description || FEAT_DESC[name] || "";
    return { name, description };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      {/* Header */}
      <Card className="p-5">
        <SectionTitle>Character</SectionTitle>

        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Portrait column */}
          <div className="flex flex-col items-start gap-2">
            <div className="h-40 w-40 rounded-xl border bg-zinc-100 overflow-hidden flex items-center justify-center">
              {portrait ? (
                <img
                  src={portrait}
                  alt={`${local.name || "Character"} portrait`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs text-zinc-500 px-2 text-center">No portrait</span>
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={onPortraitFile}
              className="text-sm"
            />

            {portrait && (
              <button
                type="button"
                onClick={() => setPortrait(null)}
                className="text-xs text-red-600 hover:underline"
              >
                Remove portrait
              </button>
            )}
          </div>

          {/* Identity fields */}
          <div className="md:col-span-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Labeled label="Name">
              <Input
                value={local.name || ""}
                onChange={setHeader("name")}
                placeholder="Name"
              />
            </Labeled>

            <Labeled label="Role">
              <Input
                value={local.role || ""}
                onChange={setHeader("role")}
                placeholder="Role"
              />
            </Labeled>

            <Labeled label="Trope">
              <Input
                value={local.trope || ""}
                onChange={setHeader("trope")}
                placeholder="Trope"
              />
            </Labeled>

            <Labeled label="Job">
              <Input
                value={local.jobOrBackground || ""}
                onChange={setHeader("jobOrBackground")}
                placeholder="Job/Background"
              />
            </Labeled>

            <Labeled label="Age">
              <Input
                value={local.age || ""}
                onChange={setHeader("age")}
                placeholder="Young / Adult / Old"
              />
            </Labeled>

            <Labeled label="Flaw">
              <Input
                value={local.flaw || ""}
                onChange={setHeader("flaw")}
                placeholder="Flaw"
              />
            </Labeled>

            <Labeled label="Catchphrase" className="md:col-span-3">
              <Input
                value={local.catchphrase || ""}
                onChange={setHeader("catchphrase")}
                placeholder={`"I’ve had worse!"`}
              />
            </Labeled>
          </div>
        </div>
      </Card>


      {/* Middle: Left (Attributes+Skills) & Right (Grit + Feats) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Combined Attributes + Skills */}
        <Card>
          <SectionTitle>Attributes & Skills</SectionTitle>
          <div className="mt-4 space-y-6">
            {(
              [
                ["Brawn", "brawn"],
                ["Nerves", "nerves"],
                ["Smooth", "smooth"],
                ["Focus", "focus"],
                ["Crime", "crime"],
              ] as const
            ).map(([label, key]) => (
              <div key={key} className="rounded-xl border border-zinc-200 p-3">
                <div className="mb-3 flex items-end gap-3">
                  <div className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{label}</div>
                  <Input
                    type="number"
                    min={0}
                    value={(local.attributes?.[key as keyof NonNullable<CharacterDTO["attributes"]>] ?? 0) as number}
                    onChange={setAttr(key as keyof NonNullable<CharacterDTO["attributes"]>)}
                    className="h-8 w-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ATTR_GROUPS[label as keyof typeof ATTR_GROUPS].map((sk) => (
                    <Labeled key={sk} label={sk[0].toUpperCase() + sk.slice(1)}>
                      <Input
                        type="number"
                        min={0}
                        value={(local.skills?.[sk as keyof NonNullable<CharacterDTO["skills"]>] ?? 0) as number}
                        onChange={setSkill(sk as keyof NonNullable<CharacterDTO["skills"]>)}
                      />
                    </Labeled>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right: Grit + Feats */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <SectionTitle>Grit</SectionTitle>
              <span className="text-sm text-zinc-500">{gritCurrent} / 12</span>
            </div>
            <div className="mt-3">
              <BoxRow
                count={12}
                value={gritCurrent}
                onChange={setGrit}
                specials={{ 8: { label: "BAD!", emphasis: "bad" }, 12: { label: "HOT!", emphasis: "hot" } }}
                grow
              />
              <p className="mt-3 text-xs text-zinc-700">
                <strong>BAD:</strong> Suffer a condition. <strong>HOT:</strong> Gain 2 Adrenaline.
              </p>
            </div>
          </Card>

          <Card>
            <SectionTitle>Feats</SectionTitle>
            <div className="mt-3 space-y-2">
              {(feats.length ? feats : [{ name: "—" }]).map((f, i) => (
                <div key={`${(f as any).name}-${i}`} className="rounded-lg border border-zinc-200 p-3">
                  <div className="font-medium text-zinc-800">{(f as any).name}</div>
                  {(f as any).description ? (
                    <div className="mt-1 whitespace-pre-line text-sm text-zinc-600">{(f as any).description}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Adrenaline + Spotlight */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <SectionTitle>Adrenaline/Luck</SectionTitle>
          <div className="mt-3">
            <BoxRow count={6} value={adrenaline} onChange={setAdrenaline} />
            <p className="mt-3 text-xs text-zinc-700">
              <strong>1:</strong> Gain +1 to a roll, <strong>6:</strong> Take the Spotlight
            </p>
          </div>
        </Card>
        <Card>
          <SectionTitle>Spotlight</SectionTitle>
          <div className="mt-3">
            <BoxRow count={3} value={spotlight} onChange={setSpotlight} />
          </div>
        </Card>
      </div>

      {/* You Look + Death Roulette */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <SectionTitle>You Look</SectionTitle>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                ["Hurt", "Hurt"],
                ["Nervous", "Nervous"],
                ["Like a Fool", "LikeAFool"],
                ["Distracted", "Distracted"],
                ["Scared", "Scared"],
                ["Tired", "Tired"],
              ] as const
            ).map(([label, key]) => (
              <label key={key} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-indigo-600"
                  checked={youLookSelected.has(key as any)}
                  onChange={toggleYouLook(key as any)}
                />
                <span className="text-[15px] font-medium text-zinc-800">{label}</span>
              </label>
            ))}
            <label className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
              <input
                type="checkbox"
                className="h-5 w-5 accent-indigo-600"
                checked={isBroken}
                onChange={(e) =>
                  update({
                    isBroken: e.target.checked,
                    resources: { ...(local.resources ?? {}), isBroken: e.target.checked },
                  })
                }
              />
              <span className="text-[15px] font-medium text-zinc-800">Broken</span>
            </label>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <SectionTitle>Death Roulette</SectionTitle>
            <span className="text-sm text-zinc-500">{deathValue} / 6</span>
          </div>
          <div className="mt-3">
            <BoxRow count={6} value={deathValue} onChange={setDeathFromCount} />
          </div>
        </Card>
      </div>

      {/* Storage & Resources */}
      <Card>
        <SectionTitle>Storage & Resources</SectionTitle>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Labeled label="Guns & Gear (one per line)">
            <TextArea value={gunsAndGearText} onChange={setGunsAndGearText} placeholder="Pistol&#10;Rope&#10;Compass" />
          </Labeled>

          <Labeled label="Off-Person Storage (one per line)">
            <TextArea value={offPersonText} onChange={setOffPersonText} placeholder="Locker key&#10;Spare ammo" />
          </Labeled>

          <Labeled label="Backpack (one per line)">
            <TextArea value={backpackText} onChange={setBackpackText} placeholder="Rations&#10;Canteen&#10;Flashlight" />
          </Labeled>

          <div className="grid grid-cols-1 gap-4">
            <Labeled label="Cash ($)">
              <Input type="number" min={0} value={cash} onChange={setCash} />
            </Labeled>
            <Labeled label="Ride">
              <Input value={rideString} onChange={setRideString} placeholder="Seaplane, Jeep, etc." />
            </Labeled>
          </div>
        </div>
      </Card>
    </div>
  );
}
