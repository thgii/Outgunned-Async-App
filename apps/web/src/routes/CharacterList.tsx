import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function CharactersList() {
  const [characters, setCharacters] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/characters")
      .then(setCharacters)
      .catch((e) => { console.error(e); setErr("Failed to load characters."); });
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4 text-center">All Characters</h1>
      {err && <div className="text-red-600 text-center mb-3">{err}</div>}
      {!characters.length ? (
        <div className="text-center opacity-70">No characters yet.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {characters.map((c) => (
            <div key={c.id ?? c.name} className="border rounded p-3">
              <div className="font-semibold text-lg">{c.name}</div>
              <div className="text-sm opacity-80">{c.role?.name ?? c.role}</div>
              <div className="text-sm">Age: {c.age}</div>
              {!!c.feats?.length && <div className="text-xs mt-2">Feats: {c.feats.join(", ")}</div>}
              {!!c.gear?.length && <div className="text-xs mt-1">Gear: {c.gear.join(", ")}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
