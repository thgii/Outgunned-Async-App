import { useState } from "react";
import { api } from "../lib/api";

type ChaseState = {
  need: number;        // total boxes to complete (track length)
  progress: number;    // filled boxes (heroes making ground)
  speedHeroes: number; // relative speed marker (0..6)
  // speedTarget?: number; // (deprecated / removed)
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function ChaseTracker({
  gameId,
  initial,
  editable = false,
}: {
  gameId: string;
  initial?: ChaseState | null;
  editable?: boolean;
}) {
  // Normalize any incoming persisted state to the new bounds
  const [state, setState] = useState<ChaseState>(() => {
    const need = clamp(initial?.need ?? 8, 6, 18);
    const progress = clamp(initial?.progress ?? 0, 0, need);
    const speedHeroes = clamp(initial?.speedHeroes ?? 0, 0, 6);
    return { need, progress, speedHeroes };
  });

  const [saving, setSaving] = useState(false);

  async function persist(next: ChaseState) {
    setState(next);
    if (!editable) return;
    setSaving(true);
    try {
      await api.patch(`/games/${gameId}/options`, { chase: next });
    } finally {
      setSaving(false);
    }
  }

  function setProgress(p: number) {
    persist({ ...state, progress: clamp(p, 0, state.need) });
  }

  function handleProgressClick(idx: number) {
    if (!editable) return;
    // Special rule: clicking box 1 again when progress is 1 clears to 0
    if (idx === 0 && state.progress === 1) {
      setProgress(0);
    } else {
      setProgress(idx + 1);
    }
  }

  function setNeed(n: number) {
    const need = clamp(n, 6, 18);
    const progress = Math.min(state.progress, need);
    persist({ ...state, need, progress });
  }

  function setSpeedHeroes(v: number) {
    persist({ ...state, speedHeroes: clamp(v, 0, 6) });
  }

  return (
    <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700">
      {/* Header + tooltip */}
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-lg">🏎️ Chase</div>

        <div className="relative group">
          <button
            type="button"
            aria-label="Chase rules"
            className="w-6 h-6 rounded-full text-xs border border-slate-500 text-slate-300 hover:text-white hover:border-slate-400"
            tabIndex={0}
          >
            ?
          </button>
          <div
            className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100
                       absolute right-0 mt-2 z-20 w-[28rem] max-w-[90vw] text-left rounded-lg border border-slate-600
                       bg-slate-900/95 shadow-xl p-3 transition duration-150"
          >
            <div className="text-slate-200 text-sm leading-snug space-y-2">
              <p className="font-semibold">Action Turn</p>
              <p>
                During an Action Turn, the driver and other Heroes take any action they think will increase their Speed.
                Speed is relative—go faster than foes <em>or</em> slow them down.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Sam floors it and turns suddenly → roll <span className="font-medium">Nerves+Drive</span>.</li>
                <li>Johnny fires at the pursuers → roll <span className="font-medium">Nerves+Shoot</span>.</li>
              </ul>
              <ul className="list-none space-y-1">
                <li>• <span className="font-medium">Critical</span>: Speed +1</li>
                <li>• <span className="font-medium">Extreme</span>: Speed +2</li>
                <li>• <span className="font-medium">Impossible</span>: Speed +3</li>
                <li>• <span className="font-medium">Jackpot!</span>: Win the chase outright with a wild maneuver</li>
                <li>• <span className="font-medium">No Basic Success</span>: Speed −1 (backfires)</li>
              </ul>
              <p className="italic">
                Heroes can choose other actions or forgo the roll entirely.
              </p>
              <p>
                At the end of the Action Turn, fill a number of <span className="font-medium">Need</span> boxes equal to current Speed.
                If boxes remain, proceed to the Reaction Turn.
              </p>

              <p className="font-semibold pt-2">Reaction Turn</p>
              <p>
                Director describes the opponents’ moves and all involved Heroes make a Reaction Roll
                (usually <span className="font-medium">Critical</span> difficulty and always <span className="font-medium">Dangerous</span>).
              </p>
              <ul className="list-none space-y-1">
                <li>• Each Hero who fails: Speed −1</li>
                <li>• If the driver fails: ride also loses 1 Armor</li>
                <li>• Dangerous: on failure, lose some Grit</li>
              </ul>

              <p className="font-semibold pt-2">High Speed</p>
              <ul className="list-none space-y-1">
                <li>• <span className="font-medium">Speed 5</span>: Driver’s Action Rolls are Gambles</li>
                <li>• <span className="font-medium">Speed 6 (Top Speed)</span>: Driver suffers −1 to all rolls (unless they have <span className="italic">Full Throttle!</span>)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Progress track */}
      <div className="mb-2">
        <div className="text-sm mb-1">Progress</div>
        <div className="flex items-center gap-2">
          {Array.from({ length: state.need }).map((_, i) => {
            const filled = i < state.progress;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleProgressClick(i)}
                className={`h-4 flex-1 rounded transition ${
                  filled ? "bg-emerald-400" : "bg-slate-600 hover:bg-slate-500"
                } ${editable ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400" : "cursor-default"}`}
                title={`${state.progress}/${state.need}`}
                aria-label={`Progress ${i + 1} of ${state.need}`}
              />
            );
          })}
        </div>
        <div className="mt-1 text-sm text-slate-300">
          {state.progress}/{state.need}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mt-2">
        <div className="rounded-lg border border-slate-700 p-2">
          <div className="text-sm mb-1">Heroes Speed</div>
          <input
            type="range"
            min={0}
            max={6}
            value={state.speedHeroes}
            onChange={(e) => setSpeedHeroes(Number(e.target.value))}
            disabled={!editable}
            className="w-full"
          />
          <div className="text-center text-sm">{state.speedHeroes}</div>
        </div>

        {editable && (
          <div className="rounded-lg border border-slate-700 p-2">
            <div className="text-sm mb-1">Chase Need</div>
            <input
              type="number"
              min={6}
              max={18}
              value={state.need}
              onChange={(e) => setNeed(Number(e.target.value || 6))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1"
            />
            <div className="text-[11px] text-slate-400 mt-1">Min 6 • Max 18</div>
          </div>
        )}
      </div>

      {saving && <div className="text-xs text-slate-400 mt-2">saving…</div>}
    </div>
  );
}
