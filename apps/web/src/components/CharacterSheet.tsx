import { useState } from "react";
import { api } from "../lib/api";

export default function CharacterSheet({
  value,
  onChange
}: { value: any; onChange: (c:any)=>void }) {
  const [local, setLocal] = useState(value);

  const save = async () => {
    const res = await api(`/characters/${local.id}`, {
      method: "PATCH",
      body: JSON.stringify(local)
    });
    onChange(res);
  };

  return (
    <div className="bg-white p-4 rounded shadow space-y-3">
      <div className="flex gap-3">
        <input
          className="border rounded px-3 py-2 flex-1"
          value={local.name}
          onChange={e=>setLocal({...local, name:e.target.value})}
          placeholder="Character name"
        />
        <input className="border rounded px-3 py-2 flex-1" value={local.role ?? ""} placeholder="Role"
          onChange={e=>setLocal({...local, role:e.target.value})}/>
        <input className="border rounded px-3 py-2 flex-1" value={local.trope ?? ""} placeholder="Trope"
          onChange={e=>setLocal({...local, trope:e.target.value})}/>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <h3 className="font-semibold mb-1">Attributes</h3>
          {Object.entries(local.attributes ?? {}).map(([k,v])=>(
            <div key={k} className="flex items-center gap-2 mb-1">
              <label className="w-24">{k}</label>
              <input type="number" className="border rounded px-2 py-1 w-24"
                value={v} onChange={e=>setLocal({...local, attributes:{...local.attributes, [k]:Number(e.target.value)}})}/>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold mb-1">Skills</h3>
          {Object.entries(local.skills ?? {}).map(([k,v])=>(
            <div key={k} className="flex items-center gap-2 mb-1">
              <label className="w-24">{k}</label>
              <input type="number" className="border rounded px-2 py-1 w-24"
                value={v} onChange={e=>setLocal({...local, skills:{...local.skills, [k]:Number(e.target.value)}})}/>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={save}>Save</button>
      </div>
    </div>
  );
}
