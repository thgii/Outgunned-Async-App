import { useState } from "react";
import { api } from "../lib/api";

type ChaseState = {
  need: number;        // total boxes to complete (track length)
  progress: number;    // filled boxes (heroes making ground)
  speedHeroes: number; // relative speed marker
  speedTarget: number; // relative speed marker
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
  const [state, setState] = useState<ChaseState>(
    initial ?? { need: 8, progress: 0, speedHeroes: 0, speedTarget: 0 }
  );
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

  function setNeed(n: number) {
    const need = clamp(n, 1, 20);
    const progress = Math.min(state.progress, need);
    persist({ ...state, need, progress });
  }

  function setSpeed(which: "heroes" | "target", v: number) {
    const k = which === "heroes" ? "speedHeroes" : "speedTarget";
    persist({ ...state, [k]: clamp(v, -5, 10) } as ChaseState);
  }

  return (
    <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700">
      <div className="font-bold text-lg mb-2">🏎️ Chase</div>

      <div className="mb-2">
        <div className="text-sm mb-1">Progress</div>
        <div className="flex items-center gap-2">
          {Array.from({ length: state.need }).map((_, i) => {
            const filled = i < state.progress;
            return (
              <div
                key={i}
                onClick={() => editable && setProgress(i + 1)}
                className={`h-4 flex-1 rounded cursor-pointer transition
                  ${filled ? "bg-emerald-400" : "bg-slate-600 hover:bg-slate-500"}`}
                title={`${state.progress}/${state.need}`}
              />
            );
          })}
        </div>
        <div className="mt-1 text-sm text-slate-300">
          {state.progress}/{state.need}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-2">
        <div className="rounded-lg border border-slate-700 p-2">
          <div className="text-sm mb-1">Heroes Speed</div>
          <input
            type="range"
            min={-5}
            max={10}
            value={state.speedHeroes}
            onChange={(e) => setSpeed("heroes", Number(e.target.value))}
            disabled={!editable}
            className="w-full"
          />
          <div className="text-center text-sm">{state.speedHeroes}</div>
        </div>

        <div className="rounded-lg border border-slate-700 p-2">
          <div className="text-sm mb-1">Target Speed</div>
          <input
            type="range"
            min={-5}
            max={10}
            value={state.speedTarget}
            onChange={(e) => setSpeed("target", Number(e.target.value))}
            disabled={!editable}
            className="w-full"
          />
          <div className="text-center text-sm">{state.speedTarget}</div>
        </div>

        {editable && (
          <div className="rounded-lg border border-slate-700 p-2">
            <div className="text-sm mb-1">Track Length</div>
            <input
              type="number"
              min={1}
              max={20}
              value={state.need}
              onChange={(e) => setNeed(Number(e.target.value || 1))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1"
            />
          </div>
        )}
      </div>

      {saving && <div className="text-xs text-slate-400 mt-2">saving…</div>}
    </div>
  );
}
