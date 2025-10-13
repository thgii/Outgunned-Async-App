import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import Message from "./Message";
import MessageEditor from "./MessageEditor";

type Props = { gameId: string };

export default function ChatBox({ gameId }: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const sinceRef = useRef<string | null>(null);

  // Simple polling; upgrade to SSE or Durable Objects later
  useEffect(() => {
  let timer: number | undefined;
  let interval = 8000; // start at 8s

  const poll = async () => {
    try {
      const qs = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : "";
      const delta = await api(`/games/${gameId}/messages${qs}`);
      if (delta.length) {
        setMessages((m) => [...m, ...delta]);
        sinceRef.current = delta[delta.length - 1].createdAt;
        interval = 8000; // reset on activity
      } else {
        interval = Math.min(interval + 2000, 30000); // gentle backoff to 30s
      }
    } finally {
      if (!document.hidden) timer = window.setTimeout(poll, interval);
    }
  };

  const onVis = () => {
    if (!document.hidden && !timer) poll();
    if (document.hidden && timer) { clearTimeout(timer); timer = undefined; }
  };

  document.addEventListener("visibilitychange", onVis);
  poll();
  return () => { if (timer) clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
}, [gameId]);


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
      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.map(m => <Message key={m.id} msg={m} onEdited={(newMsg)=> {
          setMessages((arr)=>arr.map(x=>x.id===newMsg.id?newMsg:x));
        }}/>)}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={content}
          onChange={e=>setContent(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter") send(); }}
          className="flex-1 border rounded px-3 py-2"
          placeholder="Type a message…"
        />
        <button onClick={send} className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
      </div>
    </div>
  );
}
