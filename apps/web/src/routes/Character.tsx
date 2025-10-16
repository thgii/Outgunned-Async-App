import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import CharacterSheetV2 from "../components/CharacterSheetv2";

const AUTOSAVE_DELAY_MS = 600;

export default function Character() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [character, setCharacter] = useState<any>(null);

  const isDirtyRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const c = await api(`/characters/${id}`);
        if (!cancel) {
          setCharacter(c);
          isDirtyRef.current = false;
          setSaving("idle");
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message || "Failed to load character");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [id]);

  const saveNow = async (payload: any) => {
    if (!id) return;
    setSaving("saving");
    try {
      await api(`/characters/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      isDirtyRef.current = false;
      setSaving("saved");
      // fade "saved" state after a moment
      window.setTimeout(() => setSaving("idle"), 1200);
    } catch (e) {
      console.error("Save failed", e);
      setSaving("idle");
    }
  };

  // AUTOSAVE: debounce onChange calls
  const onChange = (next: any) => {
    setCharacter(next);
    isDirtyRef.current = true;
    setSaving("saving");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => saveNow(next), AUTOSAVE_DELAY_MS);
  };

  if (!id) return <div className="max-w-4xl mx-auto p-6">No character id.</div>;
  if (loading) return <div className="max-w-4xl mx-auto p-6">Loading…</div>;
  if (error) return <div className="max-w-4xl mx-auto p-6 text-red-600">{error}</div>;
  if (!character) return <div className="max-w-4xl mx-auto p-6">Not found.</div>;

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-2 flex items-center justify-end gap-3 text-sm">
        <span className="rounded-md border px-2 py-1 text-zinc-600">
          {saving === "saving" && "Saving…"}
          {saving === "saved" && "Saved"}
          {saving === "idle" && (isDirtyRef.current ? "Edited" : "Up to date")}
        </span>
      </div>
      <CharacterSheetV2 character={character} onChange={onChange} />
    </div>
  );
}
