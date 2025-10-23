// apps/web/src/routes/Campaign.tsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Game = { id: string; title?: string; name?: string };
type CampaignRow = { id: string; title: string };

export default function Campaign() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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


  if (loading) return <div className="max-w-4xl mx-auto p-6">Loading…</div>;
  if (error) return <div className="max-w-4xl mx-auto p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{campaign?.title ?? `Campaign ${id}`}</h1>
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
