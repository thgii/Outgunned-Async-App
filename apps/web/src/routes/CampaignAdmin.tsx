import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";

type Member = { userId: string; role: "director" | "hero"; name: string; email?: string | null };

export default function CampaignAdmin() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const data = await api(`/campaigns/${campaignId}/members`, { method: "GET" });
      setMembers(data as Member[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load members");
    }
  }

  useEffect(() => { if (campaignId) load(); }, [campaignId]);

  async function setRole(userId: string, role: "director" | "hero") {
    setBusyUserId(userId);
    setError(null);
    try {
      await api(`/campaigns/${campaignId}/members/${userId}/role`, {
        method: "POST",
        json: { role },
      });
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update role");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Campaign Admin</h1>
      {error && <div className="mb-3 rounded border border-red-400/40 bg-red-900/20 px-3 py-2 text-sm">{error}</div>}
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-t border-white/10">
                <td className="px-3 py-2">{m.name}</td>
                <td className="px-3 py-2 opacity-80">{m.email ?? "—"}</td>
                <td className="px-3 py-2">{m.role}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      disabled={busyUserId === m.userId || m.role === "director"}
                      onClick={() => setRole(m.userId, "director")}
                      className="px-3 py-1 rounded border border-white/20 hover:bg-white/10 disabled:opacity-50"
                    >
                      Make Director
                    </button>
                    <button
                      disabled={busyUserId === m.userId || m.role === "hero"}
                      onClick={() => setRole(m.userId, "hero")}
                      className="px-3 py-1 rounded border border-white/20 hover:bg-white/10 disabled:opacity-50"
                    >
                      Make Hero
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center opacity-70" colSpan={4}>
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
