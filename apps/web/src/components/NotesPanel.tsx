import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type Visibility = "public" | "director_private" | "hero";

type Note = {
  id: string;
  gameId: string;
  heroId?: string | null;
  userId?: string | null;
  visibility: Visibility;
  title?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
};

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function NotesPanel({
  gameId,
  currentUserId,
  isDirector = false,
}: {
  gameId: string;
  currentUserId: string | null;   // null if viewing unauthenticated
  isDirector?: boolean;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Visibility | "public">("public");

  // compose author-only filter for hero tab
  const myHeroNotes = useMemo(
    () => notes.filter(n => n.visibility === "hero" && n.userId === currentUserId),
    [notes, currentUserId]
  );
  const publicNotes = useMemo(
    () => notes.filter(n => n.visibility === "public"),
    [notes]
  );
  const directorNotes = useMemo(
    () => notes.filter(n => n.visibility === "director_private"),
    [notes]
  );

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/games/${gameId}/notes`);
      setNotes(res ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [gameId]);

  async function createNote(partial: Pick<Note, "title" | "content"> & { visibility: Visibility }) {
    setSaving(true);
    try {
      const created = await api.post(`/games/${gameId}/notes`, partial);
      setNotes(prev => [...prev, created]);
    } finally {
      setSaving(false);
    }
  }

  async function updateNote(noteId: string, patch: Partial<Pick<Note, "title" | "content" | "visibility">>) {
    setSaving(true);
    try {
      const updated = await api.patch(`/games/${gameId}/notes/${noteId}`, patch);
      setNotes(prev => prev.map(n => (n.id === noteId ? updated : n)));
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId: string) {
    setSaving(true);
    try {
      await api.delete(`/games/${gameId}/notes/${noteId}`);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } finally {
      setSaving(false);
    }
  }

  function TabButton({ id, label }: { id: "public" | "hero" | "director_private"; label: string }) {
    return (
      <button
        onClick={() => setTab(id)}
        className={classNames(
          "px-3 py-1 rounded-t border border-b-0 text-sm",
          tab === id ? "bg-slate-900 border-slate-700" : "bg-slate-800 border-slate-700/70 hover:bg-slate-700/60"
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-slate-800/70 border border-slate-700">
      <div className="px-3 pt-2">
        <div className="font-bold text-lg">📝 Notes</div>
      </div>

      <div className="px-3 mt-2 flex gap-1">
        <TabButton id="public" label="Public" />
        <TabButton id="hero" label="My Notes" />
        {isDirector && <TabButton id="director_private" label="Director" />}
      </div>

      <div className="p-3 border-t border-slate-700">
        {loading ? (
          <div className="text-slate-300 text-sm">loading…</div>
        ) : (
          <>
            <NoteEditor
              key={`editor-${tab}`}
              mode={tab}
              isDirector={isDirector}
              onCreate={(data) => createNote(data)}
            />

            <div className="mt-4 grid gap-3">
              {(tab === "public" ? publicNotes : tab === "director_private" ? directorNotes : myHeroNotes).map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  canEdit={
                    (isDirector && tab !== "hero") ||
                    (tab === "hero" && n.userId === currentUserId)
                  }
                  onSave={(patch) => updateNote(n.id, patch)}
                  onDelete={() => deleteNote(n.id)}
                />
              ))}
              {tab === "hero" && myHeroNotes.length === 0 && (
                <div className="text-slate-400 text-sm">You haven’t written any personal notes yet.</div>
              )}
              {tab === "public" && publicNotes.length === 0 && (
                <div className="text-slate-400 text-sm">No table notes yet.</div>
              )}
              {tab === "director_private" && directorNotes.length === 0 && isDirector && (
                <div className="text-slate-400 text-sm">No director notes yet.</div>
              )}
            </div>
          </>
        )}
        {saving && <div className="text-xs text-slate-400 mt-2">saving…</div>}
      </div>
    </div>
  );
}

function NoteEditor({
  mode,                       // which tab we're in controls default visibility
  isDirector,
  onCreate,
}: {
  mode: "public" | "hero" | "director_private";
  isDirector: boolean;
  onCreate: (data: { visibility: Visibility; title?: string; content: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const visibility: Visibility =
    mode === "hero" ? "hero" : mode === "director_private" ? "director_private" : "public";

  const canPost =
    visibility === "public" ? isDirector :
    visibility === "director_private" ? isDirector :
    true; // hero can always post their own

  return (
    <div className="rounded-lg border border-slate-700 p-2">
      {!isDirector && visibility !== "hero" ? (
        <div className="text-slate-400 text-sm">
          Only the director can post {visibility === "public" ? "public" : "director"} notes.
        </div>
      ) : (
        <>
          <div className="text-xs text-slate-400 mb-1">Posting as <span className="font-semibold">{visibility.replace("_", " ")}</span></div>
          <div className="flex flex-col gap-2">
            <input
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1"
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="bg-slate-900 border border-slate-700 rounded px-2 py-2 min-h-[80px]"
              placeholder="Write a note…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                disabled={!canPost || !content.trim()}
                onClick={() => {
                  onCreate({ visibility, title: title || undefined, content: content.trim() });
                  setTitle(""); setContent("");
                }}
                className={classNames(
                  "px-3 py-1 rounded",
                  canPost && content.trim()
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-slate-700 text-slate-400 cursor-not-allowed"
                )}
              >
                Post
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NoteCard({
  note,
  canEdit,
  onSave,
  onDelete,
}: {
  note: Note;
  canEdit: boolean;
  onSave: (patch: Partial<Pick<Note, "title" | "content">>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title ?? "");
  const [content, setContent] = useState(note.content);

  return (
    <div className="rounded-lg border border-slate-700 p-2">
      <div className="flex items-center justify-between">
        {editing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent border-b border-slate-600 focus:outline-none px-1 font-semibold"
          />
        ) : (
          <div className="font-semibold">{note.title || "(no title)"}</div>
        )}
        <div className="text-xs text-slate-400">{new Date(note.updatedAt).toLocaleString()}</div>
      </div>

      <div className="mt-1">
        {editing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 min-h-[80px]"
          />
        ) : (
          <div className="whitespace-pre-wrap">{note.content}</div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded bg-slate-700/70 border border-slate-600">
          {note.visibility.replace("_", " ")}
        </span>
        {canEdit && !editing && (
          <>
            <button onClick={() => setEditing(true)} className="text-sm px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Edit</button>
            <button onClick={onDelete} className="text-sm px-2 py-1 rounded bg-red-700/80 hover:bg-red-600">Delete</button>
          </>
        )}
        {canEdit && editing && (
          <>
            <button
              onClick={() => {
                onSave({ title, content });
                setEditing(false);
              }}
              className="text-sm px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setTitle(note.title ?? "");
                setContent(note.content);
              }}
              className="text-sm px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
