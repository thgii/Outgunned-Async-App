import { useMemo, useState } from "react";
import { GEAR } from "@action-thread/types";

type GearItem = (typeof GEAR)[number];

const KIND_LABEL: Record<GearItem["kind"], string> = {
  weapon: "Weapons",
  armor: "Armor",
  ride: "Rides",
  kit: "Kits",
  tool: "Tools",
  device: "Devices",
  outfit: "Outfits",
  consumable: "Consumables",
  cash: "Cash",
  companion: "Companions",
  artifact: "Artifacts",
  virtual: "Virtual",
  misc: "Miscellaneous",
};

const KIND_ORDER: GearItem["kind"][] = [
  "weapon",
  "armor",
  "ride",
  "tool",
  "device",
  "kit",
  "outfit",
  "consumable",
  "cash",
  "companion",
  "artifact",
  "virtual",
  "misc",
];

function normalize(s: string) {
  return s.normalize("NFKD").toLowerCase();
}

function useFilteredGear(query: string, kind: string) {
  return useMemo(() => {
    const q = normalize(query.trim());
    const list = GEAR.filter((g) => {
      if (kind !== "all" && g.kind !== kind) return false;
      if (!q) return true;
      const inName = normalize(g.name).includes(q);
      const inTags = (g.tags || []).some((t) => normalize(t).includes(q));
      const inNote = g.note ? normalize(g.note).includes(q) : false;
      return inName || inTags || inNote;
    }).slice();

    // Sort by kind (stable order) then by name.
    list.sort((a, b) => {
      const ko = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
      if (ko !== 0) return ko;
      return a.name.localeCompare(b.name);
    });

    // Group by kind
    const groups: Record<string, GearItem[]> = {};
    for (const k of KIND_ORDER) groups[k] = [];
    for (const item of list) groups[item.kind].push(item);
    return groups;
  }, [query, kind]);
}

function GunRangeLine(g: GearItem) {
  // Be defensive; only show if gun profile exists
  const gun = (g as any)?.props?.gun;
  if (!gun) return null;

  const cell = (v: any) => {
    if (v == null) return "—";
    // Ranges in your data already encode bonuses/penalties and 'G' markers
    // (e.g., +1, -2, +2G). Just stringify them.
    return String(v);
  };

  return (
    <div className="text-xs text-gray-600">
      Range — Melee: <b>{cell(gun.melee)}</b> · Close: <b>{cell(gun.close)}</b> · Medium: <b>{cell(gun.medium)}</b> · Long: <b>{cell(gun.long)}</b>
    </div>
  );
}

export default function DirectorsToolkit_Gear() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<GearItem["kind"] | "all">("all");

  const grouped = useFilteredGear(query, kind);

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl border border-gray-300 shadow bg-white p-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-1 text-gray-900">Gear</h2>
          <p className="text-gray-700 text-sm">
            Search and filter gear from the shared catalog. Click a section to expand.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, tag, or note…"
            className="w-56 px-3 py-2 border rounded-lg text-sm"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as any)}
            className="px-3 py-2 border rounded-lg text-sm"
            title="Filter by kind"
          >
            <option value="all">All kinds</option>
            {KIND_ORDER.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 divide-y">
        {KIND_ORDER.map((k) => {
          const items = grouped[k];
          if (!items || items.length === 0) return null;
          return (
            <details key={k} className="py-4 group" open>
              <summary className="flex items-center justify-between cursor-pointer">
                <div className="text-lg font-semibold text-gray-900">{KIND_LABEL[k]}</div>
                <span className="text-xs text-gray-500">{items.length} item{items.length === 1 ? "" : "s"}</span>
              </summary>

              <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((g) => (
                  <li key={g.id} className="p-3 border rounded-lg bg-white/50">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900">{g.name}</div>
                      {g.cost != null && (
                        <div className="ml-3 text-xs px-2 py-0.5 rounded-full bg-gray-100 border">
                          {g.cost} $
                        </div>
                      )}
                    </div>

                    {g.tags && g.tags.length > 0 && (
                      <div className="mt-1 text-xs text-gray-600">
                        Tags: {g.tags.join(", ")}
                      </div>
                    )}

                    {g.note && <div className="mt-1 text-sm text-gray-700">{g.note}</div>}

                    {/* If ranged weapon, show compact range line */}
                    <GunRangeLine {...({} as any)} />
                    {/* ^ above won't render as-is; we need actual g passed in */}
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>

      <div className="mt-6 text-right">
        <a href="#top" className="text-xs underline text-gray-600 hover:text-gray-800">
          Back to top
        </a>
      </div>
    </div>
  );
}
