import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

/** ---------- Types & helpers ---------- */

type Meter = { current?: number; max?: number };
type MaybeNamed = { name?: string; value?: any };

type Character = {
  id: string;
  name: string;
  role: string | MaybeNamed;
  trope: string | MaybeNamed;
  age?: string | number;
  background?: string | MaybeNamed;
  flaw?: string | MaybeNamed;
  catchphrase?: string | MaybeNamed;
  attributes?: Record<string, number | MaybeNamed>;
  skills?: Record<string, number | MaybeNamed>;
  feats?: Array<string | MaybeNamed>;
  gear?: Array<string | MaybeNamed>;
  resources?: Record<string, number | Meter | MaybeNamed>;
  ride?: string | MaybeNamed;
  notes?: string;
};

function formatValue(v: unknown): string | number {
  if (v == null) return "";
  if (typeof v === "number" || typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(formatValue).join(", ");
  if (typeof v === "object") {
    const obj = v as Record<string, any>;
    if (typeof obj.current === "number" && typeof obj.max === "number") {
      return `${obj.current} / ${obj.max}`;
    }
    if (typeof obj.value === "number" || typeof obj.value === "string") return obj.value;
    if (typeof obj.name === "string") return obj.name;
    try { return JSON.stringify(obj); } catch { return String(obj); }
  }
  return String(v);
}

/** Canonical order for Outgunned-like attributes. */
const ATTR_ORDER = ["Brawn", "Nerves", "Smooth", "Focus", "Crime"];

/** Optional skill suggestions by attribute (we only render those that exist). */
const SKILLS_BY_ATTR: Record<string, string[]> = {
  Brawn: ["Athletics", "Brawling", "Endurance", "Melee", "Toughness", "Heavy Weapons"],
  Nerves: ["Cool", "Driving", "Piloting", "Reaction", "Initiative", "Guts"],
  Smooth: ["Charm", "Deceive", "Intimidate", "Performance", "Persuasion", "Disguise"],
  Focus: ["Awareness", "Investigation", "Medicine", "Science", "Tech", "Tactics"],
  Crime: ["Hacking", "Lockpicking", "Pickpocket", "Skulduggery", "Stealth", "Sabotage"],
};

/** Group any present skills by attribute, falling back to "Other". */
function computeGroupedSkills(
  skills: Record<string, any> | undefined
): Record<string, Array<[string, any]>> {
  const grouped: Record<string, Array<[string, any]>> = {};
  if (!skills) return grouped;

  // First, include the known mapping but filter only existing keys.
  for (const attr of ATTR_ORDER) {
    const names = SKILLS_BY_ATTR[attr] || [];
    const pairs: Array<[string, any]> = [];
    for (const k of names) {
      if (k in skills) pairs.push([k, skills[k]]);
    }
    if (pairs.length) grouped[attr] = pairs;
  }

  // Then, catch any extra skills not listed above.
  const consumed = new Set(Object.values(grouped).flat().map(([k]) => k));
  const leftovers: Array<[string, any]> = [];
  for (const [k, v] of Object.entries(skills)) {
    if (!consumed.has(k)) leftovers.push([k, v]);
  }
  if (leftovers.length) grouped["Other"] = leftovers;

  return grouped;
}

/** ---------- Component ---------- */

export default function CharacterDetails({ id }: { id: string }) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const data = await api(`/characters/${id}`);
        setCharacter(data);
      } catch (err) {
        console.error("Failed to load character:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const groupedSkills = useMemo(
    () => computeGroupedSkills(character?.skills),
    [character?.skills]
  );

  if (loading) return <p>Loading character...</p>;
  if (!character) return <p>Character not found.</p>;

  const {
    name,
    role,
    trope,
    age,
    background,
    flaw,
    catchphrase,
    attributes,
    feats,
    gear,
    resources,
    ride,
    notes,
  } = character;

  /** Render helpers */

  const renderKVGrid = (obj?: Record<string, any>) => {
    if (!obj) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
        {Object.entries(obj).map(([key, val]) => (
          <div
            key={key}
            className="rounded-2xl bg-gray-50 border px-3 py-2 flex items-center justify-between text-sm shadow-sm"
          >
            <span className="font-semibold break-words">{key}</span>
            <span className="ml-3 tabular-nums">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderList = (arr?: Array<any>) => {
    if (!arr || arr.length === 0) return null;
    return (
      <ul className="list-disc list-inside space-y-1">
        {arr.map((item, i) => (
          <li key={i}>{formatValue(item)}</li>
        ))}
      </ul>
    );
  };

  const renderAttributeCards = () => {
    if (!attributes && !character?.skills) return null;

    // Build a stable list of cards in canonical order, plus "Other" (if any), plus any ad-hoc attributes.
    const presentAttrNames = attributes ? Object.keys(attributes) : [];
    const knownInOrder = ATTR_ORDER.filter(a => presentAttrNames.includes(a) || groupedSkills[a]?.length);
    const unknownAttrs = presentAttrNames.filter(a => !ATTR_ORDER.includes(a));
    const order = [...knownInOrder, ...unknownAttrs];
    if (groupedSkills["Other"] && groupedSkills["Other"].length) order.push("Other");

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {order.map((attrName) => {
          const attrVal = attributes ? attributes[attrName] : undefined;
          const skillsForCard = groupedSkills[attrName] || [];

          return (
            <div
              key={attrName}
              className="rounded-2xl border shadow-sm bg-white overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-gray-100">
                <div className="text-lg font-semibold">{attrName}</div>
                {attrVal !== undefined && attrName !== "Other" && (
                  <div className="inline-flex items-center rounded-xl border bg-white px-3 py-1 text-base font-bold tabular-nums">
                    {formatValue(attrVal)}
                  </div>
                )}
              </div>

              {skillsForCard.length > 0 ? (
                <div className="px-4 py-3">
                  <div className="grid grid-cols-2 gap-3">
                    {skillsForCard.map(([skillName, value]) => (
                      <div
                        key={skillName}
                        className="flex items-center justify-between rounded-xl bg-gray-50 border px-3 py-2 text-sm"
                      >
                        <span className="mr-3">{skillName}</span>
                        <span className="font-semibold tabular-nums">
                          {formatValue(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">No skills listed.</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{name}</h1>
          <p className="text-gray-600">
            {formatValue(role)} — {formatValue(trope)}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {background && <span className="italic">Background: {formatValue(background)}</span>}
            {age !== undefined && <span>Age: {formatValue(age)}</span>}
          </div>
          {catchphrase && <p className="text-sm mt-1">“{formatValue(catchphrase)}”</p>}
          {flaw && <p className="text-sm mt-1 text-red-700">Flaw: {formatValue(flaw)}</p>}
        </div>

        <button
          onClick={() => navigate(`/character/${id}/edit`)}
          className="bg-black text-white px-4 py-2 rounded-xl hover:opacity-90 shadow-sm"
        >
          Edit
        </button>
      </div>

      {/* Resources */}
      {resources && (
        <section>
          <h2 className="text-xl font-semibold mb-2">Resources</h2>
          {renderKVGrid(resources)}
        </section>
      )}

      {/* Ride */}
      {ride && (
        <section>
          <h2 className="text-xl font-semibold mb-2">Ride</h2>
          <p className="bg-gray-50 border rounded-2xl px-4 py-3 shadow-sm">
            {formatValue(ride)}
          </p>
        </section>
      )}

      {/* Attributes & Skills (Grouped Cards) */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Attributes & Skills</h2>
        {renderAttributeCards()}
      </section>

      {/* Feats */}
      {feats && feats.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-2">Feats</h2>
          <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
            {renderList(feats)}
          </div>
        </section>
      )}

      {/* Gear */}
      {gear && gear.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-2">Gear</h2>
          <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
            {renderList(gear)}
          </div>
        </section>
      )}

      {/* Notes */}
      {notes && (
        <section>
          <h2 className="text-xl font-semibold mb-2">Notes</h2>
          <p className="whitespace-pre-wrap bg-gray-50 border rounded-2xl px-4 py-3 shadow-sm">
            {notes}
          </p>
        </section>
      )}
    </div>
  );
}
