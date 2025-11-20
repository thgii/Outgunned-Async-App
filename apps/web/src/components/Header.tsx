import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

type NpcTemplate = {
  id: string;
  name: string;
  side: "ally" | "enemy";
  enemyType?: "goon" | "bad_guy" | "boss" | null;
  portraitUrl?: string | null;
};

export default function NpcTemplatesPage() {
  const [templates, setTemplates] = useState<NpcTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api("/npc-templates");
        if (!alive) return;

        const arr: NpcTemplate[] = Array.isArray(res)
          ? res
          : res?.results ?? [];

        setTemplates(arr);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load NPC templates");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">NPC Templates</h1>
        <Link
          to="/npc-templates/new"
          className="rounded bg-white text-black px-3 py-2 hover:bg-gray-200"
        >
          + Create NPC
        </Link>
      </div>

      {templates.length === 0 ? (
        <p classname="text-gray-300">No NPC templates created yet.</p>
      ) : (
        <ul className="divide-y divide-gray-700">
          {templates.map((n) => (
            <li key={n.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {n.portraitUrl ? (
                  <img
                    src={n.portraitUrl}
                    className="w-10 h-10 rounded object-cover border border-gray-400"
                    alt={n.name}
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center text-gray-300 font-semibold">
                    {n.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="text-white font-medium">{n.name}</div>
                  <div className="text-xs text-gray-400">
                    {n.side === "ally"
                      ? "Ally"
                      : n.enemyType
                      ? `Enemy — ${n.enemyType.replace("_", " ")}`
                      : "Enemy"}
                  </div>
                </div>
              </div>

              <Link
                to={`/npc-templates/${n.id}`}
                className="text-blue-300 hover:underline"
              >
                View
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
