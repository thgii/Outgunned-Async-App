import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ChatBox from "../components/ChatBox";
import DiceRoller from "../components/DiceRoller";
import SceneClock from "../components/SceneClock";
import GMControls from "../components/GMControls";
import { api } from "../lib/api";

export default function Game() {
  const { id } = useParams();
  const [game, setGame] = useState<any>(null);

  useEffect(() => { api(`/games/${id}`).then(setGame); }, [id]);

  if (!game) return <div className="p-6">Loading…</div>;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="lg:col-span-2">
        <ChatBox gameId={id!}/>
      </div>
      <div className="space-y-4">
        <DiceRoller gameId={id!}/>
        <SceneClock gameId={id!}/>
        <GMControls gameId={id!}/>
      </div>
    </div>
  );
}
