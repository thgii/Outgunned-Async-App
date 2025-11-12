import { useMemo, useState } from "react";
import { api } from "../lib/api";

type Countdown = {
  id: string;
  label: string;   // kept for backend compatibility; not shown
  total: number;   // starting turns (2..4)
  current: number; // elapsed turns (0..total)
};

function makeId() {
  return (globalThis as any)?.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function CountdownsPanel({
  gameId,
  initial = [],
  editable = false,
}: {
  gameId: string;
  initial?: Countdown[];
  editable?: boolean;
}) {
  // Normalize to 0 or 1 countdown; clamp ranges
  const boot = useMemo(() => {
    const first = initial?.[0];
    if (!first) return [] as Countdown[];
    const total = Math.max(2, Math.min(4, Number(first.total ?? 2)));
    const current = Math.max(0, Math.min(total, Number(first.current ?? 0)));
    return [{ ...first, total, current, label: first.label ?? "Countdown" }];
  }, [initial]);

  const [items, setItems] = useState<Countdown[]>(boot);
  const [saving, setSaving] = useState(false);

  async function persist(next: Countdown[]) {
    // enforce one-at-a-time on save too
    const payload = next.length > 1 ? [next[0]] : next;
    setItems(payload);
    if (!editable) return;
    setSaving(true);
    try {
      await api.patch(`/games/${gameId}/options`, { countdowns: payload });
    } finally {
      setSaving(false);
    }
  }

  function startNew(total: number) {
    const t = Math.max(2, Math.min(4, total));
    const next: Countdown[] = [{ id: makeId(), label: "Countdown", total: t, current: 0 }];
    persist(next);
  }

  function removeCountdown() {
    persist([]);
  }

  function setTotal(t: number) {
    if (!items[0]) return;
    const total = Math.max(2, Math.min(4, Number(t || 2)));
    const current = Math.min(items[0].current, total);
    persist([{ ...items[0], total, current }]);
  }

  // Advance turn increases "elapsed", which reduces "remaining"
  function advance() {
    const c = items[0];
    if (!c) return;
    const current = Math.min(c.total, c.current + 1);
    persist([{ ...c, current }]);
  }

  function previous() {
    const c = items[0];
    if (!c) return;
    const current = Math.max(0, c.current - 1);
    persist([{ ...c, current }]);
  }

  const c = items[0];
  const remaining = c ? Math.max(0, c.total - c.current) : 0;

  return (
    <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="font-bold text-lg">⏱️ Countdown</div>

          {/* Tooltip */}
          <div className="relative group">
            <button
              type="button"
              aria-label="Countdown optional rule"
              className="w-5 h-5 rounded-full text-xs border border-slate-500 text-slate-300 hover:text-white hover:border-slate-400"
              tabIndex={0}
            >
              ?
            </button>
            <div
              className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100
                         absolute z-20 left-1/2 -translate-x-1/2 mt-2 w-[26rem] max-w-[90vw] text-left rounded-lg border border-slate-600
                         bg-slate-900/95 shadow-xl p-3 transition duration-150"
            >
              <div className="text-slate-200 text-sm leading-snug space-y-2">
                <p className="font-semibold">Countdown — OPTIONAL RULE</p>
                <p>
                  At the beginning of a chase, or at any time during one, the Director can announce
                  the beginning of a Countdown. From that moment, Heroes have <span className="font-medium">2, 3, or 4 turns</span> to
                  fill up all Need boxes. Otherwise, it’s too late.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Add / Remove (one at a time) */}
        {editable && (
          <div className="flex items-center gap-2">
            {!c ? (
              <>
                <label className="text-sm text-slate-300">Start at</label>
                <select
                  onChange={(e) => startNew(Number(e.target.value))}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled className="text-slate-400">
                    Select (2–4)
                  </option>
                  <option value={2} className="text-white">2</option>
                  <option value={3} className="text-white">3</option>
                  <option value={4} className="text-white">4</option>
                </select>
              </>
            ) : (
              <button
                onClick={removeCountdown}
                className="px-2 py-1 text-sm rounded bg-red-600/80 hover:bg-red-500"
                title="Remove countdown"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      {/* Active countdown view */}
      {c ? (
        <div className="rounded-lg border border-slate-700 p-3">
          {/* Boxes show elapsed vs total; label hidden per spec */}
          <div className="flex items-center gap-2 mb-2">
            {Array.from({ length: c.total }).map((_, i) => {
              const elapsed = i < c.current;
              return (
                <div
                  key={i}
                  className={`h-4 flex-1 rounded ${elapsed ? "bg-amber-400" : "bg-slate-600"}`}
                  title={`${c.current}/${c.total} elapsed`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-200">
              <span className="font-semibold">{remaining}</span> turns remaining
            </div>

            <div className="flex items-center gap-2">
              {editable && (
                <>
                  <button
                    onClick={previous}
                    className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sm"
                    disabled={c.current <= 0}
                    title="Previous Turn"
                  >
                    Previous Turn
                  </button>
                  <button
                    onClick={advance}
                    className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sm"
                    disabled={c.current >= c.total}
                    title="Advance Turn"
                  >
                    Advance Turn
                  </button>
                </>
              )}
            </div>
          </div>

          {editable && (
            <div className="mt-3 flex items-center gap-2">
              <label className="text-sm text-slate-300">Starting turns</label>
              <input
                type="number"
                min={2}
                max={4}
                value={c.total}
                onChange={(e) => setTotal(Number(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
              />
              <span className="text-[11px] text-slate-400">Min 2 • Max 4</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-400 italic">No active countdown.</div>
      )}

      {saving && <div className="text-xs text-slate-400 mt-2">saving…</div>}
    </div>
  );
}
