// apps/web/src/routes/Character.tsx
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import CharacterSheetV2 from "../components/CharacterSheetV2";

const AUTOSAVE_DELAY_MS = 700;

export default function Character() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [character, setCharacter] = useState<any>(null);

  // status: idle | saving | saved
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");

  // keep the latest draft & dirty flag in refs (won’t be reset by re-renders)
  const latestRef = useRef<any>(null);
  const isDirtyRef = useRef(false);

  // timer ref: works in both browser and node typings
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load
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
          latestRef.current = c;
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
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id]);

  // PATCH helper
  const saveNow = async (payload: any) => {
    if (!id) return;
    setSaving("saving");
    try {
      await api(`/characters/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json", // <-- important if your api() doesn’t add this
        },
        body: JSON.stringify(payload),
      });
      latestRef.current = payload;
      isDirtyRef.current = false;
      setSaving("saved");
      // fade “saved”
      window.setTimeout(() => setSaving("idle"), 1000);
    } catch (e) {
      console.error("Save failed", e);
      // stay “idle” but keep Edited badge visible
      setSaving("idle");
    }
  };

  // AUTOSAVE: debounce onChange calls
  const onChange = (next: any) => {
    setCharacter(next);
    latestRef.current = next;
    isDirtyRef.current = true;

    // show explicit “Saving…” while debouncing (optional UX)
    setSaving("saving");

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // guard: if nothing changed since we scheduled, skip
      if (!isDirtyRef.current) {
        setSaving("idle");
        return;
      }
      saveNow(latestRef.current);
    }, AUTOSAVE_DELAY_MS);
  };

  // Flush pending save when the tab/window is hidden or page unloads
  useEffect(() => {
    const onHide = () => {
      if (timerRef.current && isDirtyRef.current && latestRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        // fire-and-forget (no await on page hide)
        saveNow(latestRef.current);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onHide);
    };
  }, []);

  // Manual “Save now” (handy for testing)
  const handleSaveClick = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (latestRef.current) saveNow(latestRef.current);
  };

  if (!id) return <div className="max-w-4xl mx-auto p-6">No character id.</div>;
  if (loading) return <div className="max-w-4xl mx-auto p-6">Loading…</div>;
  if (error) return <div className="max-w-4xl mx-auto p-6 text-red-600">{error}</div>;
  if (!character) return <div className="max-w-4xl mx-auto p-6">Not found.</div>;

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-2 flex items-center justify-end gap-3 text-sm">
        <button
          className="rounded-md border border-zinc-300 px-2 py-1 text-zinc-700 hover:bg-zinc-50"
          onClick={handleSaveClick}
          disabled={!isDirtyRef.current || saving === "saving"}
          title="Save now"
        >
          Save now
        </button>
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
