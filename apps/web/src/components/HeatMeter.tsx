import { useState } from "react";
import { api } from "../lib/api";

export function HeatMeter({ gameId, initialHeat = 0, editable = false }: {
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

  return (
    <div className="p-2 rounded-xl bg-slate-800/70 border border-slate-700 w-fit text-center">
      <div className="font-bold text-lg mb-1">🔥 Heat</div>
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: 12 }).map((_, i) => {
          const active = i < heat;
          return (
            <div
              key={i}
              onClick={() => editable && updateHeat(i + 1)}
              className={`w-4 h-4 rounded-full cursor-pointer transition
                ${active ? "bg-red-500" : "bg-slate-600 hover:bg-slate-500"}`}
            />
          );
        })}
      </div>
      {saving && <div className="text-xs text-slate-400 mt-1">saving…</div>}
    </div>
  );
}
