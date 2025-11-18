import { useEffect, useState } from "react";
import { api, getCharacter } from "../lib/api";
import { useNavigate } from "react-router-dom";

type MaybeNamed = string | number | { name?: string; [k: string]: any };

function fmtOne(v?: MaybeNamed): string {
  if (v == null) return "—";
  if (typeof v === "string" || typeof v === "number") return String(v);
  return v.name ?? "—";
}

function fmtList(list?: MaybeNamed[]): string {
  if (!Array.isArray(list) || !list.length) return "";
  return list
    .map((v) => fmtOne(v))
    .filter((s) => s && s !== "—")
    .join(", ");
}

// Small portrait component, same styling idea as CharacterMiniPanel
function HeroPortrait({
  portraitUrl,
  name,
}: {
  portraitUrl?: string | null;
  name?: string;
}) {
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

export default function CharactersList() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // Use the special ?all=1 variant so we get ownerName from the users table
        const baseRows = (await api("/characters?all=1")) as Array<{
          id: string;
          name: string;
          ownerId?: string | null;
          ownerName?: string | null;
          campaignId?: string | null;
        }>;

        const withDetails = await Promise.all(
          (baseRows || []).map(async (c) => {
            try {
              const detail = await getCharacter(c.id);
              const d = (detail as any)?.character ?? (detail as any) ?? {};

              // Mirror the portrait resolution logic used in CharacterMiniPanel
              const portraitDataUrl =
                d?.storage?.portrait ??
                d?.resources?.storage?.portrait ??
                d?.portraitUrl ??
                null;

              return {
                ...d,                       // full character row (age, role, feats, gear, etc.)
                ownerName: c.ownerName ?? null,
                ownerId: c.ownerId ?? d.ownerId ?? null,
                campaignId: c.campaignId ?? d.campaignId ?? null,
                portraitUrl: portraitDataUrl,
              };
            } catch {
              // Fallback: at least keep the minimal info
              return {
                ...c,
                portraitUrl: null,
              };
            }
          })
        );

        if (!alive) return;
        setCharacters(withDetails);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setErr("Failed to load heroes.");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">All Heroes</h1>
        <button
          onClick={() => navigate("/characters/new")}
          className="px-3 py-2 rounded bg-white text-black hover:opacity-90"
        >
          Create Hero
        </button>
      </div>

      {err && <div className="text-red-600 text-center mb-3">{err}</div>}

      {!characters.length ? (
        <div className="text-center opacity-70">
          <p>No characters yet.</p>
          <button
            className="mt-3 px-3 py-2 rounded bg-black text-white hover:opacity-90"
            onClick={() => navigate("/characters/new")}
          >
            Create your first hero.
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {characters.map((c) => {
            const key = c.id ?? c._id ?? c.name;
            const charId = c.id ?? c._id;

            const featsStr = fmtList(c.feats);
            const gearStr = fmtList(c.gear);

            const ownerName: string | undefined = c.ownerName ?? undefined;

            return (
              <div
                key={key}
                className="border rounded p-3 flex gap-3 items-start"
              >
                <HeroPortrait portraitUrl={c.portraitUrl} name={c.name} />

                <div className="flex-1">
                  <div className="font-semibold text-lg">
                    {fmtOne(c.name)}
                    {ownerName ? ` (${ownerName})` : ""}
                  </div>
                  <div className="text-sm opacity-80">{fmtOne(c.role)}</div>
                  <div className="text-sm">Age: {fmtOne(c.age)}</div>
                  <div className="text-xs mt-1">
                    Job: {fmtOne(c.job ?? c.jobOrBackground)}
                  </div>
                  <div className="text-xs">
                    Catchphrase: {fmtOne(c.catchphrase)}
                  </div>
                  <div className="text-xs">Flaw: {fmtOne(c.flaw)}</div>

                  {featsStr && (
                    <div className="text-xs mt-2">Feats: {featsStr}</div>
                  )}
                  {gearStr && (
                    <div className="text-xs mt-1">Gear: {gearStr}</div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={!charId}
                      onClick={() => navigate(`/character/${charId}`)}
                      className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      View Sheet
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}