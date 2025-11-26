import { useState } from "react";
import MessageEditor from "./MessageEditor";
import { api } from "../lib/api";

type ReactionType = "like" | "laugh" | "wow";

const REACTIONS = [
  { type: "like", icon: "👍" },
  { type: "laugh", icon: "😂" },
  { type: "wow", icon: "😮" },
];

const colorRegistry = new Map<string, string>();
let nextHueIndex = 0;

function getColorForKey(key: string): string {
  // Already seen? Reuse color
  const existing = colorRegistry.get(key);
  if (existing) return existing;

  // New character → assign a new hue
  const hue = (nextHueIndex * 137) % 360; // 137° jumps spread colors nicely
  nextHueIndex += 1;

  const color = `hsl(${hue}deg, 70%, 85%)`;
  colorRegistry.set(key, color);
  return color;
}

export default function Message({
  msg,
  currentUserId,
  isDirector,
  onEdited,
  onToggleReaction,
}: {
  msg: any;
  currentUserId: string | null;
  isDirector: boolean;
  onEdited: (updated: any) => void;
  onToggleReaction?: (messageId: string, type: ReactionType) => void;
}) {
  const [editing, setEditing] = useState(false);

  const reactions = (msg.reactions ?? {}) as {
    like?: number;
    laugh?: number;
    wow?: number;
    myReaction?: ReactionType | null;
  };

  const likeCount = reactions.like ?? 0;
  const laughCount = reactions.laugh ?? 0;
  const wowCount = reactions.wow ?? 0;
  const myReaction = reactions.myReaction ?? null;

  const handleReactionClick = (type: ReactionType) => {
    if (!onToggleReaction || !currentUserId) return;
    onToggleReaction(msg.id, type);
  };

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

  const bubbleColor = getColorForKey(colorKey);
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

            {/* Reactions */}
            <div className="mt-1 flex gap-2 text-[0.7rem] text-gray-800">
              {REACTIONS.map(({ type, icon, label }) => {
                const count =
                  type === "like"
                    ? likeCount
                    : type === "laugh"
                    ? laughCount
                    : wowCount;
                const isActive = myReaction === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleReactionClick(type)}
                    className={[
                      "inline-flex items-center gap-1 rounded-full border px-2 py-[2px]",
                      "transition",
                      isActive
                        ? "border-yellow-500 bg-yellow-400/30"
                        : "border-black/20 bg-black/5 hover:bg-black/10",
                    ].join(" ")}
                  >
                    <span aria-hidden="true">{icon}</span>
                    {count > 0 && (
                      <span className="text-[0.65rem] opacity-70">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
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
