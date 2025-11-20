import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

type NpcTemplate = {
  id: string;
  name: string;
  side: "ally" | "enemy";
  enemyType?: "goon" | "bad_guy" | "boss" | null;
  portraitUrl?: string | null;
};

export default function NpcsList() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<NpcTemplate[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api("/npc-templates");
        if (!alive) return;
        const arr: NpcTemplate[] = Array.isArray(res) ? res : res?.results ?? [];
        setTemplates(arr);
      } catch (e: any) {
        if (!alive) setErr(e?.message || "Failed to load NPC templates.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">NPC Library</h1>
        {/* For now, create happens inside Campaign NPC panel or a future wizard */}
      </div>

      {err && <div className="text-red-600 text-center mb-3">{err}</div>}

      {!templates.length ? (
        <div className="text-center opacity-70">
          <p>No NPC templates yet.</p>
          <p className="mt-2 text-sm">
            You can create NPCs from any Campaign page, then later we can add an NPC creator wizard here.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="border rounded p-3 flex gap-3 items-start bg-white">
              <div className="w-16 h-16 rounded overflow-hidden bg-slate-200 flex items-center justify-center text-xs">
                {t.portraitUrl ? (
                  <img src={t.portraitUrl} alt={t.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{t.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg">{t.name}</div>
                <div className="text-xs text-slate-600 mb-1">
                  {t.side === "ally" ? "Ally" : "Enemy"}
                  {t.enemyType ? ` — ${t.enemyType.replace("_", " ")}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
