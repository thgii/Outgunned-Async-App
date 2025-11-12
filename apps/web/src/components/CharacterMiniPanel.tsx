import React, { useEffect, useMemo, useRef, useState } from "react";
import { listCharacters, getCharacter } from "../lib/api";
import CharacterSheet from "./CharacterSheetv2"; // we’ll reuse your v2 sheet

// --- add these utilities near the top of the file ---
function coerceUrl(u?: unknown): string | undefined {
  if (!u) return undefined;
  const s = String(u).trim();
  if (!s) return undefined;

  // Handle common “data-ish” or blob urls directly
  if (s.startsWith("data:") || s.startsWith("blob:")) return s;

  // If it already looks absolute, use as-is
  if (/^https?:\/\//i.test(s)) return s;

  // Otherwise treat as relative path
  if (s.startsWith("/")) return s;

  // Last resort: make it relative (prevents broken <img> with "undefined")
  return `/${s}`;
}

function resolvePortrait(character: any): string | undefined {
  // Try a bunch of likely places/names
  const c = character ?? {};
  const r = c.resources ?? {};
  const candidates = [
    c.portraitUrl,
    c.portraitURL,
    c.portrait,
    c.imageUrl,
    c.pictureUrl,
    c.avatarUrl,
    c.photoUrl,
    r.portraitUrl,
    r.imageUrl,
    r.pictureUrl,
  ];
  for (const cand of candidates) {
    const url = coerceUrl(cand);
    if (url) return url;
  }
  return undefined;
}

type GritInfo = { current: number; max?: number };

function resolveGrit(character: any): GritInfo {
  // Accept a lot of shapes:
  // - character.grit: number | { current, max } | { value, max/maximum }
  // - resources.grit: number | { current, max }
  const c = character ?? {};
  const r = c.resources ?? {};
  let current: number | undefined;
  let max: number | undefined;

  const tryShape = (g: any) => {
    if (g == null) return;
    if (typeof g === "number" || typeof g === "string") {
      // number or numeric string
      const n = Number(g);
      if (!Number.isNaN(n)) current = n;
      return;
    }
    if (typeof g === "object") {
      // common keys
      const cur = g.current ?? g.value ?? g.now ?? g.level ?? g.amount;
      const mx = g.max ?? g.maximum ?? g.cap;
      if (cur != null) {
        const n = Number(cur);
        if (!Number.isNaN(n)) current = n;
      }
      if (mx != null) {
        const m = Number(mx);
        if (!Number.isNaN(m)) max = m;
      }
      return;
    }
  };

  tryShape(c.grit);
  if (current == null || (max == null && (r?.grit != null))) {
    tryShape(r.grit);
  }

  // Sensible defaults
  if (current == null || Number.isNaN(current)) current = 0;
  if (max != null && Number.isNaN(max)) max = undefined;

  return { current, max };
}

type Props = {
  campaignId: string;
  currentUserId: string | null;
  isDirector: boolean;
};

/** Small, no-dependency modal using <dialog> for the sheet preview */
function useDialog() {
  const ref = useRef<HTMLDialogElement | null>(null);
  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();
  return { ref, open, close };
}

function Portrait({ character }: { character: any }) {
  const url = resolvePortrait(character);
  const name = character?.name ?? "Character";
  return (
    <div className="h-12 w-12 rounded-md overflow-hidden bg-zinc-200 shrink-0">
      {url ? (
        <img
          src={url}
          alt={`${name} portrait`}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="h-full w-full grid place-items-center text-[10px] text-zinc-500">No Image</div>
      )}
    </div>
  );
}

/** Render (attribute, value) chips */
function AttrChips({ attributes }: { attributes?: Record<string, number> }) {
  if (!attributes) return null;
  const order = ["brawn", "nerves", "smooth", "focus", "crime"];
  return (
    <div className="flex flex-wrap gap-1">
      {order.map((k) => (
        <span key={k} className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 text-[11px]">
          {k[0].toUpperCase() + k.slice(1)}: {attributes?.[k] ?? 0}
        </span>
      ))}
    </div>
  );
}

/** Show top 6 skills (by value, desc) */
function SkillChips({ skills }: { skills?: Record<string, number> }) {
  if (!skills) return null;
  const top = Object.entries(skills)
    .filter(([, v]) => typeof v === "number" && v > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 6);
  if (!top.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {top.map(([k, v]) => (
        <span key={k} className="px-2 py-0.5 rounded bg-zinc-50 border text-zinc-700 text-[11px]">
          {k[0].toUpperCase() + k.slice(1)}: {v}
        </span>
      ))}
    </div>
  );
}

function GritBadge({ character }: { character: any }) {
  const { current, max } = resolveGrit(character);
  const label = max ? `${current}/${max}` : `${current}`;
  return (
    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
      Grit: {label}
    </span>
  );
}

export default function CharacterMiniPanel({ campaignId, currentUserId, isDirector }: Props) {
  const [chars, setChars] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const { ref: dialogRef, open, close } = useDialog();

  useEffect(() => {
    let alive = true;
    (async () => {
      const rows = await listCharacters(campaignId);
      if (!alive) return;
      setChars(rows || []);
    })();
    return () => { alive = false; };
  }, [campaignId]);

  const visible = useMemo(() => {
    if (isDirector) return chars;
    if (!currentUserId) return [];
    return chars.filter((c) => c.ownerId === currentUserId);
  }, [chars, isDirector, currentUserId]);

  const onOpen = async (id: string) => {
    const full = await getCharacter(id);
    setActive(full);
    open();
  };

  if (!visible.length) {
    // Don’t render a big empty block—keep it subtle
    return null;
  }

  return (
    <div className="mt-3">
      <h3 className="text-sm font-semibold text-zinc-700 mb-2">
        {isDirector ? "Heroes in this Campaign" : "Your Hero"}
      </h3>

      {/* Cards list */}
      <div className="flex flex-col gap-2">
        {visible.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpen(c.id)}
            className="w-full text-left bg-white border rounded-lg p-2 hover:shadow-sm transition grid grid-cols-[auto,1fr,auto] gap-3 items-center"
          >
            <Portrait character={c} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-medium text-zinc-900 truncate">{c.name}</div>
                <GritBadge character={c} />
              </div>
              <div className="mt-1">
                <AttrChips attributes={c.attributes} />
              </div>
              <div className="mt-1">
                <SkillChips skills={c.skills} />
              </div>
            </div>
            <div className="text-xs text-zinc-500">Open</div>
          </button>
        ))}
      </div>

      {/* Modal (character sheet in a small window) */}
      <dialog ref={dialogRef} className="rounded-xl backdrop:bg-black/50 p-0 w-[min(100vw,900px)]">
        <div className="bg-white max-h-[85vh] overflow-y-auto rounded-xl">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="font-semibold text-zinc-800">{active?.name ?? "Character"}</div>
            <button onClick={close} className="text-zinc-500 hover:text-zinc-800 text-sm px-2 py-1 rounded">
              Close
            </button>
          </div>
          <div className="p-3">
            {active ? (
              <CharacterSheet initial={active} readOnly />
            ) : (
              <div className="text-sm text-zinc-500">Loading…</div>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
