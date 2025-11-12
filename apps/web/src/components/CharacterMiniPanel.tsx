import React, { useEffect, useMemo, useRef, useState } from "react";
import { listCampaignHeroes, getCharacter } from "../lib/api";
import CharacterSheet from "./CharacterSheetv2";

type Props = {
  campaignId: string;
  currentUserId: string | null;
  isDirector: boolean;
};

function useDialog() {
  const ref = useRef<HTMLDialogElement | null>(null);
  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();
  return { ref, open, close };
}

// ---- robust grit parsing (kept from earlier fix) ----
type GritInfo = { current: number; max?: number };
function resolveGrit(character: any): GritInfo {
  const c = character ?? {};
  const r = c.resources ?? {};
  let current: number | undefined;
  let max: number | undefined;

  const tryShape = (g: any) => {
    if (g == null) return;
    if (typeof g === "number" || typeof g === "string") {
      const n = Number(g);
      if (!Number.isNaN(n)) current = n;
      return;
    }
    if (typeof g === "object") {
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
    }
  };

  tryShape(c.grit);
  if (current == null || (max == null && (r?.grit != null))) tryShape(r.grit);
  if (current == null || Number.isNaN(current)) current = 0;
  if (max != null && Number.isNaN(max)) max = undefined;
  return { current, max };
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

type HeroRow = {
  id: string; // usually character id
  name: string;
  ownerId?: string | null;
  portraitUrl?: string | null;
  characterId?: string | null; // sometimes present
};

export default function CharacterMiniPanel({ campaignId, currentUserId, isDirector }: Props) {
  const [heroes, setHeroes] = useState<HeroRow[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const { ref: dialogRef, open, close } = useDialog();

  useEffect(() => {
    let alive = true;
    (async () => {
      const rows = await listCampaignHeroes(campaignId);
      if (!alive) return;
      setHeroes(rows || []);
    })();
    return () => { alive = false; };
  }, [campaignId]);

  const visible = useMemo(() => {
    if (isDirector) return heroes;
    if (!currentUserId) return [];
    return heroes.filter((h) => h.ownerId === currentUserId);
  }, [heroes, isDirector, currentUserId]);

  const onOpen = async (row: HeroRow) => {
    // Some endpoints return both id and characterId; prefer characterId if present
    const charId = row.characterId ?? row.id;
    const full = await getCharacter(charId);
    setActive(full);
    open();
  };

  if (!visible.length) return null;

  return (
    <div className="mt-3">
      <h3 className="text-sm font-semibold text-white mb-2">
        {isDirector ? "Heroes in this Campaign" : "Your Hero"}
      </h3>

      <div className="flex flex-col gap-2">
        {visible.map((h) => (
          <button
            key={h.characterId ?? h.id}
            onClick={() => onOpen(h)}
            className="w-full text-left bg-white border rounded-lg p-2 hover:shadow-sm transition grid grid-cols-[auto,1fr,auto] gap-3 items-center"
          >
            {/* --- portrait logic identical to your Campaign page --- */}
            <div className="flex items-center gap-3">
              {h.portraitUrl ? (
                <img
                  src={h.portraitUrl}
                  alt={h.name || "Hero portrait"}
                  className="w-12 h-12 rounded-md object-cover border border-slate-300"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-semibold">
                  {h.name?.charAt(0) || "?"}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-medium text-zinc-900 truncate">{h.name}</div>
                {/* Grit/attributes/skills come from the full character, so we only show them after load.
                   For a quick glance, you can remove this badge here OR pre-join on the server. */}
              </div>
            </div>

            <div className="text-xs text-zinc-500">Open</div>
          </button>
        ))}
      </div>

      {/* Modal with full sheet */}
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
              <>
                {/* If you want grit/attrs visible in the header, we can render badges from 'active' here */}
                <div className="mb-2 flex items-center gap-2">
                  <GritBadge character={active} />
                </div>
                <CharacterSheet initial={active} readOnly />
              </>
            ) : (
              <div className="text-sm text-zinc-500">Loading…</div>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}