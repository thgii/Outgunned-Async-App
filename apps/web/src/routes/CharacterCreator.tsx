import { useState } from "react";
import data from "../data/outgunned_data.json";
import { api } from "../lib/api";

type Character = {
  name: string;
  role: any;
  trope: any;
  age: "Young" | "Adult" | "Old";
  job: string;
  catchphrase: string;
  flaw: string;
  feats: string[];
  gear: string[];
};

export default function CharacterCreator() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [ch, setCh] = useState<Character>({
    name: "",
    role: null,
    trope: null,
    age: "Adult",
    job: "",
    catchphrase: "",
    flaw: "",
    feats: [],
    gear: [],
  });

  const steps = ["Role", "Trope", "Personal", "Feats", "Gear", "Review"];
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      await api("/characters", { method: "POST", json: ch });
      setMsg("✅ Character created!");
    } catch (e) {
      console.error(e);
      setMsg("❌ Error saving character.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-3 text-center">Create Your Character</h1>

      <div className="flex justify-between text-sm mb-6">
        {steps.map((label, i) => (
          <div key={label} className={i === step ? "font-bold text-blue-600" : "opacity-60"}>{label}</div>
        ))}
      </div>

      {step === 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Choose Role</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {data.roles.map((r: any) => (
              <div
                key={r.name}
                onClick={() => setCh({ ...ch, role: r })}
                className={`p-3 border rounded cursor-pointer ${ch.role?.name === r.name ? "border-blue-600 bg-blue-50" : ""}`}
              >
                <div className="font-semibold">{r.name}</div>
                {r.attribute && <div className="text-sm">Attribute: {r.attribute}</div>}
                {!!r.skills?.length && <div className="text-xs mt-1">Skills: {r.skills.join(", ")}</div>}
                {!!r.feats?.length && <div className="text-xs mt-1">Role Feats: {r.feats.join(", ")}</div>}
                {!!r.gear?.length && <div className="text-xs mt-1">Starting Gear: {r.gear.join(", ")}</div>}
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button disabled className="px-4 py-2 rounded border">Back</button>
            <button disabled={!ch.role} onClick={next} className="px-4 py-2 rounded bg-blue-600 text-white">Next</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Choose Trope</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {data.tropes.map((t: any) => (
              <div
                key={t.name}
                onClick={() => setCh({ ...ch, trope: t })}
                className={`p-3 border rounded cursor-pointer ${ch.trope?.name === t.name ? "border-blue-600 bg-blue-50" : ""}`}
              >
                <div className="font-semibold">{t.name}</div>
                {t.attribute && <div className="text-sm">Attribute: {t.attribute}</div>}
                {!!t.skills?.length && <div className="text-xs mt-1">Skills: {t.skills.join(", ")}</div>}
                {!!t.feats?.length && <div className="text-xs mt-1">Trope Feats: {t.feats.join(", ")}</div>}
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between">
            <button onClick={back} className="px-4 py-2 rounded border">Back</button>
            <button disabled={!ch.trope} onClick={next} className="px-4 py-2 rounded bg-blue-600 text-white">Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold mb-3">Personal Details</h2>
          <input className="w-full border p-2 rounded" placeholder="Name" value={ch.name} onChange={(e) => setCh({ ...ch, name: e.target.value })} />
          <div className="grid md:grid-cols-3 gap-3">
            <select className="border p-2 rounded" value={ch.age} onChange={(e) => setCh({ ...ch, age: e.target.value as any })}>
              {data.ages.map((a: any) => <option key={a.age} value={a.age}>{a.age}</option>)}
            </select>
            <input className="border p-2 rounded" placeholder="Job / Background" value={ch.job} onChange={(e) => setCh({ ...ch, job: e.target.value })} />
            <input className="border p-2 rounded" placeholder="Catchphrase" value={ch.catchphrase} onChange={(e) => setCh({ ...ch, catchphrase: e.target.value })} />
          </div>
          <input className="w-full border p-2 rounded" placeholder="Flaw" value={ch.flaw} onChange={(e) => setCh({ ...ch, flaw: e.target.value })} />

          <div className="mt-4 flex justify-between">
            <button onClick={back} className="px-4 py-2 rounded border">Back</button>
            <button disabled={!ch.name} onClick={next} className="px-4 py-2 rounded bg-blue-600 text-white">Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Choose Feats (pick 3 total)</h2>
          <div className="grid md:grid-cols-2 gap-2 max-h-[50vh] overflow-auto">
            {data.feats.map((f: any) => {
              const selected = ch.feats.includes(f.name);
              return (
                <label key={f.name} className={`p-2 border rounded flex gap-2 items-start ${selected ? "border-blue-600 bg-blue-50" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const nextFeats = selected
                        ? ch.feats.filter((x) => x !== f.name)
                        : ch.feats.length < 3 ? [...ch.feats, f.name] : ch.feats;
                      setCh({ ...ch, feats: nextFeats });
                    }}
                  />
                  <div>
                    <div className="font-semibold">{f.name}{f.requires_meter ? " ⚡" : ""}</div>
                    {f.description && <div className="text-xs opacity-80">{f.description}</div>}
                  </div>
                </label>
              );
            })}
          </div>

          <div className="mt-4 flex justify-between">
            <button onClick={back} className="px-4 py-2 rounded border">Back</button>
            <button disabled={ch.feats.length !== 3} onClick={next} className="px-4 py-2 rounded bg-blue-600 text-white">Next</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Choose Starting Gear</h2>
          <div className="grid md:grid-cols-2 gap-2 max-h-[50vh] overflow-auto">
            {data.gear.map((g: any) => {
              const selected = ch.gear.includes(g.name);
              return (
                <label key={g.name} className={`p-2 border rounded flex gap-2 items-start ${selected ? "border-blue-600 bg-blue-50" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const nextGear = selected
                        ? ch.gear.filter((x) => x !== g.name)
                        : [...ch.gear, g.name];
                      setCh({ ...ch, gear: nextGear });
                    }}
                  />
                  <div>
                    <div className="font-semibold">{g.name}</div>
                    {g.description && <div className="text-xs opacity-80">{g.description}</div>}
                  </div>
                </label>
              );
            })}
          </div>

          <div className="mt-4 flex justify-between">
            <button onClick={back} className="px-4 py-2 rounded border">Back</button>
            <button onClick={next} className="px-4 py-2 rounded bg-blue-600 text-white">Next</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Review & Save</h2>
          <pre className="text-left bg-gray-50 p-3 rounded border max-h-[50vh] overflow-auto">
{JSON.stringify(ch, null, 2)}
          </pre>
          <div className="mt-3 flex justify-between items-center">
            <button onClick={back} className="px-4 py-2 rounded border">Back</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded bg-green-600 text-white">
              {saving ? "Saving..." : "Save Character"}
            </button>
          </div>
          {msg && <div className="mt-3 text-center">{msg}</div>}
        </div>
      )}
    </div>
  );
}
