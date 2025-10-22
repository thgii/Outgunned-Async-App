import { useMemo, useState } from "react";
import DiceRoller from "./DiceRoller";

export default function DirectorsDiceRoller() {
  const [attribute, setAttribute] = useState<number>(3);
  const [skill, setSkill] = useState<number>(2);
  const [adrenalineMod, setAdrenalineMod] = useState<number>(0);
  const [conditionsMod, setConditionsMod] = useState<number>(0);
  const [otherMod, setOtherMod] = useState<number>(0);

  const netModifier = useMemo(
    () =>
      Number(adrenalineMod || 0) +
      Number(otherMod || 0) +
      Number(conditionsMod || 0),
    [adrenalineMod, otherMod, conditionsMod]
  );

  return (
    <div className="rounded-xl border border-gray-300 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 p-5 space-y-6 shadow-sm">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Director’s Dice Roller
        </h2>
        <div
          className={[
            "px-2 py-0.5 rounded-full text-xs font-semibold border",
            netModifier > 0
              ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200"
              : netModifier < 0
              ? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200"
              : "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700",
          ].join(" ")}
        >
          Net Modifier: {netModifier >= 0 ? `+${netModifier}` : netModifier}
        </div>
      </header>

      {/* INPUTS */}
      <Section title="Inputs">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Attribute (1-3)">
            <NumberInput
              value={attribute}
              min={1}
              max={3}
              onChange={setAttribute}
            />
          </Field>
          <Field label="Skill (1–3)">
            <NumberInput
              value={skill}
              min={1}
              max={3}
              onChange={setSkill}
            />
          </Field>
        </div>
      </Section>

      {/* MODIFIERS */}
      <Section title="Modifiers">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Adrenaline (+)">
            <NumberInput value={adrenalineMod} onChange={setAdrenalineMod} />
          </Field>

          <Field label="Conditions (−)">
            <NumberInput value={conditionsMod} onChange={setConditionsMod} />
            <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">
              Tip: use negative values (e.g. <code>-1</code> for Distracted).
            </p>
          </Field>

          <Field label="Other (±)">
            <NumberInput value={otherMod} onChange={setOtherMod} />
            <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">
              Help/gear bonuses (+) or situational hindrances (−).
            </p>
          </Field>
        </div>
      </Section>

      <div className="pt-2">
        <DiceRoller
          attribute={attribute}
          skill={skill}
          modifier={netModifier}
          defaultDifficulty="basic"
          canSpendAdrenaline={true}
        />
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
        {title}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-stretch gap-1">
      <button
        type="button"
        className="px-2 rounded border border-gray-400 bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
        onClick={() => onChange(clampNum((value ?? 0) - 1, min, max))}
        title="Decrease"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        className="w-full border border-gray-400 rounded px-2 py-1 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-600"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseInt(e.target.value || '0', 10))}
        min={min}
        max={max}
      />
      <button
        type="button"
        className="px-2 rounded border border-gray-400 bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
        onClick={() => onChange(clampNum((value ?? 0) + 1, min, max))}
        title="Increase"
      >
        +
      </button>
    </div>
  );
}

function clampNum(n: number, min?: number, max?: number) {
  if (typeof min === 'number') n = Math.max(min, n);
  if (typeof max === 'number') n = Math.min(max, n);
  return n;
}
