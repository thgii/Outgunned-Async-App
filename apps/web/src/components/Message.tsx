import { useState } from "react";
import MessageEditor from "./MessageEditor";
import { api } from "../lib/api";

export default function Message({ msg, onEdited }: { msg: any; onEdited: (m:any)=>void }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="p-2 border rounded text-black">
      {!editing ? (
        <>
          <div className="text-sm text-slate-500">{new Date(msg.createdAt).toLocaleString()}</div>
          <div className="whitespace-pre-wrap">{msg.content}</div>
          <div className="text-right">
            <button className="text-xs text-blue-600 underline" onClick={()=>setEditing(true)}>Edit</button>
          </div>
        </>
      ) : (
        <MessageEditor
          defaultValue={msg.content}
          onCancel={()=>setEditing(false)}
          onSave={async (content)=>{
            const updated = await api(`/messages/${msg.id}`, { method:"PATCH", body: JSON.stringify({ content })});
            onEdited(updated);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
