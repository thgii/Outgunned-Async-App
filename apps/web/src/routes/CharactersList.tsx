import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

type Character = {
  id?: string | number;
  _id?: string;
  name: string;
  role?: { name?: string } | string;
  age?: string;
  job?: string;
  catchphrase?: string;
  flaw?: string;
  feats?: string[];
  gear?: string[];
};

export default function CharactersList() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api("/characters");
        // Accept either an array or {items: []}
        const list = Array.isArray(res) ? res : res?.items ?? [];
        if (mounted) setCharacters(list);
      } catch (e) {
        console.error(e);
        if (mounted) setErr("Failed to load characters.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">All Characters</h1>
 <button
   onClick={() => navigate("/characters/new")}
   className="px-3 py-2 rounded bg-black text-white hover:opacity-90"
 >
   Create Character
 </button>
      </div>

      {err && <div className="text-red-600 text-center mb-3">{err}</div>}

      {loading ? (
        <div className="text-center opacity-70">Loading…</div>
      ) : !characters.length ? (
        <div className="text-center opacity-70">
          <p>No characters yet.</p>
 <button
   className="mt-3 px-3 py-2 rounded bg-black text-white hover:opacity-90"
   onClick={() => navigate("/characters/new")}
 >
    Create your first character
</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {characters.map((c) => {
            const key = (c.id as string) ?? c._id ?? c.name;
            const roleName =
              typeof c.role === "string" ? c.role : c.role?.name ?? "—";
            const charId = (c.id as string) ?? c._id; // used for routes

            return (
              <div key={key} className="border rounded p-3 flex flex-col gap-2">
                <div className="font-semibold text-lg">{c.name}</div>
                <div className="text-sm opacity-80">{roleName}</div>
                <div className="text-sm">Age: {c.age ?? "—"}</div>
                <div className="text-xs mt-1">Job: {c.job ?? "—"}</div>
                <div className="text-xs">Catchphrase: {c.catchphrase ?? "—"}</div>
                <div className="text-xs">Flaw: {c.flaw ?? "—"}</div>
                {!!c.feats?.length && (
                  <div className="text-xs mt-2">Feats: {c.feats.join(", ")}</div>
                )}
                {!!c.gear?.length && (
                  <div className="text-xs mt-1">Gear: {c.gear.join(", ")}</div>
                )}

                <div className="mt-3 flex gap-2">
                   <button
   disabled={!charId}
   onClick={() => navigate(`/characters/${charId}/view`)}
   className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
 >
   View Sheet
 </button>
                  <button
   disabled={!charId}
   onClick={() => navigate(`/characters/${charId}/edit`)}
   className="px-3 py-1.5 rounded bg-black text-white hover:opacity-90 disabled:opacity-50"
 >
   Edit
 </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
