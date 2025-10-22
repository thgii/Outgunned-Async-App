import { useMemo, useState } from "react";
import DiceRoller from "./DiceRoller";

export default function DirectorsDiceRoller() {
  // Base inputs the Director can change
  const [attribute, setAttribute] = useState<number>(3);
  const [skill, setSkill] = useState<number>(2);

  // Break out modifiers so the Director can see the parts
  const [adrenalineMod, setAdrenalineMod] = useState<number>(0); // + adds dice
  const [conditionsMod, setConditionsMod] = useState<number>(0); // - subtracts dice
  const [otherMod, setOtherMod] = useState<number>(0);           // help/gear/hindrance

  const netModifier = useMemo(
    () =>
      Number(adrenalineMod || 0) +
      Number(otherMod || 0) +
      Number(conditionsMod || 0),
    [adrenalineMod, otherMod, conditionsMod]
  );

  return (
    <div className="rounded-xl border border-gray-300 bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 p-5 space-y-5 shadow-sm">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Director’s Dice Roller</h2>
        <div
          className={[
            "px-2 py-0.5 rounded-full text-xs font-semibold",
            netModifier > 0
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
              : netModifier < 0
              ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
              : "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
          ].join(" ")}
          title="Net modifier applied to Attribute + Skill (adrenaline + other + conditions)"
        >
          Net Modifier: {netModifier >= 0 ? `+${netModifier}` : netModifier}
        </div>
      </header>

      {/* Inputs */}
      <section aria-label="Inputs" className="space-y-3">
        <SectionHeading>Inputs</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Attribute (0–5)">
            <NumberInput
              value={attribute}
              min={0}
              max={5}
              onChange={(v) => setAttribute(v)}
            />
          </Field>

          <Field label="Skill (0–5)">
            <NumberInput
              value={skill}
              min={0}
              max={5}
              onChange={(v) => setSkill(v)}
            />
          </Field>
        </div>
      </section>

      {/* Modifiers */}
      <section aria-label="Modifiers" className="space-y-3">
        <SectionHeading>Modifiers</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Adrenaline (+)">
            <NumberInput
              value={adrenalineMod}
              onChange={(v) => setAdrenalineMod(v)}
            />
          </Field>

          <Field label="Conditions (−)">
            <NumberInput
              value={conditionsMod}
              onChange={(v) => setConditionsMod(v)}
            />
            <p className="text-xs opacity-70 mt-1">
              Tip: use negative values (e.g. <code>-1</code> for Distracted).
            </p>
          </Field>

          <Field label="Other (±)">
            <NumberInput
              value={otherMod}
              onChange={(v) => setOtherMod(v)}
            />
            <p className="text-xs opacity-70 mt-1">
              Help/gear bonuses (+) or situational hindrances (−).
            </p>
          </Field>
        </div>
      </section>

      <div className="pt-1">
        <DiceRoller
          attribute={attribute}
          skill={skill}
          modifier={netModifier}
          defaultDifficulty="basic"
          // These two are simple toggles for now; wire to your feat/adrenaline state as needed.
          hasFreeReroll={false}
          canSpendAdrenaline={true}
        />
      </div>
    </div>
  );
}

/* ---------- UI bits ---------- */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-wide opacity-70">
      {children}
    </div>
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
      <div className="text-xs uppercase opacity-70 mb-1">{label}</div>
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
        className="px-2 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
        onClick={() => onChange(clampNum((value ?? 0) - 1, min, max))}
        title="Decrease"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseInt(e.target.value || "0", 10))}
        min={min}
        max={max}
      />
      <button
        type="button"
        className="px-2 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
        onClick={() => onChange(clampNum((value ?? 0) + 1, min, max))}
        title="Increase"
      >
        +
      </button>
    </div>
  );
}

function clampNum(n: number, min?: number, max?: number) {
  if (typeof min === "number") n = Math.max(min, n);
  if (typeof max === "number") n = Math.min(max, n);
  return n;
}
