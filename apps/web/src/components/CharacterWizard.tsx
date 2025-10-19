import { useMemo, useState } from "react";
import type { CharacterDTO, SkillKey, AttrKey } from "@action-thread/types";
import { api } from "../lib/api";
import { DATA, findRole, findTrope, buildDerivedDTO, featsAllowanceByAge, roleOptionLists, isSpecialRole } from "../data/wizard";
import { useEffect } from "react";

type Step =
  | "identity"
  | "roleTrope"
  | "tropeAttr"
  | "age"
  | "feats"
  | "skillBumps"
  | "jobEtc"
  | "gear"
  | "review";

type Props = { initial?: Partial<CharacterDTO>; onComplete?: (created: CharacterDTO) => void };

export default function CharacterWizard({ initial, onComplete }: Props) {
  const [step, setStep] = useState<Step>("identity");

  // Form state
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [trope, setTrope] = useState(initial?.trope ?? "");
  const [tropeAttribute, setTropeAttribute] = useState<AttrKey | undefined>(undefined);

  const [age, setAge] = useState<"Young"|"Adult"|"Old">((initial?.age as any) ?? "Adult");

  const [selectedFeats, setSelectedFeats] = useState<string[]>([]);
  const [skillBumps, setSkillBumps] = useState<SkillKey[]>([]);

  const [jobOrBackground, setJob] = useState(initial?.jobOrBackground ?? "");
  const [flaw, setFlaw] = useState(initial?.flaw ?? "");
  const [catchphrase, setCatchphrase] = useState(initial?.catchphrase ?? "");

  const [gearChosen, setGearChosen] = useState<string[]>([]);

  // Data derived from selections
  const roleDef = useMemo(() => role ? findRole(role) : null, [role]);
  const tropeDef = useMemo(() => trope ? findTrope(trope) : null, [trope]);
  useEffect(() => {
  const needs = !!(tropeDef?.attribute_options?.length && !tropeDef?.attribute);
  if (!needs) setTropeAttribute(undefined);
}, [tropeDef]);
  const specialRole = isSpecialRole(role);

  // When Role is Special, force Trope = Role and keep them in sync
  useEffect(() => {
    if (specialRole && role) {
      setTrope(role);
    }
  }, [specialRole, role]);

  const tropeNeedsAttr = !!(tropeDef?.attribute_options?.length && !tropeDef?.attribute);
  const featAllowance = featsAllowanceByAge(age);

  const { jobs, flaws, catchphrases, gear } = roleOptionLists(role);

  const canContinue = useMemo(() => {
    switch (step) {
      case "identity":
        return name.trim().length > 0;
      case "roleTrope":
        return !!role && !!trope;
      case "tropeAttr":
        return !tropeNeedsAttr || !!tropeAttribute;
      case "age":
        return age === "Young" || age === "Adult" || age === "Old";
      case "feats": {
        const count = selectedFeats.filter(f => f !== "Too Young to Die").length;
        const needed = featAllowance.picks;
        // ensure TYtD auto is present for display when Young
        return count >= needed;
      }
      case "skillBumps":
        return new Set(skillBumps).size === (specialRole ? 6 : 2);
      case "jobEtc":
        return true; // free-form ok
      case "gear":
        return true;
      case "review":
        return true;
    }
 }, [step, name, role, trope, tropeNeedsAttr, tropeAttribute, age, selectedFeats, featAllowance.picks, skillBumps, specialRole]);

  function next() {
    if (!canContinue) return;
    if (step === "identity") setStep("roleTrope");
    else if (step === "roleTrope") setStep(tropeNeedsAttr ? "tropeAttr" : "age");
    else if (step === "tropeAttr") setStep("age");
    else if (step === "age") setStep("feats");
    else if (step === "feats") setStep("skillBumps");
    else if (step === "skillBumps") setStep("jobEtc");
    else if (step === "jobEtc") setStep("gear");
    else if (step === "gear") setStep("review");
  }
  function back() {
    if (step === "roleTrope") setStep("identity");
    else if (step === "tropeAttr") setStep("roleTrope");
    else if (step === "age") setStep(tropeNeedsAttr ? "tropeAttr" : "roleTrope");
    else if (step === "feats") setStep("age");
    else if (step === "skillBumps") setStep("feats");
    else if (step === "jobEtc") setStep("skillBumps");
    else if (step === "gear") setStep("jobEtc");
    else if (step === "review") setStep("gear");
  }

  // Feats pool shown to the user
  const featsPool = useMemo(() => {
    const pool = new Set<string>();
    if (roleDef?.feats) roleDef.feats.forEach(f => pool.add(f));
    if (tropeDef?.feats) tropeDef.feats.forEach(f => pool.add(f));
    // Trope feat_options (if any)
    if (tropeDef?.feat_options) tropeDef.feat_options.forEach(f => pool.add(f));
    // Age auto-feat (Young)
    featAllowance.auto.forEach(f => pool.add(f));
    return Array.from(pool);
  }, [roleDef, tropeDef, featAllowance.auto]);

  function toggleFeat(f: string) {
    // prevent toggling away auto TYtD
    if (age === "Young" && f === "Too Young to Die") return;
    setSelectedFeats(prev => {
      const have = new Set(prev);
      if (have.has(f)) have.delete(f);
      else have.add(f);
      // clamp to N picks (+ TYtD shown but not counted in picks)
      const picksOnly = Array.from(have).filter(x => x !== "Too Young to Die");
      if (picksOnly.length > featAllowance.picks) picksOnly.splice(featAllowance.picks);
      return age === "Young" ? ["Too Young to Die", ...picksOnly] : picksOnly;
    });
  }

  function toggleGear(g: string) {
    setGearChosen(prev => prev.includes(g) ? prev.filter(x=>x!==g) : [...prev, g]);
  }

// Can we legally build yet?
const canBuild = useMemo(() => {
  if (!name.trim()) return false;
  if (!role) return false;
  if (!trope) return false;
  if (tropeNeedsAttr && !tropeAttribute) return false;
  return true;
}, [name, role, trope, tropeNeedsAttr, tropeAttribute]);

// Only build when it's safe (and preferably only when needed)
const reviewDTO = useMemo(() => {
  if (!canBuild) return null;
  try {
    return buildDerivedDTO({
      name: name.trim(),
      role,
      trope,
      age,
      tropeAttribute,
      selectedFeats,
      skillBumps,
      jobOrBackground: jobOrBackground.trim(),
      flaw: flaw.trim(),
      catchphrase: catchphrase.trim(),
      gearChosen,
    });
  } catch {
    return null; // never throw during render
  }
  // You can also narrow this to step === "review" if you want:
  // }, [step, canBuild, name, role, trope, age, tropeAttribute, selectedFeats, skillBumps, jobOrBackground, flaw, catchphrase, gearChosen]);
}, [canBuild, name, role, trope, age, tropeAttribute, selectedFeats, skillBumps, jobOrBackground, flaw, catchphrase, gearChosen]);


  async function save() {
  try {
    const dto = buildDerivedDTO({
      name: name.trim(),
      role,
      trope,
      age,
      tropeAttribute,
      selectedFeats,
      skillBumps,
      jobOrBackground: jobOrBackground.trim(),
      flaw: flaw.trim(),
      catchphrase: catchphrase.trim(),
      gearChosen,
    });
    const created = await api("/characters", { method: "POST", json: dto });
    onComplete?.(created);
  } catch (err: any) {
    alert(err?.message || "Failed to save character.");
  }
}


  // Basic UI: (Tailwind present; keep it minimal and readable)
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Create Character</h1>

      {step === "identity" && (
        <Card title="Identity">
          <Text label="Name *" value={name} onChange={setName} />
        </Card>
      )}

      {step === "roleTrope" && (
        <Card title="Role & Trope">
          <Select label="Role *" value={role} onChange={setRole} options={["", ...DATA.roles.map(r=>r.name)]} />
          <Select
  label="Trope *"
  value={trope}
  onChange={setTrope}
  options={["", ...DATA.tropes.map(t=>t.name)]}
  disabled={specialRole}
/>
{specialRole && (
  <div className="text-xs text-muted-foreground mt-1">
    Special Role: Trope is fixed to match Role.
  </div>
)}

{roleDef && (
  <p className="text-sm mt-1 italic text-muted-foreground">
    {"Role: " + (roleDef.description || "No description available for this role.")}
  </p>
)}
{tropeDef && (
  <p className="text-sm mt-1 italic text-muted-foreground">
    {"Trope: " + (tropeDef.description || "No description available for this trope.")}
  </p>
)}
{/* Role & Trope skill grants */}
{(roleDef?.skills?.length || tropeDef?.skills?.length) ? (
  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Role skills */}
    <div className="rounded-xl border p-3">
      <div className="text-xs font-semibold uppercase text-gray-600 mb-2">
        Role Skills
      </div>
      {roleDef?.skills?.length ? (
        <ul className="list-disc ml-5 text-sm leading-6" style={{ columns: 2 }}>
          {roleDef.skills.map((s) => (
            <li key={`role-skill-${s}`}>{s}</li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-gray-500">No skills listed for this role.</div>
      )}
    </div>

    {/* Trope skills */}
    <div className="rounded-xl border p-3">
      <div className="text-xs font-semibold uppercase text-gray-600 mb-2">
        Trope Skills
      </div>
      {tropeDef?.skills?.length ? (
        <ul className="list-disc ml-5 text-sm leading-6" style={{ columns: 2 }}>
          {tropeDef.skills.map((s) => (
            <li key={`trope-skill-${s}`}>{s}</li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-gray-500">No skills listed for this trope.</div>
      )}
    </div>
  </div>
) : null}

        </Card>
      )}

      {step === "tropeAttr" && tropeNeedsAttr && (
        <Card title="Trope Attribute">
          <p className="text-sm text-muted-foreground">This trope requires you to choose an Attribute.</p>
          <Select
            label="Trope Attribute"
            value={tropeAttribute ?? ""}
            onChange={(v)=>setTropeAttribute((v||undefined) as AttrKey)}
            options={["","brawn","nerves","smooth","focus","crime"]}
          />
        </Card>
      )}

      {step === "age" && (
        <Card title="Age">
          <Select label="Age" value={age} onChange={v=>setAge(v as any)} options={["Young","Adult","Old"]} />
          <p className="text-xs text-muted-foreground mt-2">
            Young: 1 feat + “Too Young to Die”. Adult: 2 feats. Old: 3 feats and start with 2 lethal bullets.
          </p>
        </Card>
      )}

      {step === "feats" && (
        <Card title="Feats">
          <p className="text-sm">Pick {featAllowance.picks} feat(s){age==="Young" && " (Too Young to Die is added automatically)"}.</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {featsPool.map(f => (
              <label key={f} className={`border rounded px-3 py-2 cursor-pointer ${selectedFeats.includes(f) ? "bg-zinc-100" : ""}`}>
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={selectedFeats.includes(f) || (age==="Young" && f==="Too Young to Die")}
                  onChange={()=>toggleFeat(f)}
                  disabled={age==="Young" && f==="Too Young to Die"}
                />
                {f}
              </label>
            ))}
          </div>
        </Card>
      )}

      {step === "skillBumps" && (
        <Card title="Extra Skill Points">
          <p className="text-sm">
  Choose <b>{specialRole ? 6 : 2} different skills</b> to gain +1 each.
</p>
<p className="text-sm">Choose <b>two different skills</b> to gain +1 each.</p>
          <SkillPicker value={skillBumps} onChange={setSkillBumps} />
        </Card>
      )}

      {step === "jobEtc" && (
        <Card title="Background, Flaw & Catchphrase">
{specialRole && (
  <p className="text-xs text-muted-foreground mb-2">
    Special Role: if left blank, Job / Background will default to <b>{role}</b>.
  </p>
)}
          <Datalist
            label="Job / Background (or type your own)"
            value={jobOrBackground}
            onChange={setJob}
            options={jobs}
          />
          <Datalist
            label="Flaw (or type your own)"
            value={flaw}
            onChange={setFlaw}
            options={flaws}
          />
          <Datalist
            label="Catchphrase (or type your own)"
            value={catchphrase}
            onChange={setCatchphrase}
            options={catchphrases}
          />
        </Card>
      )}

      {step === "gear" && (
        <Card title="Gear">
          {gear.length ? (
            <>
              <p className="text-sm">Choose any that fit your concept; you can add custom items below.</p>
              <div className="grid grid-cols-2 gap-2 my-2">
                {gear.map(g => (
                  <label key={g} className={`border rounded px-3 py-2 cursor-pointer ${gearChosen.includes(g) ? "bg-zinc-100" : ""}`}>
                    <input type="checkbox" className="mr-2" checked={gearChosen.includes(g)} onChange={()=>toggleGear(g)} />
                    {g}
                  </label>
                ))}
              </div>
            </>
          ) : <p className="text-sm text-muted-foreground">No predefined gear for this Role.</p>}
          <AddLine label="Add custom gear" onAdd={(txt)=> txt && setGearChosen(prev=>[...prev, txt])} />
          {!!gearChosen.length && (
            <ul className="list-disc ml-6 mt-2 text-sm">{gearChosen.map((g,i)=><li key={i}>{g}</li>)}</ul>
          )}
        </Card>
      )}

{step === "review" && (
  <Card title="Review & Save">
    {reviewDTO ? (
      <Preview dto={reviewDTO} />
    ) : (
      <p className="text-sm text-red-600">
        Something’s missing. Go back and complete all required selections.
      </p>
    )}
  </Card>
)}


      {/* Nav */}
      <div className="flex gap-2 pt-2">
        {step!=="identity" && <button className="border rounded px-3 py-2" onClick={back}>Back</button>}
        {step!=="review" && <button className="rounded px-3 py-2 bg-black text-white disabled:opacity-40" onClick={next} disabled={!canContinue}>Next</button>}
        {step==="review" && <button className="rounded px-3 py-2 bg-emerald-600 text-white" onClick={save}>Save Character</button>}
      </div>
    </div>
  );
}

/* ----- Small UI helpers (kept inline for simplicity) ----- */

function Card({title, children}:{title:string; children:any}) {
  return <section className="rounded-xl border p-4">
    <h3 className="font-semibold mb-2">{title}</h3>
    {children}
  </section>;
}

function Text({label, value, onChange}:{label:string; value:string; onChange:(v:string)=>void}) {
  return <label className="grid gap-1 mb-2">
    <span className="text-sm">{label}</span>
    <input value={value} onChange={e=>onChange(e.target.value)} className="border rounded px-2 py-1" />
  </label>;
}

function Select({label, value, onChange, options}:{label:string; value:string; onChange:(v:string)=>void; options:string[]}) {
  return <label className="grid gap-1 mb-2">
    <span className="text-sm">{label}</span>
    <select value={value} onChange={e=>onChange(e.target.value)} className="border rounded px-2 py-1">
      {options.map(o => <option key={o} value={o}>{o || "—"}</option>)}
    </select>
  </label>;
}

function Datalist({label, value, onChange, options}:{label:string; value:string; onChange:(v:string)=>void; options:string[]}) {
  const listId = label.replace(/\s+/g,"-") + "-list";
  return <label className="grid gap-1 mb-2">
    <span className="text-sm">{label}</span>
    <input list={listId} value={value} onChange={e=>onChange(e.target.value)} className="border rounded px-2 py-1" />
    <datalist id={listId}>
      {options.map(o => <option key={o} value={o} />)}
    </datalist>
  </label>;
}

function AddLine({label, onAdd}:{label:string; onAdd:(txt:string)=>void}){
  const [txt, setTxt] = useState("");
  return <div className="flex gap-2">
    <input placeholder={label} value={txt} onChange={e=>setTxt(e.target.value)} className="border rounded px-2 py-1 flex-1" />
    <button className="border rounded px-3 py-1" onClick={()=>{ onAdd(txt.trim()); setTxt(""); }}>Add</button>
  </div>;
}

const ALL_SKILLS: SkillKey[] = [
  "Endure","Fight","Force","Stunt",
  "Cool","Drive","Shoot","Survival",
  "Flirt","Leadership","Speech","Style",
  "Detect","Fix","Heal","Know",
  "Awareness","Dexterity","Stealth","Streetwise"
];

function SkillPicker({value, onChange}:{value: SkillKey[]; onChange:(s:SkillKey[])=>void}) {
  const chosen = new Set(value);
  function toggle(k: SkillKey) {
    const arr = [...chosen];
    const idx = arr.indexOf(k);
    if (idx>=0) arr.splice(idx,1);
    else arr.push(k);
    // enforce unique and max 2
    onChange(Array.from(new Set(arr)).slice(0,2) as SkillKey[]);
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {ALL_SKILLS.map(k => (
        <label key={k} className={`border rounded px-3 py-2 cursor-pointer ${chosen.has(k) ? "bg-zinc-100" : ""}`}>
          <input type="checkbox" className="mr-2" checked={chosen.has(k)} onChange={()=>toggle(k)} />
          {k}
        </label>
      ))}
    </div>
  );
}

function Preview({dto}:{dto: CharacterDTO}) {
  return (
    <div className="text-sm grid gap-2">
      <div><b>{dto.name}</b> — {dto.role}{dto.trope?` / ${dto.trope}`:""} — {dto.age}</div>
      <div>Job: {dto.jobOrBackground || "—"}</div>
      <div>Catchphrase: {dto.catchphrase || "—"}</div>
      <div>Flaw: {dto.flaw || "—"}</div>
      <div>Feats: {dto.feats.join(", ") || "—"}</div>
      <div>Adrenaline: {dto.adrenaline} | Luck: {dto.luck} | Spotlight: {dto.spotlight} | Cash: {dto.cash}</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <b>Attributes</b>
          <ul className="list-disc ml-5">
            {Object.entries(dto.attributes).map(([k,v]) => <li key={k}>{k}: {v as any}</li>)}
          </ul>
        </div>
        <div>
          <b>Skills</b>
          <ul className="list-disc ml-5" style={{columns:2}}>
            {Object.entries(dto.skills).map(([k,v]) => <li key={k}>{k}: {v as any}</li>)}
          </ul>
        </div>
      </div>
      {!!dto.storage.gunsAndGear.length && (
        <div><b>Gear</b>: {dto.storage.gunsAndGear.map(g=>g.name).join(", ")}</div>
      )}
    </div>
  );
}
