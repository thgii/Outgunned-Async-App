import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ChatBox from "../components/ChatBox";
import DiceRoller from "../components/DiceRoller";
import { SceneBoard } from "../components/SceneBoard";
import GMControls from "../components/GMControls";
import { api } from "../lib/api";
import CharacterMiniPanel from "../components/CharacterMiniPanel";
import { NPCsPanel } from "../components/NPCsPanel";

type GameRow = {
  id: string;
  campaignId: string;
  title?: string;
  name?: string;
  summary?: string | null;
};

type Me = { id: string } | null;
type RoleResp = { role?: "director" | "hero" };

export default function Game() {
  const { id } = useParams();
  const gameId = id!;
  const [game, setGame] = useState<GameRow | null>(null);
  const [me, setMe] = useState<Me>(null);
  const [isDirector, setIsDirector] = useState(false);

  // Load game (for campaignId and top-of-page data)
  useEffect(() => {
    (async () => {
      const g = await api.get(`/games/${gameId}`).catch(() => null);
      setGame(g);
    })();
  }, [gameId]);

  // Identify user and role
  useEffect(() => {
    (async () => {
      try {
        const user = await api.get("/auth/me").catch(() => null);
        setMe(user ?? null);

        // Prefer a real endpoint if you have it; otherwise this can be replaced by your existing membership fetch.
        const roleRow: RoleResp = await api
          .get(`/games/${gameId}/role`)
          .catch(() => ({} as RoleResp));
        setIsDirector(roleRow?.role === "director");
      } catch {
        setMe(null);
        setIsDirector(false);
      }
    })();
  }, [gameId]);

  if (!game) return <div className="p-6">Loading…</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="lg:col-span-2 flex flex-col gap-3">
        <ChatBox gameId={gameId} />

        {game?.campaignId && (
          <>
            <CharacterMiniPanel
              campaignId={game.campaignId}
              currentUserId={me?.id ?? null}
              isDirector={isDirector}
            />

            {/* ✅ NPCs for this campaign, right below heroes */}
            <NPCsPanel
              campaignId={game.campaignId}
              editable={isDirector} // or isDirector={isDirector} if that’s the prop name
            />
          </>
        )}
      </div>

      <div className="space-y-4">
        <DiceRoller gameId={gameId} />

        <SceneBoard
          gameId={gameId}
          currentUserId={me?.id ?? null}
          isDirector={isDirector}
        />

        {isDirector && <GMControls gameId={gameId} />}
      </div>
    </div>
  );
}
