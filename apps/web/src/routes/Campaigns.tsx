// apps/web/src/routes/Campaigns.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Clapperboard, Users, Gamepad2, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

export type CampaignRow = {
  id: string;
  title: string;
  system: string;
  ownerId: string;
  createdAt: string;
  gameCount?: number;
  memberCount?: number;
  lastActivityAt?: string | null;
};

export default function Campaigns() {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api("/campaigns", { method: "GET" });
        if (!alive) return;
        setRows(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load campaigns");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => !showOnlyActive || (r.gameCount ?? 0) > 0)
      .filter((r) => (needle ? r.title.toLowerCase().includes(needle) || (r.system ?? "").toLowerCase().includes(needle) : true))
      .sort((a, b) => {
        const aTime = Date.parse(a.lastActivityAt || a.createdAt || 0);
        const bTime = Date.parse(b.lastActivityAt || b.createdAt || 0);
        return bTime - aTime;
      });
  }, [rows, q, showOnlyActive]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title or system..."
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm w-64 text-black placeholder-slate-500"
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showOnlyActive} onChange={(e) => setShowOnlyActive(e.target.checked)} />
            Only active (has acts)
          </label>
          <button
            onClick={() => navigate("/campaigns/new")}
            className="px-3 py-2 rounded bg-white text-black hover:opacity-90"
          >
            Create Campaign
          </button>
        </div>
      </div>

      {loading && <div className="p-4 bg-white rounded shadow text-black">Loading…</div>}
      {error && <div className="p-4 bg-red-50 text-red-800 rounded border border-red-200">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <Link key={c.id} to={`/campaign/${c.id}`} className="block group">
              <div className="rounded-2xl bg-white group-hover:bg-slate-50 shadow p-4 transition-colors border border-slate-200 text-black">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Clapperboard className="h-5 w-5" />
                    <h2 className="text-lg font-semibold leading-tight">{c.title}</h2>
                  </div>
                                  </div>
                <div className="mt-1 text-xs text-slate-600">{c.system}</div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-sm text-slate-800">
                  <div className="inline-flex items-center gap-1"><Gamepad2 className="h-4 w-4" />{c.gameCount ?? 0} Act(s)</div>
                  <div className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{c.memberCount ?? 0} members</div>
                  <div className="inline-flex items-center gap-1"><Activity className="h-4 w-4" />{formatWhen(c.lastActivityAt || c.createdAt)}</div>
                </div>
              </div>
            </Link>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full p-6 rounded-2xl border border-slate-200 bg-white text-center text-slate-800">
              <div className="text-sm">No campaigns{q ? " match your search" : showOnlyActive ? " with activity yet" : " yet"}.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}
