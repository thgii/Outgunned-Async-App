import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import Message from "./Message";
import MessageEditor from "./MessageEditor";

type ChatMessage = {
  id: string;
  authorId: string | null;
  authorName?: string | null;
  characterName?: string | null;
  createdAt: string;
  content: string;
};

function buildCatchupText(messages: ChatMessage[], currentUserId: string | null): string {
  if (!messages.length) return "";

  // 1. Find the last message sent by this user (if any)
  const myMessages = currentUserId
    ? messages.filter((m) => m.authorId === currentUserId)
    : [];

  const lastMyMessage =
    myMessages.length > 0
      ? myMessages.reduce((latest, m) =>
          m.createdAt > latest.createdAt ? m : latest
        )
      : null;

  // 2. Take all messages after their last one; if none, use all messages
  const relevantMessages = lastMyMessage
    ? messages.filter((m) => m.createdAt > lastMyMessage.createdAt)
    : messages;

  if (!relevantMessages.length) return "";

  // 3. Build the ChatGPT prompt + transcript
  const promptHeader = `
You are helping a player catch up on an asynchronous tabletop RPG chat.

Please:
- Summarize what has happened since my last message.
- Highlight important decisions, clues, conflicts, and consequences.
- List anything my character is expected to respond to or decide next.
- Keep it concise but clear.

Here is the conversation from the point I was last active:
  `.trim();

  const transcriptLines = relevantMessages.map((m) => {
    const ts = new Date(m.createdAt).toLocaleString();
    const speaker =
      m.characterName && m.authorName && m.characterName !== m.authorName
        ? `${m.characterName} (${m.authorName})`
        : m.characterName || m.authorName || "Unknown";
    const content = m.content ?? "";
    return `[${ts}] ${speaker}: ${content}`;
  });

  const transcript = transcriptLines.join("\n");

  return `${promptHeader}\n\n--- Conversation ---\n${transcript}`;
}

type Props = {
  gameId: string;
  currentUserId: string | null;
  isDirector: boolean;
};

export default function ChatBox({ gameId, currentUserId, isDirector }: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const sinceRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const handleCatchMeUp = () => {
    const text = buildCatchupText(messages as ChatMessage[], currentUserId);

    if (!text) {
      alert("Nothing to catch up on yet.");
      return;
    }

    const win = window.open("", "_blank", "noopener,noreferrer");

    if (!win) {
      // Popup blocked – fall back to clipboard if possible
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(
          () => alert("Catch-up text copied. Open ChatGPT and paste."),
          () => alert("Could not open a new window or copy to clipboard.")
        );
      } else {
        alert("Could not open a new window. Please allow popups or copy manually.");
      }
      return;
    }

    // Escape text so it’s safe to drop into HTML
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Catch me up</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              margin: 16px;
              line-height: 1.4;
            }
            a.button {
              display: inline-block;
              padding: 8px 14px;
              border-radius: 999px;
              border: 1px solid #ccc;
              text-decoration: none;
              font-size: 14px;
              margin-bottom: 12px;
            }
            textarea {
              width: 100%;
              height: 70vh;
              box-sizing: border-box;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
                "Liberation Mono", "Courier New", monospace;
              font-size: 13px;
              padding: 8px;
              white-space: pre-wrap;
            }
            small {
              color: #555;
            }
          </style>
        </head>
        <body>
          <h2>Catch me up</h2>
          <p>
            1) <a class="button" href="https://chatgpt.com" target="_blank" rel="noopener noreferrer">Open ChatGPT</a><br/>
            2) Press <strong>Ctrl/Cmd + C</strong> to copy everything below.<br/>
            3) Paste into ChatGPT and send.
          </p>
          <textarea id="catchup-text">${escaped}</textarea>
          <p><small>Tip: the text is auto-selected when this tab loads.</small></p>
          <script>
            const ta = document.getElementById("catchup-text");
            if (ta) {
              ta.focus();
              ta.select();
            }
          </script>
        </body>
      </html>
    `);

    win.document.close();
  };
  
  // Simple polling; upgrade to SSE or Durable Objects later
  useEffect(() => {
  let timer: number | undefined;
  let interval = 1000; // start at 1s

  // RESET when gameId changes
  setMessages([]);
  sinceRef.current = null;

  const poll = async () => {
    try {
      const qs = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : "";
      const delta = await api(`/games/${gameId}/messages${qs}`);

      if (delta.length) {
        setMessages((prev) => {
          // Build a map of existing messages by id
          const byId = new Map<string, any>();
          for (const m of prev) {
            byId.set(m.id, m);
          }
          // Upsert each message from delta
          for (const m of delta) {
            byId.set(m.id, m);
          }
          // Return in chronological order by createdAt
          return Array.from(byId.values()).sort((a, b) =>
            a.createdAt.localeCompare(b.createdAt)
          );
        });

        // use updatedAt from the last message in the delta
        const last = delta[delta.length - 1];
        if (last.updatedAt) {
          sinceRef.current = last.updatedAt;
        } else {
          // fallback for older rows that might not have updatedAt
          sinceRef.current = last.createdAt;
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
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Chat</h2>
        {currentUserId && (
          <button
            type="button"
            onClick={handleCatchMeUp}
            className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Catch me up
          </button>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto space-y-3">
        {messages.map((m) => (
          <Message
            key={m.id}
            msg={m}
            currentUserId={currentUserId}
            isDirector={isDirector}
            onEdited={(newMsg) => {
              setMessages((arr) => arr.map((x) => (x.id === newMsg.id ? newMsg : x)));
            }}
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
