// apps/web/src/components/DiceRoller.tsx
import { useMemo, useState } from "react";
import {
  PoolOptions,
  performRoll,
  applyReroll,
  goAllIn,
  passesDifficulty,
  buildPool,
  Difficulty,
  RollResult,
} from "../lib/dice";

// Minimal tailwind-y UI. Replace with your design system as you like.
type DiceRollerProps = {
  // Provide the character's current values:
  attribute: number; // e.g., Nerves, Brawn, Smooth, Focus, Crime (choose one per roll)
  skill: number;     // chosen skill level for this roll
  // Modifiers: sum(+help, +gear, +adrenalineSpent, -conditions, -hindrances)
  modifier?: number;
  // Difficulty selector default
  defaultDifficulty?: Difficulty;
  // Adrenaline availability for the “Reroll (spend 1)” button — you’ll actually consume it in the caller.
  canSpendAdrenaline?: boolean;
  // Show Free Re-roll button (granted by feats)
  hasFreeReroll?: boolean;
  className?: string;
};

export default function DiceRoller({
  attribute,
  skill,
  modifier = 0,
  defaultDifficulty = "basic",
  canSpendAdrenaline = true,
  hasFreeReroll = false,
  className = "",
}: DiceRollerProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultDifficulty);
  const { pool, clamped } = useMemo(
    () => buildPool({ attribute, skill, modifier }),
    [attribute, skill, modifier]
  );

  const [current, setCurrent] = useState<RollResult | null>(null);
  const [history, setHistory] = useState<RollResult[]>([]);

  function doRoll() {
    const res = performRoll({ attribute, skill, modifier });
    setCurrent(res);
    setHistory([res]);
  }

  function doRerollFree() {
    if (!current) return;
    const next = applyReroll(current, { free: true });
    setCurrent(next);
    setHistory((h) => [...h, next]);
  }

  function doRerollPaid() {
    if (!current) return;
    // NOTE: Spending Adrenaline should be handled by the parent (decrement the resource).
    const next = applyReroll(current, { free: false });
    setCurrent(next);
    setHistory((h) => [...h, next]);
  }

  function doAllIn() {
    if (!current) return;
    const next = goAllIn(current);
    setCurrent(next);
    setHistory((h) => [...h, next]);
  }

    function doReset() {
    setCurrent(null);
    setHistory([]);
  }

  const passed = current ? passesDifficulty(current, { difficulty }) : null;

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${className}`}>
      <header className="flex items-center justify-between">
        <div className="font-semibold">Dice Roller</div>
        <div className="text-sm opacity-80">
          Pool: <b>{pool}</b> {clamped && <span className="ml-1 text-xs">(clamped 2–9)</span>}
        </div>
      </header>

      <div className="grid gap-2 sm:grid-cols-3">
        <Labeled label="Attribute">
          <span className="inline-block rounded px-2 py-1 bg-gray-100">{attribute}</span>
        </Labeled>
        <Labeled label="Skill">
          <span className="inline-block rounded px-2 py-1 bg-gray-100">{skill}</span>
        </Labeled>
        <Labeled label="Modifier (net)">
          <span className="inline-block rounded px-2 py-1 bg-gray-100">{modifier >= 0 ? `+${modifier}` : modifier}</span>
        </Labeled>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm">Difficulty</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
        >
          <option value="basic">Basic</option>
          <option value="critical">Critical</option>
          <option value="extreme">Extreme</option>
          <option value="impossible">Impossible</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="px-3 py-1 rounded bg-black text-white text-sm" onClick={doRoll}>
          Roll {pool} d6
        </button>

        <button
          className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
          onClick={doRerollFree}
          disabled={!current || !hasFreeReroll}
          title="Free Re-roll (feat-based, allowed even with 0 success; never lose 1)"
        >
          Free Re-roll
        </button>

        <button
          className="px-3 py-1 rounded bg-amber-600 text-white text-sm disabled:opacity-50"
          onClick={doRerollPaid}
          disabled={!current || !canSpendAdrenaline}
          title="Re-roll (requires ≥1 success; if not better, lose 1 success)"
        >
          Re-roll (spend 1)
        </button>

        <button
          className="px-3 py-1 rounded bg-red-600 text-white text-sm disabled:opacity-50"
          onClick={doAllIn}
          disabled={!current}
          title="All In: if not better, lose ALL previous successes"
        >
          Go All-In
        </button>
                <button
          className="px-3 py-1 rounded bg-gray-200 text-gray-900 text-sm disabled:opacity-50"
          onClick={doReset}
          disabled={!current && history.length === 0}
          title="Clear this roller for a brand new roll"
        >
          Reset
        </button>

      </div>

      {current && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded border p-3">
            <div className="text-sm font-semibold mb-1">Latest Roll</div>
            <div className="text-sm">
              Faces:{" "}
              <span className="font-mono">
                {current.breakdown.faces.join(" ")}
              </span>
            </div>
            <div className="text-sm mt-1">
              Sets:&nbsp;
              {current.breakdown.sets.length
                ? current.breakdown.sets
                    .map((s, i) => `${s} (${current.breakdown.tierPerSet[i]})`)
                    .join(", ")
                : "—"}
            </div>
            <div className="text-sm mt-1">
              Successes:&nbsp;
              <b>
                {[
                  current.jackpot ? `Jackpot:${current.jackpot}` : "",
                  current.impossible ? `Impossible:${current.impossible}` : "",
                  current.extreme ? `Extreme:${current.extreme}` : "",
                  current.critical ? `Critical:${current.critical}` : "",
                  current.basic ? `Basic:${current.basic}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ") || "None"}
              </b>
            </div>
            <div className="text-sm mt-1">
              Pass {difficulty.toUpperCase()}?{" "}
              <b className={passed ? "text-green-600" : "text-red-600"}>
                {passed ? "Yes" : "No"}
              </b>
            </div>
            <Flags flags={current.flags} />
          </div>

          <div className="rounded border p-3">
            <div className="text-sm font-semibold mb-2">History</div>
            <ol className="text-sm space-y-1">
              {history.map((h, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="font-mono">{h.breakdown.faces.join(" ")}</span>
                  <span>
                    {h.jackpot
                      ? "Jackpot"
                      : h.impossible
                      ? "Impossible"
                      : h.extreme
                      ? "Extreme"
                      : h.critical
                      ? "Critical"
                      : h.basic
                      ? "Basic"
                      : "Fail"}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase opacity-70">{label}</div>
      {children}
    </div>
  );
}

function Flags({ flags }: { flags: RollResult["flags"] }) {
  const items: string[] = [];
  if (flags.betterThan) items.push(`Improved vs ${flags.betterThan}`);
  if (flags.lostOneOnReroll) items.push("Lost 1 success on Re-roll");
  if (flags.allInBust) items.push("All-In bust (lost all)");
  if (!items.length) return null;
  return (
    <div className="text-xs mt-2 opacity-80">
      {items.map((s, i) => (
        <span key={i} className="inline-block mr-2">
          • {s}
        </span>
      ))}
    </div>
  );
}
