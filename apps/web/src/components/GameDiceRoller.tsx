import React, { useEffect, useMemo, useState } from "react";
import { getCharacter } from "../lib/api";

// ⬇️ If you have a real DiceRoller component, import it here and delete the stub.
type DiceRollerProps = { dice: number; label?: string; onRolled?: (r: any) => void };
const DiceRoller: React.FC<DiceRollerProps> = ({ dice, label, onRolled }) => (
  <div className="p-3 rounded-xl border bg-white">
    <div className="text-sm opacity-60 mb-1">Dice Roller</div>
    <div className="text-lg font-semibold">{label ?? "Roll"}</div>
    <div className="mt-1">Dice: {dice}</div>
    <button
      className="mt-2 px-3 py-2 rounded bg-black text-white"
      onClick={() => onRolled?.({ ok: true })}
    >
      Roll
    </button>
  </div>
);

type Attr =
  | "Brawn" | "Nerves" | "Smooth" | "Focus" | "Crime";
type Skill =
  | "Endure" | "Fight" | "Force" | "Stunt"
  | "Cool" | "Drive" | "Shoot" | "Survival"
  | "Flirt" | "Leadership" | "Speech" | "Style"
  | "Detect" | "Fix" | "Heal" | "Know"
  | "Awareness" | "Dexterity" | "Stealth" | "Streetwise";

const ATTRS: Attr[] = ["Brawn","Nerves","Smooth","Focus","Crime"];
const SKILLS: Skill[] = [
  "Endure","Fight","Force","Stunt",
  "Cool","Drive","Shoot","Survival",
  "Flirt","Leadership","Speech","Style",
  "Detect","Fix","Heal","Know",
  "Awareness","Dexterity","Stealth","Streetwise",
];

// ——— tolerant getters (mimic CharacterSheet behavior inline, no extra helper file) ———
function grab(obj: any, key: string) {
  if (!obj) return undefined;
  return obj[key] ?? obj[key.toLowerCase?.()] ?? obj[key.toUpperCase?.()];
}
function readNumber(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}
function getAttrValue(character: any, name: Attr): number {
  const c = character ?? {};
  const from =
    grab(c.attributes, name) ??
    grab(c.data?.attributes, name) ??
    c[name] ??
    c[name.toLowerCase?.()];
  return readNumber(from);
}
function getSkillValue(character: any, name: Skill): number {
  const c = character ?? {};
  const from =
    grab(c.skills, name) ??
    grab(c.data?.skills, name) ??
    c[name] ??
    c[name.toLowerCase?.()];
  return readNumber(from);
}

type Props = {
  // Prefer passing the already-loaded hero to avoid refetch.
  hero?: any;
  // Or pass heroId and we'll fetch it.
  heroId?: string;

  defaultAttribute?: Attr; // optional UI default
  defaultSkill?: Skill;    // optional UI default
  bonusDice?: number;      // spotlight/help/etc.
  onRolled?: (result: any) => void;
  compact?: boolean;
};

export const GameDiceRoller: React.FC<Props> = ({
  hero,
  heroId,
  defaultAttribute = "Brawn",
  defaultSkill = "Fight",
  bonusDice = 0,
  onRolled,
  compact = false,
}) => {
  const [loading, setLoading] = useState<boolean>(!hero && !!heroId);
  const [loadedHero, setLoadedHero] = useState<any>(hero ?? null);

  const [attr, setAttr] = useState<Attr>(defaultAttribute);
  const [skill, setSkill] = useState<Skill>(defaultSkill);
  const [tempBonus, setTempBonus] = useState<number>(bonusDice);

  useEffect(() => {
    if (!hero && heroId) {
      let live = true;
      setLoading(true);
      getCharacter(heroId)
        .then((c) => { if (live) setLoadedHero(c); })
        .finally(() => { if (live) setLoading(false); });
      return () => { live = false; };
    }
  }, [hero, heroId]);

  const character = hero ?? loadedHero;

  const { aVal, sVal, pool, label } = useMemo(() => {
    const a = getAttrValue(character, attr);
    const s = getSkillValue(character, skill);
    const total = Math.max(0, a + s + (Number.isFinite(tempBonus) ? tempBonus : 0));
    const lbl = `${attr.toUpperCase()} + ${skill.toUpperCase()}${tempBonus ? ` (+${tempBonus})` : ""}`;
    return { aVal: a, sVal: s, pool: total, label: lbl };
  }, [character, attr, skill, tempBonus]);

  if (loading) return <div className="text-sm opacity-70">Loading hero…</div>;
  if (!character) return <div className="text-red-600">No hero found.</div>;

  const wrap = compact ? "p-2" : "p-3";
  const text = compact ? "text-sm" : "text-base";

  return (
    <div className={`rounded-xl border bg-white/70 ${wrap} flex flex-col gap-2`}>
      <div className={`flex flex-wrap items-center gap-2 ${text}`}>
        <span className="opacity-60">Attribute</span>
        <select className="border rounded px-2 py-1" value={attr} onChange={e => setAttr(e.target.value as Attr)}>
          {ATTRS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <span className="opacity-60 ml-2">Skill</span>
        <select className="border rounded px-2 py-1" value={skill} onChange={e => setSkill(e.target.value as Skill)}>
          {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <span className="opacity-60 ml-2">Bonus</span>
        <input
          type="number"
          className="w-16 border rounded px-2 py-1"
          value={tempBonus}
          onChange={(e) => setTempBonus(Number(e.target.value) || 0)}
        />
      </div>

      <div className={`grid grid-cols-3 gap-2 ${text}`}>
        <div className="rounded bg-gray-100 p-2">
          <div className="opacity-60 text-xs">Attribute</div>
          <div className="font-semibold">{attr}: {aVal}</div>
        </div>
        <div className="rounded bg-gray-100 p-2">
          <div className="opacity-60 text-xs">Skill</div>
          <div className="font-semibold">{skill}: {sVal}</div>
        </div>
        <div className="rounded bg-gray-100 p-2">
          <div className="opacity-60 text-xs">Total Dice</div>
          <div className="font-semibold">{pool}</div>
        </div>
      </div>

      {/* Hand-off to your real DiceRoller */}
      <DiceRoller dice={pool} label={label} onRolled={onRolled} />
    </div>
  );
};
