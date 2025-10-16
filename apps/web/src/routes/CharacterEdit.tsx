import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import CharacterForm from "../components/CharacterForm";

export default function CharacterEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [character, setCharacter] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api(`/characters/${id}`);
        if (!cancelled) setCharacter(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load character");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) load();
    return () => { cancelled = true; };
  }, [id]);

  if (!id) return <div className="p-6 text-gray-900">Missing character id.</div>;
  if (loading) return <div className="p-6 text-gray-900">Loading…</div>;
  if (error) return <div className="p-6 text-red-700">Error: {error}</div>;
  if (!character) return <div className="p-6 text-gray-900">Character not found.</div>;

  // When form saves successfully, navigate back to the view page
  const handleSaved = (savedId?: string) => {
    navigate(`/character/${savedId || id}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 text-gray-900">
      <h1 className="text-2xl font-bold mb-4">Edit {character.name}</h1>
      {/* IMPORTANT: pass initial data to pre-populate the form */}
      <CharacterForm initialData={character} mode="edit" onSaved={handleSaved} />
    </div>
  );
}
