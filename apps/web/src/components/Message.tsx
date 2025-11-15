import { useState } from "react";
import MessageEditor from "./MessageEditor";
import { api } from "../lib/api";

export default function Message({ msg, onEdited }: { msg: any; onEdited: (m: any) => void }) {
  const [editing, setEditing] = useState(false);

  // Prefer character name, then fall back to player username, then "Unknown"
  const label = msg.characterName || msg.authorName || "Unknown";
  const byline =
    msg.characterName && msg.authorName && msg.characterName !== msg.authorName
      ? `(${msg.authorName})`
      : "";

  return (
    <div className="p-2 border rounded text-black">
      {!editing ? (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-sm font-semibold">
              {label}{" "}
              {byline && (
                <span className="ml-1 text-xs font-normal text-slate-500">{byline}</span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              {new Date(msg.createdAt).toLocaleString()}
            </div>
          </div>

          <div className="mt-1 whitespace-pre-wrap">{msg.content}</div>

          <div className="text-right">
            <button
              className="text-xs text-blue-600 underline"
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          </div>
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
  );
}