import { useState } from "react";
import { api } from "../lib/api";
import { analyze, rollD6Pool } from "../lib/dice";

export default function DiceRoller({ gameId }: { gameId: string }) {
  const [pool, setPool] = useState(4);
  const [preview, setPreview] = useState<{pool:number[], outcome:string} | null>(null);

  const doRoll = async () => {
    const res = await api(`/games/${gameId}/rolls`, {
      method:"POST",
      body: JSON.stringify({ pool })
    });
    setPreview({ pool: res.pool, outcome: res.result.outcome });
  };

  return (
    <div className="bg-white rounded shadow p-3">
      <div className="font-semibold mb-2">Dice Roller (d6)</div>
      <div className="flex items-center gap-3">
        <label>Pool</label>
        <input type="number" min={1} max={10} value={pool} onChange={e=>setPool(Number(e.target.value))}
          className="w-20 border rounded px-2 py-1"/>
        <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={doRoll}>Roll</button>
      </div>
      {preview && (
        <div className="mt-3">
          <div>Roll: {preview.pool.join(", ")}</div>
          <div className="font-medium">Outcome: {preview.outcome}</div>
        </div>
      )}
    </div>
  );
}
