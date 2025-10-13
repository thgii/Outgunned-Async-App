import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function CharactersList() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/characters")
      .then(setCharacters)
      .catch((e) => { console.error(e); setErr("Failed to load characters."); });
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
      {!characters.length ? (
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
            const key = c.id ?? c._id ?? c.name;
            const charId = c.id ?? c._id;
            return (
              <div key={key} className="border rounded p-3">
                <div className="font-semibold text-lg">{c.name}</div>
                <div className="text-sm opacity-80">{c.role?.name ?? c.role ?? "—"}</div>
                <div className="text-sm">Age: {c.age ?? "—"}</div>
                <div className="text-xs mt-1">Job: {c.job ?? "—"}</div>
                <div className="text-xs">Catchphrase: {c.catchphrase ?? "—"}</div>
                <div className="text-xs">Flaw: {c.flaw ?? "—"}</div>
                {!!c.feats?.length && <div className="text-xs mt-2">Feats: {c.feats.join(", ")}</div>}
                {!!c.gear?.length && <div className="text-xs mt-1">Gear: {c.gear.join(", ")}</div>}

                <div className="mt-3 flex gap-2">
                  <button
                    disabled={!charId}
                    onClick={() => navigate(`/character/${charId}`)}
                    className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    View Sheet
                  </button>
                  <button
                    disabled={!charId}
                    onClick={() => navigate(`/character/${charId}`)}
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
