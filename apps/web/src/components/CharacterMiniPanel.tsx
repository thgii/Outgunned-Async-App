import React, { useEffect, useMemo, useRef, useState } from "react";
import { listCharacters, getCharacter, listCampaignHeroes } from "../lib/api";
import CharacterSheet from "./CharacterSheetv2";

type Props = {
  campaignId: string;
  currentUserId: string | null;
  isDirector: boolean;
};

// Mirror the Campaign page row exactly
type HeroRow = {
  id: string;
  name: string;
  ownerName?: string;
  ownerId?: string;
  campaignId?: string;
  portraitUrl?: string | null;
  characterId?: string | null; // some APIs include this
};

type GritInfo = { current: number; max?: number };
function resolveGrit(character: any): GritInfo {
  const c = character ?? {};
  const r = c.resources ?? {};
  const take = (g: any) => {
    if (g == null) return { current: undefined, max: undefined };
    if (typeof g === "number" || typeof g === "string") {
      const n = Number(g);
      return { current: Number.isNaN(n) ? undefined : n, max: undefined };
    }
    if (typeof g === "object") {
      const cur = Number(g.current ?? g.value ?? g.now ?? g.level ?? g.amount);
      const mx = Number(g.max ?? g.maximum ?? g.cap);
      return {
        current: Number.isNaN(cur) ? undefined : cur,
        max: Number.isNaN(mx) ? undefined : mx,
      };
    }
    return { current: undefined, max: undefined };
  };
  let { current, max } = take(c.grit);
  if (current == null) {
    const rTake = take(r.grit);
    current ??= rTake.current;
    max ??= rTake.max;
  }
  return { current: current ?? 0, max: max ?? undefined };
}

function useDialog() {
  const ref = useRef<HTMLDialogElement | null>(null);
  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();
  return { ref, open, close };
}

// Campaign-style portrait block (identical behavior)
function Portrait({ portraitUrl, name }: { portraitUrl?: string | null; name?: string }) {
  return (
    <div className="h-12 w-12 rounded-md overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
      {portraitUrl ? (
        <img
          src={portraitUrl}
          alt={name || "Hero portrait"}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-slate-500 text-sm font-semibold">
          {name?.charAt(0) || "?"}
        </div>
      )}
    </div>
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
        try {
        // 1) Get the full character rows (has attrs/skills/grit)
        const charRows = await listCharacters(campaignId);

        // 2) For each character, fetch detail and attach portraitUrl
        const withPortraits = await Promise.all(
            (charRows || []).map(async (c: any) => {
            try {
                const detail = await getCharacter(c.id);
                const d = detail?.character ?? detail ?? {};
                const portraitDataUrl =
                d?.storage?.portrait ??
                d?.resources?.storage?.portrait ??
                d?.portraitUrl ??
                null;

                return { ...c, portraitUrl: portraitDataUrl };
            } catch {
                // If detail fetch fails, just return the character as-is
                return { ...c, portraitUrl: c.portraitUrl ?? null };
            }
            })
        );

        if (!alive) return;
        setChars(withPortraits);
        } catch (e) {
        // don’t hard-fail the panel
        if (!alive) return;
        setChars([]);
        // Optionally: console.error("MiniPanel load error", e);
        }
    })();

    return () => { alive = false; };
    }, [campaignId]);

  const visible = useMemo(() => {
    if (isDirector) return chars;
    if (!currentUserId) return [];
    return chars.filter((c) => c.ownerId === currentUserId);
  }, [chars, isDirector, currentUserId]);

    const onOpen = async (id: string) => {
        const detail = await getCharacter(id);
        const char = detail?.character ?? detail;   // ← unwrap if needed
        setActive(char);
        open();
    };

  if (!visible.length) return null;

  return (
    <div className="mt-3">
      <h3 className="text-sm font-semibold text-white mb-2">
        {isDirector ? "Heroes in this Campaign" : "Your Hero"}
      </h3>

      <div className="flex flex-col gap-2">
        {visible.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpen(c.id)}
            className="w-full text-left bg-white border rounded-lg p-2 hover:shadow-sm transition grid grid-cols-[auto,1fr,auto] gap-3 items-center"
          >
            {/* Portrait rendered EXACTLY like Campaign */}
            <Portrait portraitUrl={c.portraitUrl} name={c.name} />

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

        <dialog
        ref={dialogRef}
        className="rounded-xl backdrop:bg-black/50 p-0 w-[min(100vw,900px)] z-50"
        >
        <div className="bg-white text-black max-h-[85vh] overflow-y-auto rounded-xl">
            <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="font-semibold text-zinc-800">{active?.name ?? "Character"}</div>
            <button onClick={close} className="text-zinc-500 hover:text-zinc-800 text-sm px-2 py-1 rounded">
                Close
            </button>
            </div>
            <div className="p-3">
            {active ? (
                <>
                {/* Full sheet — pass multiple prop aliases to satisfy the component */}
                <CharacterSheet
                    key={active.id}
                    initial={active}
                    character={active}
                    hero={active}
                    data={active}
                    readOnly
                    mode="readonly"
                    onChange={() => {}}
                />
                <pre className="mt-3 text-xs bg-slate-50 border rounded p-2 overflow-auto">
                    {JSON.stringify(active, null, 2)}
                </pre>
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
