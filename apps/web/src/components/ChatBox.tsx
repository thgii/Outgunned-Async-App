import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import Message from "./Message";
import MessageEditor from "./MessageEditor";

type Props = {
  gameId: string;
  currentUserId: string | null;
  isDirector: boolean;
};

type ReactionType = "like" | "laugh" | "wow";

export default function ChatBox({ gameId, currentUserId, isDirector }: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const sinceRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Simple polling; upgrade to SSE or Durable Objects later
  useEffect(() => {
  let timer: number | undefined;
  let interval = 1000; // start at 1s
  let ids = new Set<string>();

  // RESET when gameId changes
  setMessages([]);
  sinceRef.current = null;
  ids.clear();

  const poll = async () => {
    try {
      const qs = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : "";
      const delta = await api(`/games/${gameId}/messages${qs}`);

      if (delta.length) {
        // de-dupe just in case
        const fresh = delta.filter((m: any) => {
          if (ids.has(m.id)) return false;
          ids.add(m.id);
          return true;
        });
        if (fresh.length) {
          setMessages((m) => [...m, ...fresh]);
          sinceRef.current = delta[delta.length - 1].createdAt;
        }
        interval = 1000; // reset on activity
      } else {
        // gentle idle backoff (max 30s)
        interval = Math.min(interval + 1000, 30000);
      }
    } catch {
      // network hiccup: back off more aggressively
      interval = Math.min(interval + 5000, 30000);
    } finally {
      if (!document.hidden) {
        timer = window.setTimeout(poll, interval);
      } else if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    }
  };

  const onVis = () => {
    if (!document.hidden && !timer) poll();
    if (document.hidden && timer) { clearTimeout(timer); timer = undefined; }
  };

  document.addEventListener("visibilitychange", onVis);
  poll();

  return () => {
    if (timer) clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVis);
  };
}, [gameId]);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

    const toggleReaction = async (messageId: string, type: ReactionType) => {
      try {
        const reactions = await api(
          `/games/${gameId}/messages/${messageId}/reactions`,
          {
            method: "POST",
            body: JSON.stringify({ type }),
          }
        );

        setMessages((arr) =>
          arr.map((m: any) =>
            m.id === messageId ? { ...m, reactions } : m
          )
        );
      } catch (err) {
        console.error("Failed to toggle reaction", err);
      }
    };

  const send = async () => {
    if (!content.trim()) return;
    const msg = await api(`/games/${gameId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content })
    });
    setContent("");
  };

  return (
    <div className="bg-white rounded shadow p-3 h-[78vh] flex flex-col">
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-3">
        {messages.map((m) => (
          <Message
            key={m.id}
            msg={m}
            currentUserId={currentUserId}
            isDirector={isDirector}
            onEdited={(newMsg) => {
              setMessages((arr) =>
                arr.map((x) => (x.id === newMsg.id ? newMsg : x))
              );
            }}
            onToggleReaction={toggleReaction}
          />
        ))}
      </div>

      <div className="mt-3 flex gap-2 items-end">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault(); // stop adding a new line
              send();
            }
          }}
          rows={3}
          className="flex-1 border rounded px-3 py-2 resize-none leading-relaxed"
          placeholder="Type a message… (Enter to send, Shift+Enter for a new line)"
        />
        <button
          onClick={send}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
