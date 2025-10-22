import { useMemo, useState } from "react";
import {
  performRoll,
  applyReroll,
  goAllIn,
  passesDifficulty,
  buildPool,
  Difficulty,
  RollResult,
} from "../lib/dice";

type DiceRollerProps = {
  attribute: number;
  skill: number;
  modifier?: number;
  defaultDifficulty?: Difficulty;
  canSpendAdrenaline?: boolean;
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
    <div
      className={`rounded-xl border border-gray-300 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 p-5 space-y-4 shadow-sm ${className}`}
    >
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Dice Roller
        </h3>
        <div className="text-sm text-gray-800 dark:text-gray-300">
          Pool: <b>{pool}</b>{" "}
          {clamped && <span className="ml-1 text-xs">(clamped 2–9)</span>}
        </div>
      </header>

      {/* Attribute / Skill / Modifier */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Labeled label="Attribute">
          <span className="inline-block rounded px-2 py-1 border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 font-semibold">
            {attribute}
          </span>
        </Labeled>
        <Labeled label="Skill">
          <span className="inline-block rounded px-2 py-1 border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 font-semibold">
            {skill}
          </span>
        </Labeled>
        <Labeled label="Modifier (net)">
          <span className="inline-block rounded px-2 py-1 border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 font-semibold">
            {modifier >= 0 ? `+${modifier}` : modifier}
          </span>
        </Labeled>
      </div>

      {/* Difficulty dropdown */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Difficulty
        </label>
        <select
          className="border border-gray-400 bg-white text-gray-900 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
        >
          <option value="basic">Basic</option>
          <option value="critical">Critical</option>
          <option value="extreme">Extreme</option>
          <option value="impossible">Impossible</option>
        </select>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button color="indigo" onClick={doRoll}>
          Roll {pool} d6
        </Button>

        <Button
          color="sky"
          onClick={doRerollFree}
          disabled={!current || !hasFreeReroll}
          title="Free Re-roll (feat-based, allowed even with 0 success; never lose 1)"
        >
          Free Re-roll
        </Button>

        <Button
          color="amber"
          onClick={doRerollPaid}
          disabled={!current || !canSpendAdrenaline}
          title="Re-roll (requires ≥1 success; if not better, lose 1 success)"
        >
          Re-roll (spend 1)
        </Button>

        <Button
          color="rose"
          onClick={doAllIn}
          disabled={!current}
          title="All In: if not better, lose ALL previous successes"
        >
          Go All-In
        </Button>

        <Button
          color="gray"
          onClick={doReset}
          disabled={!current && history.length === 0}
          title="Clear this roller for a brand new roll"
        >
          Reset
        </Button>
      </div>

      {/* Results */}
      {current && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 p-3 shadow-inner">
            <div className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Latest Roll
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200">
              Faces:{" "}
              <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                {current.breakdown.faces.join(" ")}
              </span>
            </div>
            <div className="text-sm mt-1 text-gray-800 dark:text-gray-200">
              Sets:&nbsp;
              {current.breakdown.sets.length
                ? current.breakdown.sets
                    .map(
                      (s, i) => `${s} (${current.breakdown.tierPerSet[i]})`
                    )
                    .join(", ")
                : "—"}
            </div>
            <div className="text-sm mt-1 text-gray-800 dark:text-gray-200">
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
              <b
                className={
                  passed
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {passed ? "YES" : "NO"}
              </b>
            </div>
            <Flags flags={current.flags} />
          </div>

          <div className="rounded-lg border border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 p-3 shadow-inner">
            <div className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
              History
            </div>
            <ol className="text-sm text-gray-800 dark:text-gray-200 space-y-1">
              {history.map((h, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between font-mono"
                >
                  <span>{h.breakdown.faces.join(" ")}</span>
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

/* ---------- UI helpers ---------- */

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {label}
      </div>
      {children}
    </div>
  );
}

function Button({
  color,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  color: "indigo" | "sky" | "amber" | "rose" | "gray";
}) {
  const colorClasses: Record<string, string> = {
    indigo:
      "bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-300",
    sky: "bg-sky-500 hover:bg-sky-600 text-white disabled:bg-sky-300",
    amber: "bg-amber-500 hover:bg-amber-600 text-white disabled:bg-amber-300",
    rose: "bg-rose-500 hover:bg-rose-600 text-white disabled:bg-rose-300",
    gray:
      "bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100",
  };

  return (
    <button
      className={`px-3 py-1 rounded text-sm font-semibold transition-colors border border-transparent ${colorClasses[color]} disabled:cursor-not-allowed`}
      {...rest}
    >
      {children}
    </button>
  );
}

function Flags({ flags }: { flags: RollResult["flags"] }) {
  const items: string[] = [];
  if (flags.betterThan) items.push(`Improved vs ${flags.betterThan}`);
  if (flags.lostOneOnReroll) items.push("Lost 1 success on Re-roll");
  if (flags.allInBust) items.push("All-In bust (lost all)");
  if (!items.length) return null;
  return (
    <div className="text-sm mt-2 text-gray-700 dark:text-gray-300">
      {items.map((s, i) => (
        <span key={i} className="inline-block mr-2">
          • {s}
        </span>
      ))}
    </div>
  );
}
