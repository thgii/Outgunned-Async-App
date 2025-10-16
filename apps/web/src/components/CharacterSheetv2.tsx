import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

//
/** Types aligned to your DTO (loose to tolerate partials) */
type Meter = { current?: number; max?: number };
type CharacterDTO = {
  id: string;
  name: string;
  role: string;
  trope?: string;
  jobOrBackground?: string;
  age?: "Young"|"Adult"|"Old";
  catchphrase?: string;
  flaw?: string;

  attributes?: Partial<Record<"brawn"|"nerves"|"smooth"|"focus"|"crime", number>>;
  skills?: Partial<Record<
    | "endure"|"fight"|"force"|"stunt"
    | "cool"|"drive"|"shoot"|"survival"
    | "flirt"|"leadership"|"speech"|"style"
    | "detect"|"fix"|"heal"|"know"
    | "awareness"|"dexterity"|"stealth"|"streetwise", number
  >>;

  grit?: Meter;
  adrenaline?: number;
  spotlight?: number;
  luck?: number;

  youLookSelected?: Array<"Hurt"|"Tired"|"Nervous"|"LikeAFool"|"Distracted"|"Scared">;
  isBroken?: boolean;

  deathRoulette?: [boolean,boolean,boolean,boolean,boolean,boolean];

  storage?: {
    gunsAndGear?: Array<{ name: string; tags?: string[]; ranges?: Record<string,string|undefined> }>;
    backpack?: string[];
    bag?: string[];
  };

  cash?: number;

  ride?: { name?: string; speed?: number; armor?: number; tags?: string[] };

  feats?: string[];
  notes?: string;
};

type Props = {
  character: CharacterDTO;
  onChange: (next: CharacterDTO) => void; // we call this after every edit
};

/** UI helpers */
const SectionTitle: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <h2 className="text-lg font-semibold tracking-wide text-zinc-800">{children}</h2>
);
const Card: React.FC<{children: React.ReactNode; className?: string}> = ({ children, className }) => (
  <div className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ${className||""}`}>{children}</div>
);
const Labeled: React.FC<{label: string; children: React.ReactNode; className?: string}> = ({ label, children, className }) => (
  <label className={`flex flex-col gap-1 ${className||""}`}>
    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
    {children}
  </label>
);
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className={`h-9 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-indigo-500 ${props.className||""}`} />
);
const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea {...props} className={`min-h-[84px] rounded-xl border border-zinc-300 bg-white p-3 text-sm text-zinc-900 outline-none focus:border-indigo-500 ${props.className||""}`} />
);

function ToggleBox({ checked, onChange, label, emphasis }: {
  checked: boolean; onChange: (v: boolean)=>void; label?: string; emphasis?: "bad"|"hot";
}) {
  const base = "inline-flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-bold cursor-pointer select-none transition";
  const styles = checked ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-zinc-300 text-zinc-600 hover:border-indigo-400";
  const emph  = emphasis==="bad" ? "ring-2 ring-red-500" : emphasis==="hot" ? "ring-2 ring-orange-500" : "";
  return (
    <button type="button" className={`${base} ${styles} ${emph}`} aria-pressed={checked} onClick={()=>onChange(!checked)} title={label}>
      {label ?? ""}
    </button>
  );
}

const BoxRow: React.FC<{ count: number; value: number; onChange: (n:number)=>void; specials?: Record<number,{label?:string;emphasis?:"bad"|"hot"}>; grow?: boolean; }> =
({ count, value, onChange, specials, grow }) => (
  <div className={`flex ${grow?"flex-wrap":""} gap-2`}>
    {Array.from({length:count},(_,i)=>{
      const idx = i+1;
      const special = specials?.[idx];
      return (
        <ToggleBox
          key={idx}
          checked={value >= idx}
          onChange={(v)=>onChange(v?idx:idx-1)}
          label={special?.label}
          emphasis={special?.emphasis}
        />
      );
    })}
  </div>
);

/** Visual grouping */
const ATTR_GROUPS: Record<"Brawn"|"Nerves"|"Smooth"|"Focus"|"Crime", string[]> = {
  Brawn: ["endure","fight","force","stunt"],
  Nerves:["cool","drive","shoot","survival"],
  Smooth:["flirt","leadership","speech","style"],
  Focus: ["detect","fix","heal","know"],
  Crime: ["awareness","dexterity","stealth","streetwise"],
};

export default function CharacterSheetV2({ character, onChange }: Props) {
  const [local, setLocal] = useState<CharacterDTO>(character);
  useEffect(()=>setLocal(character), [character?.id]);

  const update = (patch: Partial<CharacterDTO>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };
  const pathUpdate = <K extends keyof CharacterDTO>(key: K, value: CharacterDTO[K]) => update({ [key]: value } as Partial<CharacterDTO>);

  // Header bindings (top section)
  const setHeader = (k: keyof CharacterDTO) => (e: React.ChangeEvent<HTMLInputElement>) => pathUpdate(k as any, e.target.value as any);

  // Grit (0..12)
  const gritCurrent = Math.max(0, Math.min(12, local.grit?.current ?? 0));
  const setGrit = (n: number) => pathUpdate("grit", { current: Math.max(0, Math.min(12, n)), max: 12 });

  // Adrenaline (0..6)
  const adrenaline = Math.max(0, Math.min(6, local.adrenaline ?? 0));
  const setAdrenaline = (n:number)=> pathUpdate("adrenaline", Math.max(0, Math.min(6, n)));

  // Spotlight (UI shows 0..3 even though schema allows up to 6)
  const spotlight = Math.max(0, Math.min(3, local.spotlight ?? 0));
  const setSpotlight = (n:number)=> pathUpdate("spotlight", Math.max(0, Math.min(3, n)));

  // Death Roulette (6 booleans)
  const death = (local.deathRoulette ?? [false,false,false,false,false,false]).slice() as boolean[];
  const deathValue = death.reduce((acc, v)=> acc + (v?1:0), 0);
  const setDeathFromCount = (n:number) => {
    const next = Array.from({length:6}, (_,i)=> i<n);
    pathUpdate("deathRoulette", next as any);
  };

  // You Look (6 + Broken as its own boolean)
  const youLookSelected = new Set(local.youLookSelected ?? []);
  const isBroken = !!local.isBroken;
  const toggleYouLook = (k: "Hurt"|"Tired"|"Nervous"|"LikeAFool"|"Distracted"|"Scared") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = new Set(youLookSelected);
    if (e.target.checked) next.add(k); else next.delete(k);
    pathUpdate("youLookSelected", Array.from(next));
  };

  // Attributes & Skills (lowercase keys in DTO)
  const setAttr = (k: keyof NonNullable<CharacterDTO["attributes"]>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Math.max(0, Number(e.target.value || 0));
    pathUpdate("attributes", { ...(local.attributes ?? {}), [k]: n });
  };
  const setSkill = (k: keyof NonNullable<CharacterDTO["skills"]>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Math.max(0, Number(e.target.value || 0));
    pathUpdate("skills", { ...(local.skills ?? {}), [k]: n });
  };

  // Storage sections
  const gunsAndGearText = (local.storage?.gunsAndGear ?? []).map(g => g.name).join("\n");
  const setGunsAndGearText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const list = lines.map(name => ({ name, tags: [] as string[], ranges: {} as Record<string,string> }));
    pathUpdate("storage", { ...(local.storage ?? {}), gunsAndGear: list });
  };
  const offPersonText = (local.storage?.bag ?? []).join("\n");
  const setOffPersonText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    pathUpdate("storage", { ...(local.storage ?? {}), bag: lines });
  };
  const cash = Number.isFinite(local.cash) ? local.cash! : 0;
  const setCash = (e: React.ChangeEvent<HTMLInputElement>) => pathUpdate("cash", Math.max(0, Number(e.target.value || 0)));
  const rideName = local.ride?.name ?? "";
  const setRideName = (e: React.ChangeEvent<HTMLInputElement>) => pathUpdate("ride", { ...(local.ride ?? {}), name: e.target.value });

  const feats = local.feats ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      {/* Header */}
      <Card className="p-5">
        <SectionTitle>Character</SectionTitle>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Labeled label="Name"><Input value={local.name||""} onChange={setHeader("name")} placeholder="Name" /></Labeled>
          <Labeled label="Role"><Input value={local.role||""} onChange={setHeader("role")} placeholder="Role" /></Labeled>
          <Labeled label="Trope"><Input value={local.trope||""} onChange={setHeader("trope")} placeholder="Trope" /></Labeled>
          <Labeled label="Job"><Input value={local.jobOrBackground||""} onChange={setHeader("jobOrBackground")} placeholder="Job/Background" /></Labeled>
          <Labeled label="Age"><Input value={local.age||""} onChange={setHeader("age")} placeholder="Young / Adult / Old" /></Labeled>
          <Labeled label="Flaw"><Input value={local.flaw||""} onChange={setHeader("flaw")} placeholder="Flaw" /></Labeled>
          <Labeled label="Catchphrase" className="md:col-span-3"><Input value={local.catchphrase||""} onChange={setHeader("catchphrase")} placeholder={`"I’ve had worse!"`} /></Labeled>
        </div>
      </Card>

      {/* Main split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Attributes + Skills */}
        <div className="space-y-6">
          <Card>
            <SectionTitle>Attributes</SectionTitle>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(["brawn","nerves","smooth","focus","crime"] as const).map((k)=>(
                <Labeled key={k} label={k[0].toUpperCase()+k.slice(1)}>
                  <Input type="number" min={0} value={(local.attributes?.[k] ?? 0)} onChange={setAttr(k)} />
                </Labeled>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle>Skills</SectionTitle>
            <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
              {Object.entries(ATTR_GROUPS).map(([attr, skills])=>(
                <div key={attr}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{attr}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {skills.map((sk)=>(
                      <Labeled key={sk} label={sk[0].toUpperCase()+sk.slice(1)}>
                        <Input type="number" min={0} value={(local.skills?.[sk as keyof NonNullable<CharacterDTO["skills"]>] ?? 0) as number}
                          onChange={setSkill(sk as keyof NonNullable<CharacterDTO["skills"]>)} />
                      </Labeled>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Grit + Feats */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <SectionTitle>Grit</SectionTitle>
              <span className="text-sm text-zinc-500">{gritCurrent} / 12</span>
            </div>
            <div className="mt-3">
              <BoxRow count={12} value={gritCurrent} onChange={setGrit}
                specials={{ 8:{label:"BAD!",emphasis:"bad"}, 12:{label:"HOT!",emphasis:"hot"} }} grow />
              <p className="mt-3 text-xs text-zinc-600">
                <strong>BAD:</strong> Suffer a condition. <strong>HOT:</strong> Gain 2 Adrenaline.
              </p>
            </div>
          </Card>
          <Card>
            <SectionTitle>Feats</SectionTitle>
            <div className="mt-3 space-y-2">
              {(feats.length ? feats : ["—"]).map((f, i)=>(
                <div key={`${f}-${i}`} className="rounded-lg border border-zinc-200 p-3">
                  <div className="font-medium text-zinc-800">{f}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Adrenaline + Spotlight */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <SectionTitle>Adrenaline</SectionTitle>
          <div className="mt-3">
            <BoxRow count={6} value={adrenaline} onChange={setAdrenaline} />
            <p className="mt-3 text-xs text-zinc-600"><strong>1:</strong> Gain +1 to a roll, <strong>6:</strong> Take the Spotlight</p>
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
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(["Hurt","Nervous","LikeAFool","Distracted","Scared","Tired"] as const).map((k)=>(
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-indigo-600"
                  checked={youLookSelected.has(k)} onChange={toggleYouLook(k)} />
                <span>{k==="LikeAFool" ? "Like a Fool" : k}</span>
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-indigo-600"
                checked={isBroken} onChange={(e)=> pathUpdate("isBroken", e.target.checked)} />
              <span>Broken</span>
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

      {/* Storage */}
      <Card>
        <SectionTitle>Storage & Resources</SectionTitle>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Labeled label="Guns & Gear (one per line)">
            <TextArea value={gunsAndGearText} onChange={setGunsAndGearText} placeholder="Pistol&#10;Rope&#10;Compass" />
          </Labeled>
          <Labeled label="Off-Person Storage (one per line)">
            <TextArea value={offPersonText} onChange={setOffPersonText} placeholder="Locker key&#10;Spare ammo" />
          </Labeled>
          <Labeled label="Cash ($)">
            <Input type="number" min={0} value={cash} onChange={setCash} />
          </Labeled>
          <Labeled label="Ride">
            <Input value={rideName} onChange={setRideName} placeholder="Seaplane, Jeep, etc." />
          </Labeled>
        </div>
      </Card>
    </div>
  );
}
