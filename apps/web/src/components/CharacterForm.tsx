import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

/**
 * Drop-in CharacterForm
 * - Props:
 *    - initialData?: any  -> prefill the form (for edit mode)
 *    - mode?: "create" | "edit" (default "create")
 *    - onSaved?: (id?: string) => void  -> called after successful save
 */

type Props = {
  initialData?: any;
  mode?: "create" | "edit";
  onSaved?: (id?: string) => void;
};

/** ---------- Utils ---------- */

function toNumberOrString(v: any): number | string {
  // Accept numeric-ish strings as numbers, otherwise keep as string
  if (v === "" || v === null || v === undefined) return "";
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) && String(v).trim() !== "" ? n : String(v);
}

function safeRecord(obj: any, fallback: Record<string, any> = {}) {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) return { ...obj };
  return { ...fallback };
}

function safeArray(arr: any, fallback: any[] = []) {
  if (Array.isArray(arr)) return [...arr];
  return [...fallback];
}

// Turn arrays of strings into comma-separated string for display/edit
function arrToText(arr?: string[]) {
  if (!arr || !arr.length) return "";
  return arr.join(", ");
}

// Turn comma-separated input back to trimmed unique array (keeping order)
function textToArr(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

// Deep clone to avoid mutating props
function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v ?? null));
}

/** ---------- Component ---------- */

export default function CharacterForm({ initialData, mode = "create", onSaved }: Props) {
  // Core identity
  const [id, setId] = useState<string | undefined>(initialData?.id);
  const [name, setName] = useState<string>(initialData?.name ?? "");
  const [role, setRole] = useState<string>(stringifyMaybe(initialData?.role));
  const [trope, setTrope] = useState<string>(stringifyMaybe(initialData?.trope));
  const [age, setAge] = useState<string | number>(initialData?.age ?? "");
  const [background, setBackground] = useState<string>(stringifyMaybe(initialData?.background));
  const [flaw, setFlaw] = useState<string>(stringifyMaybe(initialData?.flaw));
  const [catchphrase, setCatchphrase] = useState<string>(stringifyMaybe(initialData?.catchphrase));

  // Structured sections
  const [attributes, setAttributes] = useState<Record<string, number | string>>(
    normalizeNumMap(initialData?.attributes)
  );
  const [skills, setSkills] = useState<Record<string, number | string>>(
    normalizeNumMap(initialData?.skills)
  );
  const [resources, setResources] = useState<Record<string, number | string>>(
    normalizeResources(initialData?.resources)
  );

  // Lists
  const [featsText, setFeatsText] = useState<string>(arrToText(safeArray(initialData?.feats)));
  const [gearText, setGearText] = useState<string>(arrToText(safeArray(initialData?.gear)));

  // Misc
  const [ride, setRide] = useState<string>(stringifyMaybe(initialData?.ride));
  const [notes, setNotes] = useState<string>(initialData?.notes ?? "");

  // UX
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = mode === "edit";

  // When initialData changes (navigating between characters), refresh the form
  useEffect(() => {
    if (!initialData) return;
    setId(initialData.id);
    setName(initialData.name ?? "");
    setRole(stringifyMaybe(initialData.role));
    setTrope(stringifyMaybe(initialData.trope));
    setAge(initialData.age ?? "");
    setBackground(stringifyMaybe(initialData.background));
    setFlaw(stringifyMaybe(initialData.flaw));
    setCatchphrase(stringifyMaybe(initialData.catchphrase));

    setAttributes(normalizeNumMap(initialData.attributes));
    setSkills(normalizeNumMap(initialData.skills));
    setResources(normalizeResources(initialData.resources));

    setFeatsText(arrToText(safeArray(initialData.feats)));
    setGearText(arrToText(safeArray(initialData.gear)));

    setRide(stringifyMaybe(initialData.ride));
    setNotes(initialData.notes ?? "");
    setError(null);
  }, [initialData]);

  const feats = useMemo(() => textToArr(featsText), [featsText]);
  const gear = useMemo(() => textToArr(gearText), [gearText]);

  /** ---------- Handlers ---------- */

  const handleKVAdd = (setFn: React.Dispatch<React.SetStateAction<Record<string, any>>>, keyHint = "") => {
    setFn((prev) => {
      const next = { ...prev };
      let i = 1;
      const base = keyHint || "New";
      let key = base;
      while (key in next) key = `${base} ${++i}`;
      next[key] = 0;
      return next;
    });
  };

  const handleKVChange = (
    setFn: React.Dispatch<React.SetStateAction<Record<string, any>>>,
    key: string,
    value: string
  ) => {
    setFn((prev) => {
      const next = { ...prev };
      // try number, fallback to string
      next[key] = toNumberOrString(value);
      return next;
    });
  };

  const handleKVKeyRename = (
    setFn: React.Dispatch<React.SetStateAction<Record<string, any>>>,
    oldKey: string,
    newKey: string
  ) => {
    setFn((prev) => {
      const next = { ...prev };
      if (!newKey || newKey === oldKey) return next;
      if (newKey in next) return next; // don't clobber
      next[newKey] = next[oldKey];
      delete next[oldKey];
      return next;
    });
  };

  const handleKVRemove = (setFn: React.Dispatch<React.SetStateAction<Record<string, any>>>, key: string) => {
    setFn((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Build payload in the shape your API expects
      const payload: any = {
        id,
        name: (name || "").trim(),
        role: compactMaybe(role),
        trope: compactMaybe(trope),
        age: age === "" ? undefined : age,
        background: compactMaybe(background),
        flaw: compactMaybe(flaw),
        catchphrase: compactMaybe(catchphrase),
        attributes: cleanNumMap(attributes),
        skills: cleanNumMap(skills),
        resources: cleanNumMap(resources),
        feats,
        gear,
        ride: compactMaybe(ride),
        notes: notes,
      };

      // Basic client-side guard
      if (!payload.name) {
        throw new Error("Name is required.");
      }

      let saved: any;
      if (isEdit && payload.id) {
        saved = await api(`/characters/${payload.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        saved = await api("/characters", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      const savedId = saved?.id ?? payload.id;
      onSaved?.(savedId);
    } catch (err: any) {
      setError(err?.message || "Failed to save character.");
    } finally {
      setSaving(false);
    }
  };

  /** ---------- Render ---------- */

  return (
    <form className="space-y-8 text-gray-900" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 text-red-800 px-4 py-2">
          {error}
        </div>
      )}

      {/* Identity */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Name" value={name} onChange={setName} required />
          <TextField label="Age" value={age} onChange={(v) => setAge(toNumberOrString(v))} />
          <TextField label="Role" value={role} onChange={setRole} />
          <TextField label="Trope" value={trope} onChange={setTrope} />
          <TextField label="Background / Job" value={background} onChange={setBackground} />
          <TextField label="Flaw" value={flaw} onChange={setFlaw} />
          <TextField label="Catchphrase" value={catchphrase} onChange={setCatchphrase} />
        </div>
      </section>

      {/* Resources */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Resources</h2>
          <button type="button" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50"
            onClick={() => handleKVAdd(setResources, "Resource")}>
            + Add Resource
          </button>
        </div>
        <KVTable
          data={resources}
          onChangeValue={(k, v) => handleKVChange(setResources, k, v)}
          onRenameKey={(oldK, newK) => handleKVKeyRename(setResources, oldK, newK)}
          onRemoveKey={(k) => handleKVRemove(setResources, k)}
        />
      </section>

      {/* Attributes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Attributes</h2>
          <button type="button" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50"
            onClick={() => handleKVAdd(setAttributes, "Attribute")}>
            + Add Attribute
          </button>
        </div>
        <KVTable
          data={attributes}
          onChangeValue={(k, v) => handleKVChange(setAttributes, k, v)}
          onRenameKey={(oldK, newK) => handleKVKeyRename(setAttributes, oldK, newK)}
          onRemoveKey={(k) => handleKVRemove(setAttributes, k)}
        />
      </section>

      {/* Skills */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Skills</h2>
          <button type="button" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50"
            onClick={() => handleKVAdd(setSkills, "Skill")}>
            + Add Skill
          </button>
        </div>
        <KVTable
          data={skills}
          onChangeValue={(k, v) => handleKVChange(setSkills, k, v)}
          onRenameKey={(oldK, newK) => handleKVKeyRename(setSkills, oldK, newK)}
          onRemoveKey={(k) => handleKVRemove(setSkills, k)}
        />
      </section>

      {/* Feats & Gear */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Feats & Gear</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextArea
            label="Feats (comma separated)"
            value={featsText}
            onChange={setFeatsText}
            placeholder="Example: Quick Draw, Improvised Weapons, Parkour"
          />
          <TextArea
            label="Gear (comma separated)"
            value={gearText}
            onChange={setGearText}
            placeholder="Example: 9mm Pistol, Flashlight, Lockpicks"
          />
        </div>
      </section>

      {/* Ride & Notes */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Ride & Notes</h2>
        <TextField label="Ride" value={ride} onChange={setRide} />
        <TextArea
          label="Notes"
          value={notes}
          onChange={setNotes}
          placeholder="Mission/Treasure, Achievements, Bonds/Scars/Reputations, etc."
          rows={6}
        />
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Character"}
        </button>
      </div>
    </form>
  );
}

/** ---------- Small UI helpers ---------- */

function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void | any;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}{required ? " *" : ""}</span>
      <input
        className="w-full rounded-xl border px-3 py-2 bg-white text-gray-900"
        value={value as any}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      <textarea
        className="w-full rounded-xl border px-3 py-2 bg-white text-gray-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </label>
  );
}

function KVTable({
  data,
  onChangeValue,
  onRenameKey,
  onRemoveKey,
}: {
  data: Record<string, any>;
  onChangeValue: (key: string, value: string) => void;
  onRenameKey: (oldKey: string, newKey: string) => void;
  onRemoveKey: (key: string) => void;
}) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <div className="text-sm text-gray-500">No entries. Add one to get started.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {entries.map(([key, val]) => (
        <div key={key} className="grid grid-cols-12 gap-2 items-center">
          <input
            className="col-span-5 rounded-xl border px-3 py-2 bg-white text-gray-900"
            value={key}
            onChange={(e) => onRenameKey(key, e.target.value)}
          />
          <input
            className="col-span-5 rounded-xl border px-3 py-2 bg-white text-gray-900"
            value={String(val ?? "")}
            onChange={(e) => onChangeValue(key, e.target.value)}
          />
          <button
            type="button"
            className="col-span-2 px-3 py-2 rounded-xl border hover:bg-gray-50"
            onClick={() => onRemoveKey(key)}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

/** ---------- Normalizers & compacters ---------- */

function stringifyMaybe(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    // pull common shapes
    if (typeof v.name === "string") return v.name;
    if (typeof v.value === "string" || typeof v.value === "number") return String(v.value);
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function compactMaybe(v: any): any {
  // Empty string -> undefined; keep numbers; keep non-empty strings
  if (v === "" || v === undefined || v === null) return undefined;
  return v;
}

function normalizeNumMap(obj: any): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  const rec = safeRecord(obj);
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === "object" && v !== null) {
      // pull common {value} or {current,max} shapes, else stringify
      if (typeof (v as any).value === "number" || typeof (v as any).value === "string") {
        out[k] = toNumberOrString((v as any).value);
      } else if (
        typeof (v as any).current === "number" &&
        typeof (v as any).max === "number"
      ) {
        // Store as "current/max" for editing; CharacterDetails renders nicely
        out[k] = `${(v as any).current}/${(v as any).max}`;
      } else if (typeof (v as any).name === "string") {
        out[k] = (v as any).name;
      } else {
        out[k] = String(v as any);
      }
    } else {
      out[k] = toNumberOrString(v);
    }
  }
  return out;
}

function cleanNumMap(obj: Record<string, number | string>) {
  // Convert "3/5" back to {current:3,max:5} if pattern matches, else keep numbers/strings
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (typeof v === "string" && /^\s*\d+\s*\/\s*\d+\s*$/.test(v)) {
      const [c, m] = v.split("/").map((x) => Number(x.trim()));
      out[k] = { current: c, max: m };
    } else {
      out[k] = toNumberOrString(v);
    }
  }
  return out;
}

function normalizeResources(obj: any): Record<string, number | string> {
  // Resources might be numbers or meters
  const out: Record<string, number | string> = {};
  const rec = safeRecord(obj);
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === "object" && v !== null) {
      const cur = (v as any).current;
      const max = (v as any).max;
      if (typeof cur === "number" && typeof max === "number") {
        out[k] = `${cur}/${max}`; // editable; we convert back on save
      } else if (typeof (v as any).value !== "undefined") {
        out[k] = toNumberOrString((v as any).value);
      } else if (typeof (v as any).name === "string") {
        out[k] = (v as any).name;
      } else {
        out[k] = String(v as any);
      }
    } else {
      out[k] = toNumberOrString(v);
    }
  }
  return out;
}
