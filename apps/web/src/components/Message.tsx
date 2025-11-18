import { useState } from "react";
import MessageEditor from "./MessageEditor";
import { api } from "../lib/api";

export default function Message({
  msg,
  currentUserId,
  isDirector,
  onEdited,
}) {
  const [editing, setEditing] = useState(false);

  // SAME PERMISSIONS YOU ALREADY HAVE
  const canEdit =
    isDirector || (currentUserId && msg.authorId === currentUserId);

  // LABELS (CHARACTER → PLAYER)
  const label = msg.characterName || msg.authorName || "Unknown";
  const byline =
    msg.characterName &&
    msg.authorName &&
    msg.characterName !== msg.authorName
      ? `(${msg.authorName})`
      : "";

  const isMine = currentUserId && msg.authorId === currentUserId;

  // ---------- 🎨 CHARACTER-BASED COLOR KEY ----------
  // Character always wins → fall back to author → fall back to name.
  const colorKey =
    msg.characterId ||
    msg.characterName ||
    msg.authorId ||
    msg.authorName ||
    "unknown";

  // Stable hash → HSL color (Hundreds of unique colors, stable)
  function colorForKey(key) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    const hue = hash % 360; // 0–359 unique hues
    return `hsl(${hue}deg, 70%, 85%)`;
  }

  const bubbleColor = colorForKey(colorKey);
  // ---------------------------------------------------

  return (
    <div
      className={`flex w-full my-1 ${
        isMine ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className="max-w-[80%] text-sm shadow-md"
        style={{
          backgroundColor: bubbleColor,
          color: "black",
          borderRadius: isMine
            ? "16px 16px 0px 16px"
            : "16px 16px 16px 0px",
          padding: "0.5rem 0.75rem",
        }}
      >
        {!editing ? (
          <>
            {/* Header */}
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-xs font-semibold">
                {label}{" "}
                {byline && (
                  <span className="ml-1 text-[0.65rem] font-normal opacity-80">
                    {byline}
                  </span>
                )}
              </div>
              <div className="text-[0.65rem] opacity-70">
                {new Date(msg.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Content */}
            <div className="mt-1 whitespace-pre-wrap text-sm">
              {msg.content}
            </div>

            {/* Edit */}
            {canEdit && (
              <div className="mt-1 text-right">
                <button
                  className="text-[0.65rem] underline opacity-80 hover:opacity-100"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
              </div>
            )}
          </>
        ) : (
          <MessageEditor
            defaultValue={msg.content}
            onCancel={() => setEditing(false)}
            onSave={async (content) => {
              const updated = await api(`/messages/${msg.id}`, {
                method: "PATCH",
                body: JSON.stringify({ content }),
              });
              onEdited(updated);
              setEditing(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
