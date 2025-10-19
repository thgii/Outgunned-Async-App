// apps/web/src/routes/Character.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import CharacterSheetv2 from "../components/CharacterSheetv2";

/** ---------- Types (keep in sync with the rest of the app) ---------- */
type Meter = { current?: number; max?: number };
type MaybeNamed = { name?: string; value?: any; label?: any };

type Character = {
  id: string;
  name: string;
  role: string | MaybeNamed;
  trope: string | MaybeNamed;
  age?: string | number;
  background?: string | MaybeNamed;
  job?: string | MaybeNamed;
  jobOrBackground?: string | MaybeNamed;
  flaw?: string | MaybeNamed;
  catchphrase?: string | MaybeNamed;
  attributes?: Record<string, number | MaybeNamed>;
  skills?: Record<string, number | MaybeNamed>;
  feats?: Array<string | MaybeNamed>;
  gear?: Array<string | MaybeNamed>;
  resources?: Record<string, any>;
  storage?: any;
  grit?: Meter;
  adrenaline?: number;
  spotlight?: number;
  luck?: number;
  cash?: number;
  ride?: string | MaybeNamed;
  notes?: string;
  youLookSelected?: string[];
  isBroken?: boolean;
  deathRoulette?: [boolean, boolean, boolean, boolean, boolean, boolean];
};

type SavingState = "idle" | "saving" | "saved" | "error";

/** ---------- Helpers ---------- */
function asNumber(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getMaybeName(v: any): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "object") return v.name ?? v.value ?? v.label ?? undefined;
  if (typeof v === "string") return v || undefined;
  return String(v);
}

/** Ensure storage shape matches Worker validator. */
function sanitizeStorage(s: any) {
  if (!s) return undefined;
  const out: any = { ...s };

  // Normalize gunsAndGear array
  if (Array.isArray(out.gunsAndGear)) {
    out.gunsAndGear = out.gunsAndGear
      .filter(Boolean)
      .map((item: any) => {
        if (item == null) return undefined;
        if (typeof item === "string") {
          return { name: item, qty: 1, ranges: {} };
        }
        if (typeof item === "object") {
          const name =
            typeof item.name === "string"
              ? item.name
              : (item?.value ?? item?.label ?? undefined);
          const qty = Number(item.qty ?? 1);
          const ranges =
            item.ranges && typeof item.ranges === "object" ? item.ranges : {};
          return { ...item, name, qty, ranges };
        }
        return { name: String(item), qty: 1, ranges: {} };
      })
      .filter(Boolean);
  }

  return out;
}

/** Normalize server payload -> shape the sheet expects (top-level fields). */
function normalizeForSheet(c: any): Character {
  const fromResources = (k: string, fallback?: any) =>
    c?.[k] ?? c?.resources?.[k] ?? fallback;

  // Prefer job, then background, stringify MaybeNamed
  const jobOrBackgroundRaw =
    c.job ??
    c.background ??
    c.jobOrBackground ??
    c?.resources?.job ??
    c?.resources?.background;

  const jobOrBackground = getMaybeName(jobOrBackgroundRaw) ?? "";

  // Ride: keep a top-level string for UI, but store under resources in DB
  const ride = getMaybeName(c?.ride ?? c?.resources?.ride);

  // Grit may be on top-level or inside resources (as a meter)
  const gritObj = c?.grit ?? c?.resources?.grit ?? {};
  const grit: Meter = {
    current: clamp(asNumber(gritObj.current, 0), 0, 12),
    max: clamp(asNumber(gritObj.max, 12), 1, 12),
  };

  // Numbers commonly stored under resources
  const adrenaline = asNumber(fromResources("adrenaline", 0), 0);
  const spotlight = asNumber(fromResources("spotlight", 0), 0);
  const luck = asNumber(fromResources("luck", 0), 0);
  const cash = asNumber(fromResources("cash", 0), 0);

  // Storage: accept top-level, resources.storage, or fall back to gear list
  const storage = sanitizeStorage(
    c?.storage ??
      c?.resources?.storage ??
      (Array.isArray(c?.gear) ? { gunsAndGear: c.gear } : undefined)
  );

  // --- You Look / Death Roulette / Broken rehydration ---
  const youLookSelected =
    (Array.isArray(c?.youLookSelected) && c.youLookSelected) ||
    (Array.isArray(c?.conditions) && c.conditions) ||
    (Array.isArray(c?.resources?.youLookSelected) &&
      c.resources.youLookSelected) ||
    [];

  const deathRouletteRaw = c?.deathRoulette ?? c?.resources?.deathRoulette;
  const deathRoulette: [boolean, boolean, boolean, boolean, boolean, boolean] =
    Array.isArray(deathRouletteRaw) && deathRouletteRaw.length === 6
      ? (deathRouletteRaw.map(Boolean) as any)
      : [false, false, false, false, false, false];

  const isBroken =
    typeof c?.isBroken === "boolean"
      ? c.isBroken
      : typeof c?.resources?.isBroken === "boolean"
      ? c.resources.isBroken
      : youLookSelected.length >= 3;

  // Ensure resources exists and mirror normalized fields into it
  const resources: any = { ...(c?.resources ?? {}) };
  resources.grit = { current: grit.current ?? 0, max: grit.max ?? 12 };
  resources.adrenaline = adrenaline;
  resources.spotlight = spotlight;
  resources.luck = luck;
  resources.cash = cash;
  if (storage !== undefined) resources.storage = storage;
  resources.youLookSelected = youLookSelected;
  resources.deathRoulette = deathRoulette;
  resources.isBroken = isBroken;
  if (ride !== undefined) resources.ride = ride;

  return {
    ...(c ?? {}),
    jobOrBackground,
    ride,
    grit,
    adrenaline,
    spotlight,
    luck,
    cash,
    storage,
    resources,
    youLookSelected,
    deathRoulette,
    isBroken,
  };
}

/** Map sheet state -> server payload (put meters/numbers under resources). */
function mapToServerPayload(next: Character): any {
  const payload: any = { ...next };

  // --- NEW: ensure backend gets `job` explicitly ---
  // Accept strings or {name,label,value} and coerce to a plain string.
  const coerceName = (v: any): string | null => {
    if (v == null) return null;
    if (typeof v === "object") return (v.name ?? v.label ?? v.value ?? "").toString() || null;
    if (typeof v === "string") return v.trim() || null;
    return String(v);
  };
  if ("jobOrBackground" in next) {
    payload.job = coerceName(next.jobOrBackground);
  }

  // Ensure resources exists
  payload.resources = { ...(payload.resources ?? {}) };

  // Move resource-like fields under resources (grit 0–12)
  const cur = clamp(asNumber(next.grit?.current, 0), 0, 12);
  const max = clamp(asNumber(next.grit?.max, 12), 1, 12);
  payload.resources.grit = { current: cur, max };

  payload.resources.adrenaline = asNumber(next.adrenaline, 0);
  payload.resources.spotlight = asNumber(next.spotlight, 0);
  payload.resources.luck = asNumber(next.luck, 0);
  payload.resources.cash = asNumber(next.cash, 0);

  // Ride: keep top-level for UI but store as string under resources
  const rideStr =
    (typeof next.ride === "string" ? next.ride : next.ride?.name) ??
    (typeof next.resources?.ride === "string" ? next.resources.ride : next.resources?.ride?.name) ??
    null;
  if (rideStr != null) payload.resources.ride = rideStr;

  // Gear / storage normalization passthrough if present
  if (next.storage) {
    payload.resources.storage = next.storage;
  } else if (next.resources?.storage) {
    payload.resources.storage = next.resources.storage;
  }

  // You Look / Broken / Death Roulette: keep whatever the sheet set
  if (Array.isArray(next.youLookSelected)) payload.resources.youLookSelected = next.youLookSelected;
  if (typeof next.isBroken === "boolean") payload.resources.isBroken = next.isBroken;
  if (Array.isArray(next.deathRoulette)) payload.resources.deathRoulette = next.deathRoulette;

  // Clean top-level duplicates that are mirrored under resources
  delete payload.grit;
  delete payload.adrenaline;
  delete payload.spotlight;
  delete payload.luck;
  delete payload.cash;

  return payload;
}

/** ---------- Route Component ---------- */
export default function CharacterRoute() {
  const navigate = useNavigate();
  const params = useParams();
  // Support either /characters/:id or /characters/:characterId
  const id = (params as any).id || (params as any).characterId || "";

  const [character, setCharacter] = useState<Character | null>(null);
  const [saving, setSaving] = useState<SavingState>("idle");
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const isDirtyRef = useRef(false);
  const latestRef = useRef<Character | null>(null);

  // Load character
  useEffect(() => {
    let cancel = false;

    async function load() {
      setError(null);
      try {
        const c = await api(`/characters/${id}`);
        if (cancel) return;
        const normalized = normalizeForSheet(c);
        setCharacter(normalized);
        latestRef.current = normalized;
        isDirtyRef.current = false;
        setSaving("idle");
      } catch (e: any) {
        if (cancel) return;
        setError(e?.message ?? "Failed to load character.");
        setSaving("error");
      }
    }

    if (id) load();
    return () => {
      cancel = true;
    };
  }, [id]);

  // AUTOSAVE: debounce onChange calls
  const onChange = (next: Character) => {
    setCharacter(next);
    latestRef.current = next;
    isDirtyRef.current = true;
    setSaving("saving");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void saveNow(next);
    }, 600);
  };

  // Manual "Save now" (also used by debounce)
  async function saveNow(next: Character) {
    try {
      setSaving("saving");
      const payload = mapToServerPayload(next);
      await api(`/characters/${next.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      isDirtyRef.current = false;
      setSaving("saved");
      // brief confirmation pulse
      window.setTimeout(() => setSaving("idle"), 800);
    } catch (e: any) {
      console.error("Save failed", e);
      setSaving("error");
      setError(
        typeof e === "object" && e
          ? JSON.stringify(e)
          : "Save failed. See console for details."
      );
    }
  }

  async function deleteCharacter() {
    if (!character) return;
    const ok = confirm(
      `Delete ${character.name || "this character"}? This cannot be undone.`
    );
    if (!ok) return;
    try {
      await api(`/characters/${character.id}`, { method: "DELETE" });
      navigate("/characters");
    } catch (e: any) {
      console.error("Delete failed", e);
      setError(
        typeof e === "object" && e
          ? JSON.stringify(e)
          : "Delete failed. See console for details."
      );
    }
  }

  const headerRight = useMemo(() => {
    switch (saving) {
      case "saving":
        return <span className="text-sm text-amber-600">Saving…</span>;
      case "saved":
        return <span className="text-sm text-green-600">Saved</span>;
      case "error":
        return <span className="text-sm text-red-600">Save failed</span>;
      default:
        return isDirtyRef.current ? (
          <span className="text-sm text-amber-600">Edited</span>
        ) : (
          <span className="text-sm text-slate-500">Up to date</span>
        );
    }
  }, [saving]);

  if (error && !character) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">Character</h1>
        <p className="text-red-700">{error}</p>
        <button
          className="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300"
          onClick={() => navigate(-1)}
        >
          Go back
        </button>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Loading…</h1>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">
          {character.name || "Unnamed Character"}
        </h1>
        <div className="flex items-center gap-3">
          {headerRight}
          {/* Optional manual save button:
          <button
            className="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300"
            onClick={() => saveNow(latestRef.current ?? character)}
          >
            Save now
          </button>
          */}
          <button
            className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
            onClick={deleteCharacter}
            title="Delete character"
          >
            Delete
          </button>
        </div>
      </div>

      <CharacterSheetv2 value={character} onChange={onChange} />

      {error && (
        <div className="text-sm text-red-700 break-words">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
