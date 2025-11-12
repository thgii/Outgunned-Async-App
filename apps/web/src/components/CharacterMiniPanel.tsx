import React, { useEffect, useMemo, useRef, useState } from "react";
import { listCharacters, getCharacter } from "../lib/api";
import CharacterSheet from "./CharacterSheetv2"; // we’ll reuse your v2 sheet

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

function Portrait({ url, name }: { url?: string | null; name: string }) {
  // Characters don’t have a guaranteed portrait column; try a few places or fallback
  const src = typeof url === "string" && url
    ? url
    : undefined;
  return (
    <div className="h-12 w-12 rounded-md overflow-hidden bg-zinc-200 shrink-0">
      {src ? (
        <img src={src} alt={`${name} portrait`} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full grid place-items-center text-xs text-zinc-500">No Image</div>
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
  // Grit is inconsistent across old records; try multiple spots.
  // Accepts meter-like {current,max}, or a flat number in resources.grit, or top-level grit.
  const { resources, grit } = character || {};
  let current: number | undefined;
  let max: number | undefined;

  if (grit && typeof grit === "object") {
    current = Number(grit.current ?? grit.value ?? 0);
    max = Number(grit.max ?? grit.maximum ?? 0) || undefined;
  } else if (resources && typeof resources === "object" && resources.grit != null) {
    current = Number(resources.grit || 0);
  }

  const label = max ? `${current ?? 0}/${max}` : `${current ?? 0}`;
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
            <Portrait url={(c as any).portraitUrl || (c?.resources?.portraitUrl)} name={c.name} />
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
