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
    () => Number(adrenalineMod || 0) + Number(otherMod || 0) + Number(conditionsMod || 0),
    [adrenalineMod, otherMod, conditionsMod]
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Director’s Dice Roller</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Attribute (0–5)">
          <input
            type="number"
            inputMode="numeric"
            className="w-full border rounded px-2 py-1"
            min={0}
            max={5}
            value={attribute}
            onChange={(e) => setAttribute(parseInt(e.target.value || "0", 10))}
          />
        </Field>

        <Field label="Skill (0–5)">
          <input
            type="number"
            inputMode="numeric"
            className="w-full border rounded px-2 py-1"
            min={0}
            max={5}
            value={skill}
            onChange={(e) => setSkill(parseInt(e.target.value || "0", 10))}
          />
        </Field>

        <Field label="Adrenaline (+)">
          <input
            type="number"
            inputMode="numeric"
            className="w-full border rounded px-2 py-1"
            value={adrenalineMod}
            onChange={(e) => setAdrenalineMod(parseInt(e.target.value || "0", 10))}
          />
        </Field>

        <Field label="Conditions (−)">
          <input
            type="number"
            inputMode="numeric"
            className="w-full border rounded px-2 py-1"
            value={conditionsMod}
            onChange={(e) => setConditionsMod(parseInt(e.target.value || "0", 10))}
          />
          <p className="text-xs opacity-70 mt-1">
            Tip: enter a negative number (e.g., <code>-1</code> for Distracted).
          </p>
        </Field>

        <Field label="Other Modifiers (±)">
          <input
            type="number"
            inputMode="numeric"
            className="w-full border rounded px-2 py-1"
            value={otherMod}
            onChange={(e) => setOtherMod(parseInt(e.target.value || "0", 10))}
          />
          <p className="text-xs opacity-70 mt-1">
            Help/gear bonuses (+) or situational hindrances (−).
          </p>
        </Field>

        <Field label="Net Modifier">
          <div className="px-2 py-1 rounded bg-gray-100">
            {netModifier >= 0 ? `+${netModifier}` : netModifier}
          </div>
        </Field>
      </div>

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
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase opacity-70 mb-1">{label}</div>
      {children}
    </label>
  );
}
