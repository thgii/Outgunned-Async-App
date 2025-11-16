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
import type { RollResult } from "../lib/dice";

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

  // 🔹 Bump this when the sheet saves, to force a fresh load
  const [characterVersion, setCharacterVersion] = useState(0);

  // Character DTO for CharacterDicePanel
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
  }, [myHero, characterVersion]);

    const handleCharacterSaved = () => {
    setCharacterVersion((v) => v + 1);
  };

    // 🔹 Spend adrenaline locally + persist to backend (no dice roller reset)
  const handleAdrenalineSpend = async (amount: number) => {
    if (!dto || amount <= 0) return;

    const current =
      Number(dto.resources?.adrenaline ?? dto.resources?.luck ?? 0) || 0;
    const next = Math.max(0, current - amount);

    // Optimistic UI update: adjust dto in state so CharacterDicePanel sees the new value
    setDto({
      ...dto,
      resources: {
        ...(dto.resources ?? {}),
        adrenaline: next,
        luck: next, // keep these in sync with how your resources work
      },
    });

    try {
      // Persist to backend; this can stay as your /spend endpoint
      await api.post(`/characters/${dto.id}/spend`, { adrenaline: amount });
    } catch (err) {
      console.error("Failed to persist adrenaline spend", err);
      // (Optional) You could roll back setDto here if you want to be fancy.
    }
  };

  const handleDiceRollToChat = async (
    kind: "roll" | "freeReroll" | "paidReroll" | "allIn",
    result: RollResult
  ) => {
    if (!dto) return;

    const { jackpot, impossible, extreme, critical, basic, flags } = result;
    const who = dto.name || "Unknown hero";

    // 🔥 Special case: All-In bust
    if (kind === "allIn" && flags?.allInBust) {
      const content = `${who} went all-in and busted, losing all successes.`;
      try {
        await api.post(`/games/${gameId}/messages`, { content });
      } catch (err) {
        console.error("Failed to post dice roll to chat", err);
      }
      return;
    }

    // Choose prefix based on roll type
    let prefix: string;
    if (kind === "freeReroll") {
      prefix = `${who} used a free re-roll and achieved`;
    } else if (kind === "paidReroll") {
      prefix = `${who} used an adrenaline to re-roll, and achieved`;
    } else if (kind === "allIn") {
      prefix = `${who} went all-in and achieved`;
    } else {
      prefix = `${who} achieved`;
    }

    // Helper for pluralization
    const seg = (count: number, label: string) => {
      if (count <= 0) return null;
      const word = count === 1 ? "success" : "successes";
      return `${count} ${label} ${word}`;
    };

    const parts = [
      seg(jackpot, "jackpot"),
      seg(impossible, "impossible"),
      seg(extreme, "extreme"),
      seg(critical, "critical"),
      seg(basic, "basic"),
    ].filter((x): x is string => Boolean(x));

    let content: string;

    if (parts.length === 0) {
      content = `${prefix} no successes.`;
    } else if (parts.length === 1) {
      content = `${prefix} ${parts[0]}.`;
    } else {
      const last = parts[parts.length - 1];
      const rest = parts.slice(0, -1).join(", ");
      content = `${prefix} ${rest} and ${last}.`;
    }

    try {
      await api.post(`/games/${gameId}/messages`, { content });
    } catch (err) {
      console.error("Failed to post dice roll to chat", err);
    }
  };

  if (!game) return <div className="p-6">Loading…</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="lg:col-span-2 flex flex-col gap-3">
        <ChatBox
          gameId={gameId}
          currentUserId={me?.id ?? null}
          isDirector={isDirector}
        />
        {game?.campaignId && (
          <>
            <CharacterMiniPanel
              campaignId={game.campaignId}
              currentUserId={me?.id ?? null}
              isDirector={isDirector}
              onCharacterSaved={handleCharacterSaved}
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
            <h2 className="text-lg font-bold text-white mb-2">🎲 Dice Roller</h2>
            <CharacterDicePanel
              dto={dto}
              className="rounded-xl border p-3 bg-white/70"
              onSpendAdrenaline={handleAdrenalineSpend}
              onPaidRerollSpend={handleAdrenalineSpend}
              onRollEvent={handleDiceRollToChat}
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