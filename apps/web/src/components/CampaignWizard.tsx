import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

export type HeroRow = { id: string; name: string; ownerId?: string; ownerName?: string };

type Props = {
  onSubmit: (payload: { title: string; description: string; heroIds: string[] }) => Promise<void>;
};

export default function CampaignWizard({ onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [heroes, setHeroes] = useState<HeroRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch ALL heroes (minimal projection)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api("/characters?all=1", { method: "GET" });
        if (!alive) return;
        setHeroes(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load heroes");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return heroes;
    return heroes.filter(h =>
      (h.name || "").toLowerCase().includes(q) ||
      (h.ownerName || "").toLowerCase().includes(q)
    );
  }, [heroes, query]);

  async function handleCreate() {
    if (!title.trim()) {
      setError("Please enter a campaign name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const heroIds = Object.keys(selected).filter(id => selected[id]);
      await onSubmit({ title: title.trim(), description, heroIds });
    } catch (e: any) {
      setError(e?.message || "Failed to create campaign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow p-4 space-y-4 text-black">
      {error && (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1 text-black">Name of campaign</label>
        <input
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Crimison Velocity"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-black">Description</label>
        <textarea
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm min-h-28"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What’s this campaign about?"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-black">Select heroes to add</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            placeholder="Filter by hero or owner…"
          />
        </div>

        {loading ? (
          <div className="p-3 rounded border border-slate-200 bg-white">Loading heroes…</div>
        ) : (
          <div className="max-h-80 overflow-auto rounded border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 w-10"></th>
                  <th className="text-left px-3 py-2">Hero</th>
                  <th className="text-left px-3 py-2">Owner</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => {
                  const checked = !!selected[h.id];
                  return (
                    <tr key={h.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelected((m) => ({ ...m, [h.id]: e.target.checked }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-black">{h.name || "Untitled Hero"}</td>
                      <td className="px-3 py-2 opacity-80 text-black">{h.ownerName || h.ownerId || "—"}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td className="px-3 py-10 text-center text-slate-600" colSpan={3}>
                      No heroes match your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={handleCreate}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create Campaign"}
        </button>
      </div>
    </div>
  );
}
