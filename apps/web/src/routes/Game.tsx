import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ChatBox from "../components/ChatBox";
import { SceneBoard } from "../components/SceneBoard";
import GMControls from "../components/GMControls";
import { api, getCharacter } from "../lib/api";
import CharacterMiniPanel from "../components/CharacterMiniPanel";
import { NPCsPanel } from "../components/NPCsPanel";
import CharacterDicePanel from "../components/CharacterDicePanel";
import type { CharacterDTO } from "@action-thread/types";

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
  const [heroes, setHeroes] = useState<any[]>([]);
  const [myHero, setMyHero] = useState<any | null>(null);

  // NEW: Character DTO for CharacterDicePanel
  const [dto, setDto] = useState<CharacterDTO | null>(null);

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

  // Load heroes for the campaign and find this user's hero
  useEffect(() => {
    if (!game?.campaignId || !me?.id) return;
    (async () => {
      try {
        const list = await api
          .get(`/campaigns/${game.campaignId}/heroes`)
          .catch(() => []);
        setHeroes(list ?? []);
        const mine = (list as any[]).find((h) => h.ownerId === me.id);
        setMyHero(mine ?? null);
      } catch (err) {
        console.error("Failed to load heroes", err);
      }
    })();
  }, [game?.campaignId, me?.id]);

  // Load full CharacterDTO for the player's hero (if not already present on myHero)
  useEffect(() => {
    setDto(null);
    if (!myHero) return;
    const characterId = myHero.characterId ?? myHero.id;
    if (!characterId) return;

    (async () => {
      try {
        const c = await getCharacter(characterId);
        setDto(c as CharacterDTO);
      } catch (e) {
        console.error("Failed to load character dto", e);
      }
    })();
  }, [myHero]);

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
            <NPCsPanel
              campaignId={game.campaignId}
              isDirector={isDirector}
            />
          </>
        )}
      </div>

      <div className="space-y-4">
        {/* 🎲 Players only; uses CharacterDicePanel (no local selector needed) */}
        {!isDirector && dto && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">🎲 Dice Roller</h2>
            <CharacterDicePanel
              dto={dto}
              className="rounded-xl border p-3 bg-white/70"
              // Optional: wire these if you have endpoints for resource spend
              // onSpendAdrenaline={async (amt) => {
              //   await api.post(`/characters/${dto.id}/spend`, { adrenaline: amt });
              // }}
              // onPaidRerollSpend={async (amt) => {
              //   await api.post(`/characters/${dto.id}/spend`, { adrenaline: amt });
              // }}
            />
          </div>
        )}

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