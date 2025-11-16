import { useEffect, useState, type ChangeEvent } from "react";
import type { GameOptions } from "@action-thread/types";
import { api, uploadImage } from "../lib/api";

type Props = {
  gameId: string;
  isDirector: boolean;
};

export function SceneSettingPanel({ gameId, isDirector }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current options to get sceneImageUrl
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const opts = (await api.get(
          `/games/${encodeURIComponent(gameId)}/options`
        )) as GameOptions;

        if (!cancelled) {
          const url =
            (opts as any).sceneImageUrl != null
              ? (opts as any).sceneImageUrl
              : null;
          setImageUrl(url);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load scene options", err);
          setError("Could not load current setting.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  async function handleFileChange(
    e: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setError(null);
    try {
      const { url } = await uploadImage(file);
      // Persist to game options
      await api.patch(`/games/${encodeURIComponent(gameId)}/options`, {
        sceneImageUrl: url,
      });
      setImageUrl(url);
    } catch (err) {
      console.error("Failed to upload scene image", err);
      setError("Upload failed. Please try again.");
    } finally {
      setSaving(false);
      // Clear the input so selecting the same file again re-triggers change
      e.target.value = "";
    }
  }

  async function handleClear(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/games/${encodeURIComponent(gameId)}/options`, {
        sceneImageUrl: null,
      });
      setImageUrl(null);
    } catch (err) {
      console.error("Failed to clear scene image", err);
      setError("Could not clear current setting.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-white">Current Setting:</h2>
        {saving && (
          <span className="text-xs text-slate-300" aria-live="polite">
            Saving…
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-slate-300">Loading setting…</div>
      ) : imageUrl ? (
        <div className="space-y-2">
          <div className="aspect-video overflow-hidden rounded-lg border border-slate-700 bg-black/40">
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <img
              src={imageUrl}
              alt="Current scene setting"
              className="w-full h-full object-cover"
            />
          </div>

          {isDirector && (
            <div className="flex flex-wrap gap-2 text-xs text-slate-200">
              <label className="cursor-pointer inline-flex items-center gap-1 rounded border border-slate-600 px-2 py-1 hover:bg-slate-800">
                <span>Change image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <button
                type="button"
                className="rounded border border-red-500/60 px-2 py-1 hover:bg-red-600/20"
                onClick={handleClear}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-300">
            {isDirector
              ? "No scene image set yet. Upload one to show the current setting to your players."
              : "The Director has not set a scene image yet."}
          </p>
          {isDirector && (
            <label className="cursor-pointer inline-flex items-center gap-1 rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800">
              <span>Upload image</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>
      )}

      {error && <div className="text-xs text-red-300">{error}</div>}
    </section>
  );
}
