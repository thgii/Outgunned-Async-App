import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

export default function GameAdmin() {
  const { id: gameId } = useParams<{ id: string }>();
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        // Expect your games API to return at least { id, campaignId }
        const game = await api(`/games/${gameId}`, { method: "GET" });
        if (game?.campaignId) {
          nav(`/campaign/${game.campaignId}/admin`, { replace: true });
        } else {
          // Fallback: if no campaignId, just go back to game page
          nav(`/game/${gameId}`, { replace: true });
        }
      } catch {
        nav(`/game/${gameId}`, { replace: true });
      }
    })();
  }, [gameId, nav]);

  // Tiny placeholder while redirecting
  return <div className="p-4 text-sm opacity-70">Loading admin…</div>;
}
