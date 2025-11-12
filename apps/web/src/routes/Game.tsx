import { useEffect, useMemo, useState } from "react";
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

  // Character DTO for CharacterDicePanel
  const [dto, setDto] = useState<CharacterDTO | null>(null);

  // 🔧 Drives rerenders when a character save happens (mini modal, etc.)
  const [dtoRevision, setDtoRevision] = useState(0);

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

  // Load full CharacterDTO for the player's hero
  useEffect(() => {
    setDto(null);
    if (!myHero) return;
    const characterId = myHero.characterId ?? myHero.id;
    if (!characterId) return;

    (async () => {
      try {
        const c = await getCharacter(characterId);
        const d = (c as any)?.character ?? c;
        setDto(d as CharacterDTO);
      } catch (e) {
        console.error("Failed to load character dto", e);
      }
    })();
  }, [myHero]);

  // Also listen to a DOM event from the mini modal (belt & suspenders)
  useEffect(() => {
    function onCharacterSaved(ev: any) {
      const updated = ev?.detail?.updated ?? null;
      // If the saved character is the one whose dice we show, refresh it
      const myId = myHero?.characterId ?? myHero?.id;
      if (updated?.id && myId && updated.id === myId) {
        setDtoRevision((r) => r + 1);
        // refetch latest dto to ensure penalties/conditions are current
        getCharacter(myId)
          .then((c) => {
            const d = (c as any)?.character ?? c;
            setDto(d as CharacterDTO);
          })
          .catch(() => void 0);
      }
    }
    window.addEventListener("character:saved", onCharacterSaved as any);
    return () =>
      window.removeEventListener("character:saved", onCharacterSaved as any);
  }, [myHero?.id, myHero?.characterId]);

  // Callback passed to CharacterMiniPanel for immediate updates
  async function handleCharacterSaved(updated: any) {
    const myId = myHero?.characterId ?? myHero?.id;
    if (!updated?.id || !myId || updated.id !== myId) {
      // Not my displayed hero; still bump revision so lists refresh if needed.
      setDtoRevision((r) => r + 1);
      return;
    }
    try {
      const fresh = await getCharacter(updated.id);
      const d = (fresh as any)?.character ?? fresh ?? null;
      if (d) setDto(d as CharacterDTO);
    } finally {
      setDtoRevision((r) => r + 1);
    }
  }

  // Build a key that changes when either dtoRevision increments or the conditions set changes.
  const conditionsKey = useMemo(() => {
    const arr =
      (dto as any)?.conditions ??
      (dto as any)?.resources?.conditions ??
      (dto as any)?.resources?.youLookSelected ??
      (dto as any)?.youLookSelected ??
      [];
    // stringify for stable key; small array so OK
    try {
      return JSON.stringify(arr);
    } catch {
      return String(arr);
    }
  }, [dto]);

  const diceKey = `${dto?.id ?? "none"}-${dtoRevision}-${conditionsKey}`;

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
              onSaved={handleCharacterSaved}
            />
            <NPCsPanel campaignId={game.campaignId} isDirector={isDirector} />
          </>
        )}
      </div>

      <div className="space-y-4">
        {/* 🎲 Players only; uses CharacterDicePanel (auto-updates on save/conditions) */}
        {!isDirector && dto && (
          <div>
            <h2 className="text-lg font-bold text-white mb-2">🎲 Dice Roller</h2>
            <CharacterDicePanel
              key={diceKey}
              dto={dto}
              className="rounded-xl border p-3 bg-white/70"
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
