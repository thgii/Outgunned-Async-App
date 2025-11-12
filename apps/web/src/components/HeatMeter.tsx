import { useState } from "react";
import { api } from "../lib/api";

export function HeatMeter({
  gameId,
  initialHeat = 0,
  editable = false,
}: {
  gameId: string;
  initialHeat?: number;
  editable?: boolean;
}) {
  const [heat, setHeat] = useState(initialHeat);
  const [saving, setSaving] = useState(false);

  async function updateHeat(next: number) {
    setHeat(next);
    if (!editable) return;
    setSaving(true);
    try {
      await api.patch(`/games/${gameId}/options`, { heat: next });
    } finally {
      setSaving(false);
    }
  }

  const thresholds = new Map<number, string>([
    [6, "Heat 6: All Heroes add a Lethal Bullet to their Death Roulette."],
    [9, "Heat 9: All Enemies have +1 Feat Point."],
    [12, "Heat 12: All Heroes gain 1 Adrenaline and add a Lethal Bullet to their Death Roulette."],
  ]);

  return (
    <div className="p-2 rounded-xl bg-slate-800/70 border border-slate-700 w-fit text-center">
      {/* Header with tooltip */}
      <div className="flex items-center justify-center gap-2 mb-1">
        <div className="font-bold text-lg">🔥 Heat</div>

        {/* Tooltip trigger */}
        <div className="relative group">
          <button
            aria-label="What is Heat?"
            className="w-5 h-5 rounded-full text-xs leading-[18px] border border-slate-500 text-slate-300 hover:text-white hover:border-slate-400"
            type="button"
            tabIndex={0}
          >
            ?
          </button>

          {/* Tooltip panel */}
          <div
            className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100
                       absolute z-20 left-1/2 -translate-x-1/2 mt-2 w-[22rem] text-left rounded-lg border border-slate-600
                       bg-slate-900/95 shadow-xl p-3 transition duration-150"
          >
            <div className="text-slate-200 text-sm leading-snug space-y-2">
              <p className="font-semibold">Starting Heat</p>
              <p>
                When the mission begins, the Heat level equals the number of Heroes in the game.
                For example, 4 Heroes → starting Heat is 4.
              </p>

              <p className="font-semibold pt-1">Heat +1 Triggers</p>
              <ul className="list-none space-y-1">
                <li>♦ <span className="font-medium">Point of No Return</span>: At the beginning of a Turning Point or Showdown.</li>
                <li>♦ <span className="font-medium">Sad Goodbye</span>: A Hero or Supporting Character is Left for Dead.</li>
                <li>♦ <span className="font-medium">Stinging Defeat</span>: The Villain/goons gain the upper hand or hit a crucial objective.</li>
                <li>♦ <span className="font-medium">It’s Too Late</span>: The Heroes lose time or linger too long on a Time-Out.</li>
                <li>♦ <span className="font-medium">Fatal Mistake</span>: The Heroes misstep, trust the wrong person, or underestimate the enemy.</li>
              </ul>
              <p className="italic">At the Showdown, Heat is locked and doesn’t rise anymore.</p>

              <p className="font-semibold pt-1">Impact of Heat</p>
              <ul className="list-none space-y-1">
                <li>♦ <span className="font-medium">Heat 6</span>: All Heroes add a Lethal Bullet to Death Roulette.</li>
                <li>♦ <span className="font-medium">Heat 9</span>: All Enemies have +1 Feat Point.</li>
                <li>♦ <span className="font-medium">Heat 12</span>: All Heroes gain 1 Adrenaline and add a Lethal Bullet.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Tracker */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: 12 }).map((_, i) => {
          const idx = i + 1;
          const active = i < heat;
          const isThreshold = thresholds.has(idx);
          const isExact = heat === idx;

          return (
            <button
              key={i}
              type="button"
              aria-label={`Heat ${idx}${isThreshold ? ` – ${thresholds.get(idx)}` : ""}`}
              onClick={() => editable && updateHeat(idx)}
              className={[
                "relative w-5 h-5 rounded-full cursor-pointer transition",
                active ? "bg-red-500" : "bg-slate-600 hover:bg-slate-500",
                isThreshold ? "ring-2 ring-amber-400" : "",
                isThreshold && isExact ? "animate-pulse" : "",
                editable ? "focus:outline-none focus:ring-2 focus:ring-sky-400" : "cursor-default",
              ].join(" ")}
              title={isThreshold ? thresholds.get(idx) : undefined}
            >
              {/* Tiny tick under threshold dots */}
              {isThreshold && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] leading-none text-amber-300">
                  •
                </span>
              )}
            </button>
          );
        })}
      </div>

      {saving && <div className="text-xs text-slate-400 mt-1">saving…</div>}
    </div>
  );
}
