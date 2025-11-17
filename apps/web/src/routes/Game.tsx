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
import { SceneSettingPanel } from "../components/SceneSettingPanel";

type GameRow = {
  id: string;
  campaignId: string;
  title: string; // Acts/games use title
  status?: string;
  summary?: string | null;
  membershipRole?: string | null;
  createdAt?: string;
};

type CampaignRow = {
  id: string;
  title: string; // Campaigns use title
  system?: string;
  membershipRole?: string | null;
};

type Me = { id: string } | null;
type RoleResp = { role?: "director" | "hero" };

export default function Game() {
  const { id } = useParams();
  const gameId = id!;
  const [game, setGame] = useState<GameRow | null>(null);
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [me, setMe] = useState<Me>(null);
  const [isDirector, setIsDirector] = useState(false);
  const [heroes, setHeroes] = useState<any[]>([]);
  const [myHero, setMyHero] = useState<any | null>(null);

  // 🔹 Bump this when the sheet saves, to force a fresh load
  const [characterVersion, setCharacterVersion] = useState(0);

  // Character DTO for CharacterDicePanel
  const [dto, setDto] = useState<CharacterDTO | null>(null);

  // Load game (for campaignId and top-of-page data) + campaign
  useEffect(() => {
    (async () => {
      const g = (await api.get(`/games/${gameId}`).catch(() => null)) as GameRow | null;
      setGame(g);

      if (g?.campaignId) {
        const c = (await api
          .get(`/campaigns/${g.campaignId}`)
          .catch(() => null)) as CampaignRow | null;
        setCampaign(c);
      }
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
        const arr = (list ?? []) as any[];
        setHeroes(arr);
        const mine = arr.find((h) => h.ownerId === me.id);
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
      // (Optional) rollback dto here if you want
    }
  };

    // 🔹 Apply Gamble consequences: lose 1 Grit per Snake Eye
  const handleGambleGritLoss = async (snakeEyes: number) => {
    if (!dto || snakeEyes <= 0) return;

    const current =
      Number(dto.grit?.current ?? (dto as any).resources?.grit?.current ?? 0) || 0;
    const max =
      Number(dto.grit?.max ?? (dto as any).resources?.grit?.max ?? 12) || 12;

    const nextCurrent = Math.max(0, current + snakeEyes);

    // Optimistic UI update for the sheet + any panels using dto
    setDto({
      ...dto,
      grit: { current: nextCurrent, max },
      resources: {
        ...(dto as any).resources,
        grit: { current: nextCurrent, max },
      },
    });

    const heroName = dto.name || "Unknown hero";
    const suffix = snakeEyes === 1 ? "Snake Eye" : "Snake Eyes";
    const msg = `${heroName} gambled and rolled ${snakeEyes} ${suffix}, losing ${snakeEyes} Grit.`;

    try {
      // Persist Grit change
      await api.patch(`/characters/${dto.id}`, {
        grit: { current: nextCurrent, max },
      });

      // Log to chat
      await api.post(`/games/${gameId}/messages`, { content: msg });
    } catch (err) {
      console.error("Failed to apply Gamble grit loss", err);
      // (Optional) rollback dto here if you want to be strict
    }
  };

    const handleDeathRouletteRoll = async ({
    characterId,
    bulletsBefore,
    roll,
    outcome,
  }: {
    characterId: string;
    bulletsBefore: number;
    roll: number;
    outcome: "narrowEscape" | "leftForDead";
  }) => {
    // Find hero row so we can get hero name + owner username
    const hero =
      heroes.find((h) => h.id === characterId || h.characterId === characterId) ?? null;

    const heroName = hero?.name ?? "Unknown hero";
    const playerName =
      hero?.ownerName ??
      hero?.owner?.name ??
      "unknown player";

    const bullets = bulletsBefore;

    const outcomeText =
      outcome === "narrowEscape"
        ? "narrowly avoiding death and adding another bullet to their cylinder."
        : "being left for dead (unless an ally spends a Spotlight to save them).";

    const content = `${heroName} (${playerName}) rolled the death roulette. They had ${bullets} lethal bullet${
      bullets === 1 ? "" : "s"
    } in their cylinder and rolled a ${roll}, resulting in ${outcomeText}`;

    try {
      await api.post(`/games/${gameId}/messages`, { content });
    } catch (err) {
      console.error("Failed to post death roulette to chat", err);
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
      prefix = `${who} used a re-roll and achieved`;
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

  // ✅ Use title for both campaign and act
  const campaignName = (campaign?.title ?? "").trim() || "Campaign";
  const actName = (game.title ?? "").trim() || "Act";

  return (
    <div className="p-4 space-y-4">
      {/* 🔹 Header above both columns */}
      <header className="mb-2">
        <h1 className="text-2xl font-bold text-white drop-shadow">
          {campaignName}: {actName}
        </h1>
        {game.summary && (
          <p className="text-sm text-white/80 mt-1">{game.summary}</p>
        )}
      </header>

      {/* 🔹 Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                onDeathRouletteRoll={handleDeathRouletteRoll}
              />
              <NPCsPanel
                campaignId={game.campaignId}
                isDirector={isDirector}
              />
            </>
          )}
        </div>

        <div className="space-y-4">
          {/* 🖼 Current Setting: sits above Dice/Heat/SceneBoard */}
          <SceneSettingPanel gameId={gameId} isDirector={isDirector} />

          {/* 🎲 Players only; uses CharacterDicePanel (no local selector needed) */}
          {!isDirector && dto && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-white">
                  🎲 Dice Roller
                </h2>

                {/* Tooltip trigger + panel */}
                <div className="relative group">
                  <button
                    type="button"
                    aria-label="How dice rolling works"
                    className="w-5 h-5 rounded-full text-xs leading-[18px] border border-slate-400 text-slate-100 bg-slate-700/60 hover:bg-slate-600 hover:border-slate-200 focus:outline-none"
                    tabIndex={0}
                  >
                    ?
                  </button>

                  {/* Tooltip panel */}
                  <div
                    className="
                      invisible opacity-0
                      group-hover:visible group-hover:opacity-100
                      group-focus-within:visible group-focus-within:opacity-100
                      absolute z-20 left-1/2 -translate-x-1/2 mt-2
                      w-[22rem] text-left rounded-lg border border-slate-600
                      bg-slate-900/95 text-slate-100 shadow-xl p-3
                      text-xs sm:text-sm leading-snug space-y-2
                      transition duration-150
                    "
                  >
                    <p className="font-semibold">Outgunned dice flow</p>

                    <ol className="list-decimal pl-4 space-y-1">
                      <li>
                        Roll <span className="font-medium">Attribute + Skill (+ modifiers)</span> and
                        count your Basic / Critical / higher successes.
                      </li>
                      <li>
                        If you scored at least one success, you may take{" "}
                        <span className="font-medium">one normal Re-roll</span>. Reroll only
                        dice that weren&apos;t part of a success. If the new result
                        isn&apos;t better, you lose one previous success.
                      </li>
                      <li>
                        If you have a <span className="font-medium">Free Re-roll</span>, you may use it instead
                        (even with 0 successes). Free Re-rolls never make you
                        lose successes.
                      </li>
                      <li>
                        If your Re-roll (normal or free){" "}
                        <span className="font-medium">improved</span> the result, you may go{" "}
                        <span className="font-semibold">All In</span>: reroll all non-success
                        dice again. If that roll isn&apos;t better, you lose all
                        previous successes.
                      </li>
                    </ol>

                    <p className="italic text-[0.7rem] sm:text-xs text-slate-300">
                      Max 3 rolls total: initial roll → 1 reroll (normal or free) → optional All In.
                    </p>
                  </div>
                </div>
              </div>

              <CharacterDicePanel
                dto={dto}
                className="rounded-xl border p-3 bg-white/70"
                onSpendAdrenaline={handleAdrenalineSpend}
                onPaidRerollSpend={handleAdrenalineSpend}
                onRollEvent={handleDiceRollToChat}
                onGambleGritLoss={handleGambleGritLoss}
              />
            </div>
          )}

          <SceneBoard
            gameId={gameId}
            currentUserId={me?.id ?? null}
            isDirector={isDirector}
          />
        </div>
      </div>
    </div>
  );
}