import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { HeatMeter } from "./HeatMeter";
import { CountdownsPanel } from "./CountdownsPanel";
import { ChaseTracker } from "./ChaseTracker";
import { NotesPanel } from "./NotesPanel";
import { VillainsPanel } from "./VillainsPanel";

type Options = {
  heat?: number;
  countdowns?: Array<{ id: string; label: string; total: number; current: number }>;
  chase?: { need: number; progress: number; speedHeroes: number; speedTarget: number };
};

export function SceneBoard({
  gameId,
  currentUserId,
  isDirector,
}: {
  gameId: string;
  currentUserId: string | null;
  isDirector: boolean;
}) {
  const [options, setOptions] = useState<Options | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      // 1) Get game row (to know campaignId)
      const game = await api.get(`/games/${gameId}`);
      setCampaignId(game?.campaignId ?? null);

      // 2) Options blob
      const opt = await api.get(`/games/${gameId}/options`);
      setOptions(opt ?? { heat: 0, countdowns: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [gameId]);

  const heat = options?.heat ?? 0;
  const countdowns = options?.countdowns ?? [];
  const chase = options?.chase ?? null;

  return (
    <div className="grid gap-4">
      {loading ? (
        <div className="text-slate-300 text-sm">loading scene…</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <HeatMeter gameId={gameId} initialHeat={heat} editable={isDirector} />
          </div>
          
          <ChaseTracker gameId={gameId} initial={chase} editable={isDirector} />

          <CountdownsPanel gameId={gameId} initial={countdowns} editable={isDirector} />

          <NotesPanel
            gameId={gameId}
            currentUserId={currentUserId}
            isDirector={isDirector}
          />

          {campaignId && (
            <VillainsPanel campaignId={campaignId} isDirector={isDirector} />
          )}
        </>
      )}
    </div>
  );
}
