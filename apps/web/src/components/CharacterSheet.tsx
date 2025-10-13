import React, { useEffect, useMemo, useState } from "react";
import data from "../data/outgunned_data.json"; // your updated JSON with *_options fields
import { api } from "../lib/api";

type Role = {
  name: string;
  attribute?: string;
  skills?: string[];
  feats?: string[];
  gear?: string[];
  jobs?: string[];
  catchphrases?: string[];
  flaws?: string[];

  feat_options?: string[];
  gear_options?: string[];
  jobs_options?: string[];
  catchphrases_options?: string[];
  flaws_options?: string[];
};

type Trope = {
  name: string;
  attribute?: string;
  skills?: string[];
  feats?: string[];
  attribute_options?: string[];
  feat_options?: string[];
};

type Feat = { name: string; text?: string };
type Gear = { name: string; text?: string };

type Character = {
  id?: string;
  name: string;
  role?: string | { name: string } | null;
  trope?: string | { name: string } | null;
  tropeAttribute?: string | null;
  age?: "Young" | "Adult" | "Old" | null;
  job?: string | null;
  catchphrase?: string | null;
  flaw?: string | null;
  feats: string[];
  gear: string[];
  // plus any JSON fields your API returns (attributes, skills, etc.)
};

type Props = {
  characterId?: string; // optional: if not provided, we read ?id= from URL
};

const ALL_AGES: Array<Character["age"]> = ["Young", "Adult", "Old"];

const Pill: React.FC<{
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}> = ({ selected, onClick, children, disabled, title }) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={[
      "px-3 py-1 rounded-full border text-sm",
      selected ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-300 hover:bg-slate-50",
      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
    ].join(" ")}
  >
    {children}
  </button>
);

export default function CharacterSheet({ characterId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // figure out id
  const id = useMemo(() => {
    if (characterId) return characterId;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("id") ?? undefined;
  }, [characterId]);

  const [original, setOriginal] = useState<Character | null>(null);
  const [local, setLocal] = useState<Character>({
    name: "",
    role: null,
    trope: null,
    tropeAttribute: null,
    age: null,
    job: null,
    catchphrase: null,
    flaw: null,
    feats: [],
    gear: [],
  });

  // ---------- load character ----------
  useEffect(() => {
    (async () => {
      if (!id) {
        setError("No character id found");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const row = await api(`/characters/${id}`);
        // Normalize role/trope to name strings for convenience
        const roleName =
          typeof row.role === "string" ? row.role : row.role?.name ?? null;
        const tropeName =
          typeof row.trope === "string" ? row.trope : row.trope?.name ?? null;

        const normalized: Character = {
          id: row.id,
          name: row.name ?? "",
          role: roleName,
          trope: tropeName,
          tropeAttribute: row.tropeAttribute ?? null,
          age: row.age ?? null,
          job: row.job ?? null,
          catchphrase: row.catchphrase ?? null,
          flaw: row.flaw ?? null,
          feats: Array.isArray(row.feats) ? row.feats : [],
          gear: Array.isArray(row.gear) ? row.gear : [],
        };
        setOriginal(normalized);
        setLocal(normalized);
      } catch (e: any) {
        console.error(e);
        setError("Failed to load character.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ---------- look up role/trope objects ----------
  const roleObj: Role | undefined = useMemo(() => {
    const rname = typeof local.role === "string" ? local.role : local.role?.name;
    return (data.roles as Role[]).find((r) => r.name === rname);
  }, [local.role]);

  const tropeObj: Trope | undefined = useMemo(() => {
    const tname = typeof local.trope === "string" ? local.trope : local.trope?.name;
    return (data.tropes as Trope[]).find((t) => t.name === tname);
  }, [local.trope]);

  // ---------- dynamic pools ----------
  const roleFeatOptions = useMemo<string[]>(
    () => (roleObj?.feat_options ?? roleObj?.feats ?? []) as string[],
    [roleObj]
  );

  const tropeFeatOptions = useMemo<string[]>(
    () => (tropeObj?.feat_options ?? tropeObj?.feats ?? []) as string[],
    [tropeObj]
  );

  const allowedFeatNames = useMemo<string[]>(() => {
    const s = new Set<string>([...roleFeatOptions, ...tropeFeatOptions]);
    return [...s];
  }, [roleFeatOptions, tropeFeatOptions]);

  const allowedFeats = useMemo<Feat[]>(
    () => (data.feats as Feat[]).filter((f) => allowedFeatNames.includes(f.name)),
    [allowedFeatNames]
  );

  const allowedGearNames = useMemo<string[]>(
    () => (roleObj?.gear_options ?? roleObj?.gear ?? []) as string[],
    [roleObj]
  );

  const allowedGear = useMemo<Gear[]>(
    () => (data.gear as Gear[]).filter((g) => allowedGearNames.includes(g.name)),
    [allowedGearNames]
  );

  const roleJobs = useMemo<string[]>(
    () => (roleObj?.jobs_options ?? roleObj?.jobs ?? []) as string[],
    [roleObj]
  );
  const roleCatchphrases = useMemo<string[]>(
    () => (roleObj?.catchphrases_options ?? roleObj?.catchphrases ?? []) as string[],
    [roleObj]
  );
  const roleFlaws = useMemo<string[]>(
    () => (roleObj?.flaws_options ?? roleObj?.flaws ?? []) as string[],
    [roleObj]
  );

  const needsTropeAttribute = !!tropeObj?.attribute_options?.length;

  // ---------- helpers ----------
  const toggleInArray = (arr: string[], value: string): string[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const onSave = async () => {
    if (!local.id) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<Character> = {
        name: local.name?.trim() || "Unnamed",
        role: typeof local.role === "string" ? local.role : local.role?.name ?? null,
        trope: typeof local.trope === "string" ? local.trope : local.trope?.name ?? null,
        age: local.age ?? null,
        job: local.job ?? null,
        catchphrase: local.catchphrase ?? null,
        flaw: local.flaw ?? null,
        tropeAttribute: local.tropeAttribute ?? null,
        feats: local.feats,
        gear: local.gear,
      };

      const row = await api(`/characters/${local.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // reflect server result
      const updated: Character = {
        id: row.id,
        name: row.name ?? "",
        role: typeof row.role === "string" ? row.role : row.role?.name ?? null,
        trope: typeof row.trope === "string" ? row.trope : row.trope?.name ?? null,
        tropeAttribute: row.tropeAttribute ?? null,
        age: row.age ?? null,
        job: row.job ?? null,
        catchphrase: row.catchphrase ?? null,
        flaw: row.flaw ?? null,
        feats: Array.isArray(row.feats) ? row.feats : [],
        gear: Array.isArray(row.gear) ? row.gear : [],
      };
      setOriginal(updated);
      setLocal(updated);
    } catch (e: any) {
      console.error(e);
      setError("Save failed. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!local.id) return <div className="p-4">No character loaded.</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <input
          className="flex-1 border rounded px-3 py-2 text-lg"
          placeholder="Character name"
          value={local.name}
          onChange={(e) => setLocal({ ...local, name: e.target.value })}
        />
        <button
          className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Quick facts */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="border rounded p-3">
          <div className="text-xs opacity-70">Role</div>
          <div className="font-semibold">{typeof local.role === "string" ? local.role : local.role?.name ?? "—"}</div>
          <div className="text-xs opacity-70 mt-2">Trope</div>
          <div className="font-semibold">{typeof local.trope === "string" ? local.trope : local.trope?.name ?? "—"}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs opacity-70">Age</div>
          <div className="mt-2 flex gap-2 flex-wrap">
            {ALL_AGES.map((a) => (
              <Pill key={a} selected={local.age === a} onClick={() => setLocal({ ...local, age: a })}>
                {a}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      {/* Trope attribute if needed */}
      {needsTropeAttribute && (
        <div className="border rounded p-3">
          <div className="text-sm font-semibold mb-2">Trope Attribute</div>
          <div className="flex gap-2 flex-wrap">
            {tropeObj!.attribute_options!.map((opt) => (
              <Pill
                key={opt}
                selected={local.tropeAttribute === opt}
                onClick={() => setLocal({ ...local, tropeAttribute: opt })}
              >
                {opt}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {/* Personal (role-scoped) */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="border rounded p-3">
          <div className="text-sm font-semibold mb-2">Job</div>
          <div className="flex flex-wrap gap-2">
            {roleJobs.length
              ? roleJobs.map((j) => (
                  <Pill key={j} selected={local.job === j} onClick={() => setLocal({ ...local, job: j })}>
                    {j}
                  </Pill>
                ))
              : <div className="text-xs opacity-60">No job options for this role.</div>}
          </div>
        </div>

        <div className="border rounded p-3">
          <div className="text-sm font-semibold mb-2">Catchphrase</div>
          <div className="flex flex-wrap gap-2">
            {roleCatchphrases.length
              ? roleCatchphrases.map((c) => (
                  <Pill key={c} selected={local.catchphrase === c} onClick={() => setLocal({ ...local, catchphrase: c })}>
                    {c}
                  </Pill>
                ))
              : <div className="text-xs opacity-60">No catchphrase options for this role.</div>}
          </div>
        </div>

        <div className="border rounded p-3">
          <div className="text-sm font-semibold mb-2">Flaw</div>
          <div className="flex flex-wrap gap-2">
            {roleFlaws.length
              ? roleFlaws.map((f) => (
                  <Pill key={f} selected={local.flaw === f} onClick={() => setLocal({ ...local, flaw: f })}>
                    {f}
                  </Pill>
                ))
              : <div className="text-xs opacity-60">No flaw options for this role.</div>}
          </div>
        </div>
      </div>

      {/* Feats */}
      <section>
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-sm font-semibold">Feats</div>
          <div className="text-xs opacity-70">
            Allowed from Role/Trope menus only
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {allowedFeats.map((f) => {
            const selected = local.feats.includes(f.name);
            const fromTrope =
              tropeObj?.feat_options?.includes(f.name) || tropeObj?.feats?.includes(f.name);
            const fromRole =
              roleObj?.feat_options?.includes(f.name) || roleObj?.feats?.includes(f.name);
            const source = fromTrope ? "Trope" : fromRole ? "Role" : "";

            return (
              <div key={f.name} className={`border rounded p-3 ${selected ? "border-blue-600" : "border-slate-300"}`}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{f.name}</div>
                  {source && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border">{source}</span>}
                </div>
                {f.text && <div className="text-xs opacity-80 mt-1">{f.text}</div>}
                <div className="mt-2">
                  <Pill
                    selected={selected}
                    onClick={() => setLocal({ ...local, feats: toggleInArray(local.feats, f.name) })}
                  >
                    {selected ? "Remove" : "Add"}
                  </Pill>
                </div>
              </div>
            );
          })}
          {!allowedFeats.length && (
            <div className="text-xs opacity-60">No feats allowed for the current Role/Trope.</div>
          )}
        </div>
      </section>

      {/* Gear */}
      <section>
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-sm font-semibold">Gear</div>
          <div className="text-xs opacity-70">Allowed from Role menu only</div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {allowedGear.map((g) => {
            const selected = local.gear.includes(g.name);
            return (
              <div key={g.name} className={`border rounded p-3 ${selected ? "border-blue-600" : "border-slate-300"}`}>
                <div className="font-semibold">{g.name}</div>
                {g.text && <div className="text-xs opacity-80 mt-1">{g.text}</div>}
                <div className="mt-2">
                  <Pill
                    selected={selected}
                    onClick={() => setLocal({ ...local, gear: toggleInArray(local.gear, g.name) })}
                  >
                    {selected ? "Remove" : "Add"}
                  </Pill>
                </div>
              </div>
            );
          })}
          {!allowedGear.length && (
            <div className="text-xs opacity-60">No gear allowed for the current Role.</div>
          )}
        </div>
      </section>
    </div>
  );
}
