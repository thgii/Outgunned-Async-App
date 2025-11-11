import { useMemo, useState } from "react";
import { api } from "../lib/api";

type Countdown = {
  id: string;
  label: string;
  total: number;
  current: number;
};

function makeId() {
  // safe both in browser and SSR
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
  const [items, setItems] = useState<Countdown[]>(initial);
  const [saving, setSaving] = useState(false);

  async function persist(next: Countdown[]) {
    setItems(next);
    if (!editable) return;
    setSaving(true);
    try {
      await api.patch(`/games/${gameId}/options`, { countdowns: next });
    } finally {
      setSaving(false);
    }
  }

  function bump(id: string, delta: number) {
    const next = items.map(c =>
      c.id === id
        ? { ...c, current: Math.max(0, Math.min(c.total, c.current + delta)) }
        : c
    );
    persist(next);
  }

  function addNew() {
    const next: Countdown[] = [
      ...items,
      { id: makeId(), label: "Clock", total: 6, current: 0 },
    ];
    persist(next);
  }

  function updateMeta(id: string, patch: Partial<Countdown>) {
    const next = items.map(c => (c.id === id ? { ...c, ...patch } : c));
    persist(next);
  }

  function removeId(id: string) {
    const next = items.filter(c => c.id !== id);
    persist(next);
  }

  return (
    <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-lg">⏱️ Countdowns</div>
        {editable && (
          <button
            onClick={addNew}
            className="px-2 py-1 text-sm rounded bg-emerald-600 hover:bg-emerald-500"
          >
            + Add
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(c => (
          <div key={c.id} className="rounded-lg border border-slate-700 p-2">
            <div className="flex items-center justify-between mb-1">
              {editable ? (
                <input
                  className="bg-transparent border-b border-slate-600 focus:outline-none px-1"
                  value={c.label}
                  onChange={e => updateMeta(c.id, { label: e.target.value })}
                />
              ) : (
                <div className="font-semibold">{c.label}</div>
              )}

              {editable && (
                <button
                  onClick={() => removeId(c.id)}
                  className="text-xs text-red-300 hover:text-red-200"
                  title="Remove"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {Array.from({ length: c.total }).map((_, i) => {
                const filled = i < c.current;
                return (
                  <div
                    key={i}
                    onClick={() => editable && updateMeta(c.id, { current: i + 1 })}
                    className={`h-4 flex-1 rounded cursor-pointer transition
                      ${filled ? "bg-amber-400" : "bg-slate-600 hover:bg-slate-500"}`}
                    title={`${c.current}/${c.total}`}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-2 text-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => bump(c.id, -1)}
                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
                  disabled={!editable && c.current === 0}
                >
                  −
                </button>
                <div className="min-w-[3rem] text-center">
                  {c.current}/{c.total}
                </div>
                <button
                  onClick={() => bump(c.id, +1)}
                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
                >
                  +
                </button>
              </div>

              {editable ? (
                <div className="flex items-center gap-2">
                  <label className="text-slate-300">Total</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={c.total}
                    onChange={e =>
                      updateMeta(c.id, {
                        total: Math.max(1, Math.min(20, Number(e.target.value || 1))),
                        current: Math.min(c.current, Math.max(1, Math.min(20, Number(e.target.value || 1))))
                      })
                    }
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                  />
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {saving && <div className="text-xs text-slate-400 mt-2">saving…</div>}
    </div>
  );
}
