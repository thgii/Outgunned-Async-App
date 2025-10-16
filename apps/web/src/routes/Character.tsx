import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import CharacterSheetV2 from "../components/CharacterSheetv2";

export default function Character() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [character, setCharacter] = useState<any>(null);

  useEffect(() => {
    let cancel = false;
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const c = await api(`/characters/${id}`);
        if (!cancel) setCharacter(c);
      } catch (e: any) {
        if (!cancel) setError(e?.message || "Failed to load character");
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => { cancel = true; };
  }, [id]);

  // Debounced PATCH on change
  let timer: number | undefined;
  const onChange = (next: any) => {
    setCharacter(next);
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      try {
        await api(`/characters/${id}`, {
          method: "PATCH",
          body: JSON.stringify(next),
        });
      } catch (e) {
        console.error("Save failed", e);
      }
    }, 400);
  };

  if (!id) return <div className="max-w-4xl mx-auto p-6">No character id.</div>;
  if (loading) return <div className="max-w-4xl mx-auto p-6">Loading…</div>;
  if (error) return <div className="max-w-4xl mx-auto p-6 text-red-600">{error}</div>;
  if (!character) return <div className="max-w-4xl mx-auto p-6">Not found.</div>;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <CharacterSheetV2 character={character} onChange={onChange} />
    </div>
  );
}
