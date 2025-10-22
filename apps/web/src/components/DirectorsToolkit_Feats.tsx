import { useMemo, useState } from "react";
import { FEATS_CATALOG } from "../data/wizard";

/**
 * Director's Toolkit — Feats
 * Pulls feat names + descriptions from FEATS_CATALOG (backed by outgunned_data.json).
 * - Fast search filter (name + description)
 * - A–Z grouped list
 */
export default function DirectorsToolkit_Feats() {
  const [query, setQuery] = useState("");

  const feats = FEATS_CATALOG; // [{ name, description? }]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return feats;

    return feats.filter((f) => {
      const name = (f.name || "").toLowerCase();
      const desc = (f.description || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [query, feats]);

  // Group A-Z by first letter of feat name
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; description?: string }[]>();
    for (const f of filtered) {
      const key = (f.name?.[0] || "#").toUpperCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    // sort groups by letter, and feats by name inside
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, items]) => [letter, items.sort((a, b) => a.name.localeCompare(b.name))] as const);
  }, [filtered]);

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl border border-gray-300 shadow bg-white">
      {/* Header / Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Feats Reference</h2>
          <div className="flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search feats by name or text…"
              className="w-72 max-w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Showing <b>{filtered.length}</b> of <b>{feats.length}</b> feats from your JSON.
        </p>
      </div>

      {/* List */}
      <div className="p-2 sm:p-4">
        {groups.length === 0 ? (
          <div className="p-6 text-gray-600 italic">No feats match your search.</div>
        ) : (
          groups.map(([letter, items]) => (
            <section key={letter} className="mb-6">
              <div className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                <h3 className="px-2 sm:px-3 py-1.5 text-sm font-bold tracking-wider text-gray-700">{letter}</h3>
              </div>
              <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 overflow-hidden">
                {items.map((f) => (
                  <li key={f.name} className="p-4 sm:p-5 bg-white">
                    <div className="text-base font-semibold text-gray-900">{f.name}</div>
                    {f.description ? (
                      <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                        {f.description}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500 italic">No description provided.</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
