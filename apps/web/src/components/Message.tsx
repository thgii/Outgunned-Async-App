import { useState } from "react";
import MessageEditor from "./MessageEditor";
import { api } from "../lib/api";

export default function Message({
  msg,
  currentUserId,
  isDirector,
  onEdited,
}: {
  msg: any;
  currentUserId: string | null;
  isDirector: boolean;
  onEdited: (m: any) => void;
}) {
  const [editing, setEditing] = useState(false);

  // Same permission logic you already had
  const canEdit =
    isDirector || (currentUserId && msg.authorId === currentUserId);

  // Prefer character name, then fall back to player username, then "Unknown"
  const label = msg.characterName || msg.authorName || "Unknown";
  const byline =
    msg.characterName &&
    msg.authorName &&
    msg.characterName !== msg.authorName
      ? `(${msg.authorName})`
      : "";

  // Is this my message? (for alignment)
  const isMine = currentUserId && msg.authorId === currentUserId;

  // Simple deterministic color per author
  const COLORS = [
    "#e57373", // red
    "#64b5f6", // blue
    "#81c784", // green
    "#ffd54f", // yellow
    "#ba68c8", // purple
    "#4dd0e1", // teal
  ];

  const colorForUser = (id: string | null | undefined) => {
    if (!id) return "#e0e0e0";
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash + id.charCodeAt(i)) % COLORS.length;
    }
    return COLORS[hash];
  };

  const bubbleColor = colorForUser(msg.authorId);

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
            ? "16px 16px 0px 16px" // my messages: tail on left
            : "16px 16px 16px 0px", // others: tail on right
          padding: "0.5rem 0.75rem",
        }}
      >
        {!editing ? (
          <>
            {/* Header: name + byline + timestamp */}
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

            {/* Message content */}
            <div className="mt-1 whitespace-pre-wrap text-sm">
              {msg.content}
            </div>

            {/* Edit button (if allowed) */}
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
