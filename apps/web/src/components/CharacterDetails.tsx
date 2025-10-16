import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

/** ---------- Types ---------- */
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

/** ---------- Formatting helpers ---------- */
function formatValue(v: unknown): string | number {
  if (v == null) return "";
  if (typeof v === "number" || typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(formatValue).join(", ");
  if (typeof v === "object") {
    const obj = v as Record<string, any>;
    if (typeof obj.current === "number" && typeof obj.max === "number") return `${obj.current} / ${obj.max}`;
    if (typeof obj.value === "number" || typeof obj.value === "string") return obj.value;
    if (typeof obj.name === "string") return obj.name;
    try { return JSON.stringify(obj); } catch { return String(obj); }
  }
  return String(v);
}

const ATTR_ORDER = ["Brawn", "Nerves", "Smooth", "Focus", "Crime"] as const;
type AttrName = typeof ATTR_ORDER[number];

/** Normalize helper used in several places */
const norm = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[_-]/g, " ");

/** ---------- Canonical skills by attribute ---------- */
const SKILLS_BY_ATTR: Record<AttrName, string[]> = {
  Brawn: ["Endure","Fight","Force","Stunt"],
  Nerves: ["Cool","Drive","Shoot","Survival"],
  Smooth: ["Flirt","Leadership","Speech","Style"],
  Focus: ["Detect","Fix","Heal","Know"],
  Crime: ["Awareness","Dexterity","Stealth","Streetwise"],
};

/** Stronger mapping (case-insensitive; matches substrings & synonyms) */
const CUSTOM_SKILL_TO_ATTR: Record<string, AttrName> = {
  // --- Brawn ---
  "endure": "Brawn",
  "fight": "Brawn",
  "force": "Brawn",
  "stunt": "Brawn",

  // --- Nerves (reflexes / gunplay / dexterity) ---
  "cool": "Nerves",
  "drive": "Nerves",
  "shoot": "Nerves",
  "survival": "Nerves",

  // --- Smooth (social / presence) ---
  "flirt": "Smooth",
  "leadership": "Smooth",
  "speech": "Smooth",
  "style": "Smooth",

  // --- Focus (perception / knowledge / tech / medicine) ---
  "detect": "Focus",
  "fix": "Focus",
  "heal": "Focus",
  "know": "Focus",

  // --- Crime (streets / underworld) ---
  "awareness": "Crime",
  "dexterity": "Crime",
  "stealth": "Crime",
  "streetwise": "Crime",
};

/** Build reverse map from the canonical lists, too */
const REVERSE_FROM_CANON: Record<string, AttrName> = {};
for (const attr of ATTR_ORDER) {
  for (const s of SKILLS_BY_ATTR[attr]) REVERSE_FROM_CANON[norm(s)] = attr;
}

/** Final resolver: CUSTOM (substring) > Canonical (exact after normalizing) */
function resolveAttrForSkill(raw: string): AttrName | "Other" {
  const n = norm(raw);
  for (const [needle, attr] of Object.entries(CUSTOM_SKILL_TO_ATTR)) {
    if (n.includes(needle)) return attr;
  }
  if (REVERSE_FROM_CANON[n]) return REVERSE_FROM_CANON[n];
  return "Other";
}

function groupSkills(skills: Record<string, any> | undefined): Record<string, Array<[string, any]>> {
  const grouped: Record<string, Array<[string, any]>> = {};
  if (!skills) return grouped;
  for (const [k, v] of Object.entries(skills)) {
    const bucket = resolveAttrForSkill(k);
    if (!grouped[bucket]) grouped[bucket] = [];
    grouped[bucket].push([k, v]);
  }
  return grouped;
}

/** ---------- Attribute canonicalization (fixes "Brawn" vs "brawn") ---------- */
const ATTR_SET = new Set<AttrName>(ATTR_ORDER);
const ATTR_ALIASES: Record<string, AttrName> = {
  brawn: "Brawn",
  nerves: "Nerves",
  smooth: "Smooth",
  focus: "Focus",
  crime: "Crime",
};

function canonAttrName(raw: string): AttrName | null {
  const n = norm(raw);
  if (ATTR_ALIASES[n]) return ATTR_ALIASES[n];
  const title = raw.trim();
  if (ATTR_SET.has(title as AttrName)) return title as AttrName;
  return null;
}

function normalizeAttributes(attrs?: Record<string, any>): Partial<Record<AttrName, any>> {
  if (!attrs) return {};
  const out: Partial<Record<AttrName, any>> = {};
  for (const [k, v] of Object.entries(attrs)) {
    const canon = canonAttrName(k);
    if (!canon) continue;
    out[canon] = v;
  }
  return out;
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
        // Normalize attribute keys so duplicates like "Brawn"/"brawn" collapse
        const normalizedAttrs = normalizeAttributes(data?.attributes);
        setCharacter({ ...data, attributes: normalizedAttrs });
      } catch (err) {
        console.error("Failed to load character:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const groupedSkills = useMemo(() => groupSkills(character?.skills), [character?.skills]);

  if (loading) return <div className="max-w-4xl mx-auto p-6"><p className="text-gray-900">Loading character…</p></div>;
  if (!character) return <div className="max-w-4xl mx-auto p-6"><p className="text-gray-900">Character not found.</p></div>;

  const {
    name, role, trope, age, background, flaw, catchphrase,
    attributes, feats, gear, resources, ride, notes,
  } = character;

  /** UI helpers */
  const renderKVGrid = (obj?: Record<string, any>) => {
    if (!obj) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
        {Object.entries(obj).map(([key, val]) => (
          <div
            key={key}
            className="rounded-xl bg-white text-gray-900 border px-3 py-2 flex items-center justify-between text-sm shadow-sm"
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
      <ul className="list-disc list-inside space-y-1 text-gray-900">
        {arr.map((item, i) => <li key={i}>{formatValue(item)}</li>)}
      </ul>
    );
  };

  const renderAttributeCards = () => {
    const canonAttrs = attributes as Partial<Record<AttrName, any>> | undefined;
    const order: string[] = [];

    // only show canonical attributes that are present or have skills
    for (const a of ATTR_ORDER) {
      if ((canonAttrs && a in canonAttrs) || groupedSkills[a]?.length) order.push(a);
    }
    // "Other" (skills that couldn't be mapped)
    if (groupedSkills["Other"]?.length) order.push("Other");
    if (order.length === 0) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {order.map((attrName) => {
          const attrVal = canonAttrs ? canonAttrs[attrName as AttrName] : undefined;
          const skillsForCard = groupedSkills[attrName] || [];

          return (
            <div key={attrName} className="rounded-2xl border shadow-sm bg-white text-gray-900 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
                <div className="text-lg font-semibold">{attrName}</div>
                {attrVal !== undefined && attrName !== "Other" && (
                  <div className="inline-flex items-center rounded-xl border border-white/30 bg-gray-800 text-white px-3 py-1 text-base font-bold tabular-nums">
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
                        className="flex items-center justify-between rounded-xl bg-gray-50 text-gray-900 border px-3 py-2 text-sm"
                      >
                        <span className="mr-3">{skillName}</span>
                        <span className="font-semibold tabular-nums">{formatValue(value)}</span>
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
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      {/* White card wrapper guarantees readability on dark pages */}
      <div className="rounded-2xl bg-white text-gray-900 shadow-lg p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">{name}</h1>
            <p className="text-gray-900">
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
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Resources</h2>
            {renderKVGrid(resources)}
          </section>
        )}

        {/* Ride */}
        {ride && (
          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Ride</h2>
            <p className="bg-gray-50 text-gray-900 border rounded-2xl px-4 py-3 shadow-sm">
              {formatValue(ride)}
            </p>
          </section>
        )}

        {/* Attributes & Skills */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Attributes & Skills</h2>
          {renderAttributeCards()}
        </section>

        {/* Feats */}
        {feats && feats.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Feats</h2>
            <div className="rounded-2xl border bg-white text-gray-900 px-4 py-3 shadow-sm">
              {renderList(feats)}
            </div>
          </section>
        )}

        {/* Gear */}
        {gear && gear.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Gear</h2>
            <div className="rounded-2xl border bg-white text-gray-900 px-4 py-3 shadow-sm">
              {renderList(gear)}
            </div>
          </section>
        )}

        {/* Notes */}
        {notes && (
          <section>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Notes</h2>
            <p className="whitespace-pre-wrap bg-gray-50 text-gray-900 border rounded-2xl px-4 py-3 shadow-sm">
              {notes}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
