// apps/web/src/routes/Campaign.tsx
import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { NPCsPanel } from "../components/NPCsPanel";

type Game = { id: string; title?: string; name?: string };
type CampaignRow = { id: string; title: string; membershipRole?: string | null };
type HeroRow = {
  id: string;
  name: string;
  ownerName?: string;
  ownerId?: string;
  campaignId?: string;
};

export default function Campaign() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [allHeroes, setAllHeroes] = useState<HeroRow[]>([]);
  const [heroesInCampaign, setHeroesInCampaign] = useState<HeroRow[]>([]);
  const inCampaignIds = new Set(heroesInCampaign.map((h) => h.id));

  const [selectedHeroId, setSelectedHeroId] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const [isDirector, setIsDirector] = useState(false);

  // Load campaign + games
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [campRes, gamesRes] = await Promise.all([
          api(`/campaigns/${id}`, { method: "GET" }),
          api(`/campaigns/${id}/games`, { method: "GET" }),
        ]);

        const campObj: CampaignRow | null =
          campRes && typeof campRes === "object"
            ? {
                id: campRes.id,
                title: campRes.title,
                membershipRole: campRes.membershipRole ?? campRes.role ?? null,
              }
            : null;

        const arr: Game[] = Array.isArray(gamesRes)
          ? gamesRes
          : Array.isArray(gamesRes?.results)
          ? gamesRes.results
          : [];

        const director =
          (campObj?.membershipRole ?? campObj?.role ?? "").toLowerCase() === "director";

        if (alive) {
          setCampaign(campObj);
          setGames(arr);
          setIsDirector(director);
        }
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load campaign/games");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // Load all heroes (for add control)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api("/characters?all=1", { method: "GET" });
        const arr: HeroRow[] = Array.isArray(res) ? res : res?.results ?? [];
        if (alive) setAllHeroes(arr);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load heroes in campaign
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api(`/campaigns/${id}/heroes`, { method: "GET" });
        const list: HeroRow[] = Array.isArray(res) ? res : res?.results ?? [];
        if (alive) setHeroesInCampaign(list);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  async function refreshAll() {
    const [resAll, resIn] = await Promise.all([
      api("/characters?all=1"),
      api(`/campaigns/${id}/heroes`),
    ]);
    setAllHeroes(Array.isArray(resAll) ? resAll : resAll?.results ?? []);
    setHeroesInCampaign(Array.isArray(resIn) ? resIn : resIn?.results ?? []);
  }

  async function reloadGames() {
    if (!id) return;
    const gamesRes = await api(`/campaigns/${id}/games`, { method: "GET" });
    const arr: Game[] = Array.isArray(gamesRes)
      ? gamesRes
      : Array.isArray(gamesRes?.results)
      ? gamesRes.results
      : [];
    setGames(arr);
  }

  async function onAddHero() {
    if (!id || !selectedHeroId) return;
    if (!isDirector) {
      alert("Directors only.");
      return;
    }
    setAdding(true);
    try {
      await api(`/campaigns/${id}/heroes`, {
        method: "POST",
        json: { heroId: selectedHeroId },
      });
      setSelectedHeroId("");
      await refreshAll();
    } catch (e: any) {
      alert(e?.message || "Failed to add hero");
    } finally {
      setAdding(false);
    }
  }

  async function onRemoveHero(heroId: string) {
    if (!id) return;
    if (!isDirector) {
      alert("Directors only.");
      return;
    }
    if (!confirm("Remove this hero from the campaign?")) return;
    try {
      await api(`/campaigns/${id}/heroes/${heroId}/remove`, { method: "POST" });
      setHeroesInCampaign((prev) => prev.filter((h) => h.id !== heroId));
    } catch (e: any) {
      alert(e?.message || "Failed to remove hero");
    }
  }

  async function createAct() {
    if (!id) return;
    if (!isDirector) {
      alert("Directors only.");
      return;
    }
    const title = prompt("Title of this Act?")?.trim();
    if (!title) return;
    try {
      const res = await api(`/campaigns/${id}/games`, {
        method: "POST",
        json: { title },
      });
      const newId = res?.id || res?.game?.id || String(res);
      navigate(`/game/${newId}`);
    } catch (e: any) {
      alert(e?.message || "Failed to create Act");
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto p-6">Loading…</div>;
  if (error) return <div className="max-w-4xl mx-auto p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Title + (Director-only) Delete button */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">{campaign?.title ?? `Campaign ${id}`}</h1>
        {isDirector && (
          <button
            className="rounded bg-red-600 px-3 py-2 text-white hover:bg-red-700"
            onClick={async () => {
              if (!id) return;
              if (!isDirector) {
                alert("Directors only.");
                return;
              }
              const sure = confirm(
                "Delete this campaign and all its Acts? This will also delete chat/messages within those Acts. Characters will be reassigned to the Unassigned campaign. This cannot be undone."
              );
              if (!sure) return;

              try {
                await api(`/campaigns/${id}`, { method: "DELETE" });
                navigate("/campaigns");
              } catch (e: any) {
                alert(e?.message || "Failed to delete campaign");
              }
            }}
          >
            Delete Campaign
          </button>
        )}
      </div>

      {/* Current heroes in this campaign */}
      <div className="mb-4 rounded border border-slate-200 bg-white p-4">
        <h2 className="font-semibold mb-2 text-black">Current Heroes</h2>
        {heroesInCampaign.length === 0 ? (
          <div className="text-sm text-slate-600">No heroes in this campaign yet.</div>
        ) : (
          <ul className="divide-y">
            {heroesInCampaign.map((h) => (
              <li key={h.id} className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {h.portraitUrl ? (
                    <img
                      src={h.portraitUrl}
                      alt={h.name || "Hero portrait"}
                      className="w-10 h-10 rounded-full object-cover border border-slate-300"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-semibold">
                      {h.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div>
                    <Link
                      to={`/characters/${h.id}`}
                      className="font-medium text-black hover:underline"
                      title="Open character"
                    >
                      {h.name || "Untitled Hero"}
                    </Link>
                    <div className="text-xs text-slate-600">
                      {h.ownerName || h.ownerId || "Unknown owner"}
                    </div>
                  </div>
                </div>
                {isDirector && (
                  <button
                    onClick={() => onRemoveHero(h.id)}
                    className="rounded bg-red-600 text-white text-sm px-3 py-1"
                    title="Remove from campaign"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add Hero Control (Director-only) */}
      {isDirector && (
        <div className="mb-4 flex items-center gap-2">
          <select
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-black"
            value={selectedHeroId}
            onChange={(e) => setSelectedHeroId(e.target.value)}
          >
            <option value="">Select a hero…</option>
            {allHeroes
              .filter((h) => !inCampaignIds.has(h.id))
              .map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name || "Untitled Hero"} {h.ownerName ? `— ${h.ownerName}` : ""}
                </option>
              ))}
          </select>
          <button
            onClick={onAddHero}
            disabled={!selectedHeroId || adding}
            className="rounded bg-white px-3 py-2 text-black disabled:opacity-60"
          >
            {adding ? "Adding…" : "Add Hero to Campaign"}
          </button>
        </div>
      )}

      {/* NPCs Panel (already role-aware via prop) */}
      <div className="mb-4">
        <NPCsPanel campaignId={id!} isDirector={isDirector} />
      </div>

      {/* Acts section; button is Director-only */}
      <div className="rounded border bg-slate-50 p-4 text-black">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Acts</h2>
          {isDirector && (
            <button
              className="inline-block rounded bg-black px-3 py-2 text-white hover:opacity-90"
              onClick={createAct}
            >
              + Start an Act
            </button>
          )}
        </div>

        {games.length === 0 ? (
          <p className="text-sm text-slate-600">No acts yet.</p>
        ) : (
          <ul className="space-y-2">
            {games.map((g) => (
              <li key={g.id} className="p-3 bg-white rounded shadow">
                <Link to={`/game/${g.id}`} className="text-blue-600 underline">
                  {g.title ?? g.name ?? "Untitled Game"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
