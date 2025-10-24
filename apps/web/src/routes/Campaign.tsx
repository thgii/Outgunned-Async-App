// apps/web/src/routes/Campaign.tsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Game = { id: string; title?: string; name?: string };
type CampaignRow = { id: string; title: string };
type HeroRow = { id: string; name: string; ownerName?: string; ownerId?: string; campaignId?: string };
type HeroRow = { id: string; name: string; ownerName?: string; ownerId?: string; campaignId?: string };



export default function Campaign() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [allHeroes, setAllHeroes] = useState<HeroRow[]>([]);
  const [selectedHeroId, setSelectedHeroId] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [heroesInCampaign, setHeroesInCampaign] = useState<HeroRow[]>([]);


  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // fetch campaign + games in parallel
        const [campRes, gamesRes] = await Promise.all([
          api(`/campaigns/${id}`, { method: "GET" }),
          api(`/campaigns/${id}/games`, { method: "GET" }),
        ]);

        // normalize campaign (expecting a single object)
        const campObj: CampaignRow | null =
          campRes && typeof campRes === "object" ? { id: campRes.id, title: campRes.title } : null;

        // normalize games to an array
        const arr: Game[] = Array.isArray(gamesRes)
          ? gamesRes
          : Array.isArray(gamesRes?.results)
          ? gamesRes.results
          : [];

        if (alive) {
          setCampaign(campObj);
          setGames(arr);
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

  useEffect(() => {
  let alive = true;
  (async () => {
    try {
      const res = await api("/characters?all=1", { method: "GET" });
      const arr: HeroRow[] = Array.isArray(res) ? res : (res?.results ?? []);
      if (alive) setAllHeroes(arr);
    } catch {
      /* non-fatal for page */
    }
  })();
  return () => { alive = false; };
}, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api(`/campaigns/${id}/heroes`, { method: "GET" });
        const list: HeroRow[] = Array.isArray(res) ? res : (res?.results ?? []);
        if (alive) setHeroesInCampaign(list);
      } catch {
        /* non-fatal */
      }
    })();
    return () => { alive = false; };
  }, [id]);

  async function onAddHero() {
    if (!id || !selectedHeroId) return;
    setAdding(true);
    try {
      await api(`/campaigns/${id}/heroes`, {
        method: "POST",
        json: { heroId: selectedHeroId }
      });
      // Optional: optimistic UI—clear selection
      setSelectedHeroId("");
    } catch (e: any) {
      alert(e?.message || "Failed to add hero");
    } finally {
      setAdding(false);
    }
  }

  async function onRemoveHero(heroId: string) {
    if (!id) return;
    if (!confirm("Remove this hero from the campaign?")) return;
    try {
      await api(`/campaigns/${id}/heroes/${heroId}/remove`, { method: "POST" });
      // refresh list locally
      setHeroesInCampaign((prev) => prev.filter((h) => h.id !== heroId));
    } catch (e: any) {
      alert(e?.message || "Failed to remove hero");
    }
  }


  if (loading) return <div className="max-w-4xl mx-auto p-6">Loading…</div>;
  if (error) return <div className="max-w-4xl mx-auto p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{campaign?.title ?? `Campaign ${id}`}</h1>
      {/* Current heroes in this campaign */}
      <div className="mb-4 rounded border border-slate-200 bg-white p-4">
        <h2 className="font-semibold mb-2">Current Heroes</h2>
        {heroesInCampaign.length === 0 ? (
          <div className="text-sm text-slate-600">No heroes in this campaign yet.</div>
        ) : (
          <ul className="divide-y">
            {heroesInCampaign.map((h) => (
              <li key={h.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{h.name || "Untitled Hero"}</div>
                  <div className="text-xs text-slate-600">{h.ownerName || h.ownerId || "Unknown owner"}</div>
                </div>
                <button
                  onClick={() => onRemoveHero(h.id)}
                  className="rounded bg-red-600 text-white text-sm px-3 py-1"
                  title="Remove from campaign"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* --- Add Hero Control --- */}
        <div className="mb-4 flex items-center gap-2">
          <select
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-black"
            value={selectedHeroId}
            onChange={(e) => setSelectedHeroId(e.target.value)}
          >
            <option value="">Select a hero…</option>
            {allHeroes
              .filter((h) => h.campaignId !== id) // optionally exclude heroes already in this campaign
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
      {games.length === 0 ? (
        <div className="rounded border bg-slate-50 p-4 text-black">
          <p className="mb-2">No games yet.</p>
          <Link to={`/game/new?campaign=${id}`} className="inline-block rounded bg-black px-3 py-2 text-white">
            + Create a Game
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {games.map((g) => (
            <li key={g.id} className="p-3 bg-white rounded shadow">
              {/* tolerate either title or name */}
              <Link to={`/game/${g.id}`} className="text-blue-600 underline">
                {g.title ?? g.name ?? "Untitled Game"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
