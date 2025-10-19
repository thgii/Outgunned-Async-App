import { useMemo, useState, useEffect } from "react";
import type { CharacterDTO, SkillKey, AttrKey } from "@action-thread/types";
import { api } from "../lib/api";
import { DATA, findRole, findTrope, buildDerivedDTO, featsAllowanceByAge, roleOptionLists } from "../data/wizard";

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
  const isSpecialTrope = useMemo(() => (trope?.startsWith("Special:") ?? false), [trope]);

  useEffect(() => {
    const needs = !!(tropeDef?.attribute_options?.length && !tropeDef?.attribute);
    if (!needs) setTropeAttribute(undefined);
  }, [tropeDef]);

  // If a Special Role is chosen as the Trope, mirror it as Role and Job/Background automatically
  useEffect(() => {
    if (isSpecialTrope) {
      if (role !== trope) setRole(trope);
      if (!jobOrBackground?.trim()) setJob(trope);
    }
  }, [isSpecialTrope, trope]); // eslint-disable-line react-hooks/exhaustive-deps

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
        return count >= needed;
      }
      case "skillBumps":
        return new Set(skillBumps).size === (isSpecialTrope ? 6 : 2);
      case "jobEtc":
        return true;
      case "gear":
        return true;
      case "review":
        return true;
    }
  }, [step, name, role, trope, tropeNeedsAttr, tropeAttribute, age, selectedFeats, featAllowance.picks, skillBumps, isSpecialTrope]);

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
    if (tropeDef?.feat_options) tropeDef.feat_options.forEach(f => pool.add(f));
    featAllowance.auto.forEach(f => pool.add(f));
    return Array.from(pool);
  }, [roleDef, tropeDef, featAllowance.auto]);

  const canBuild = useMemo(() => {
    if (!name?.trim()) return false;
    if (!role) return false;
    if (!trope) return false;
    if (tropeNeedsAttr && !tropeAttribute) return false;
    return true;
  }, [name, role, trope, tropeNeedsAttr, tropeAttribute]);

  // Only build when it's safe
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
      return null;
    }
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
          <Select label="Trope *" value={trope} onChange={setTrope} options={["", ...DATA.tropes.map(t=>t.name)]} />
          {roleDef && (
            <p className="text-sm mt-1 italic text-muted-foreground">
              {"Role: " + (roleDef.description || "No description available for this role.")}
            </p>
          )}
          {tropeDef && (
            <>
              <p className="text-sm mt-1 italic text-muted-foreground">
                {"Trope: " + (tropeDef.description || "No description available for this trope.")}
              </p>
              {isSpecialTrope && (
                <div className="mt-2 p-3 rounded border border-amber-300 bg-amber-50 text-amber-800 text-sm">
                  This <b>Special Role</b> counts as your <b>Role</b>, <b>Trope</b>, and <b>Job/Background</b>. It also gives you <b>6 free Skill Points</b> instead of 2.
                </div>
              )}
            </>
          )}

          {(roleDef?.skills?.length || tropeDef?.skills?.length) ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold">Role Skills (+1 each)</h3>
                {roleDef?.skills?.length ? (
                  <ul className="list-disc ml-6 text-sm">
                    {roleDef.skills.map((s) => (
                      <li key={`role-skill-${s}`}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">No skills listed for this role.</div>
                )}
              </div>
              <div>
                <h3 className="font-semibold">Trope Skills (+1 each)</h3>
                {tropeDef?.skills?.length ? (
                  <ul className="list-disc ml-6 text-sm">
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
            Young: 1 pick (+ auto <i>Too Young to Die</i>) • Adult: 2 picks • Old: 3 picks (start with 2 Lethal)
          </p>
        </Card>
      )}

      {step === "feats" && (
        <Card title="Feats">
          <p className="text-sm text-muted-foreground mb-2">Pick {featAllowance.picks} Feat(s).</p>
          <FeatChooser
            pool={featsPool}
            value={selectedFeats}
            onChange={setSelectedFeats}
            auto={featAllowance.auto}
          />
        </Card>
      )}

      {step === "skillBumps" && (
        <>
          <p className="text-sm text-muted-foreground mb-2">Choose {isSpecialTrope ? 6 : 2} skills to gain +1.</p>
          <Card title="Extra Skill Points">
            <SkillPicker value={skillBumps} onChange={setSkillBumps} max={isSpecialTrope ? 6 : 2} />
          </Card>
        </>
      )}

      {step === "jobEtc" && (
        <Card title="Job / Background & Flavor">
          <Select
            label="Job / Background"
            value={jobOrBackground}
            onChange={setJob}
            options={["", ...(jobs ?? [])]}
          />
          <Select
            label="Flaw"
            value={flaw}
            onChange={setFlaw}
            options={flaws}
          />
          <Select
            label="Catchphrase"
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

      {step === "review" && reviewDTO && (
        <Card title="Review">
          <Preview dto={reviewDTO} />
        </Card>
      )}

      <div className="flex justify-between pt-2">
        <button className="px-3 py-2 rounded border" onClick={back} disabled={step==="identity"}>Back</button>
        <div className="space-x-2">
          {step !== "review" && (
            <button className="px-3 py-2 rounded bg-black text-white disabled:opacity-50" onClick={next} disabled={!canContinue}>
              Next
            </button>
          )}
          {step === "review" && (
            <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={save}>Create</button>
          )}
        </div>
      </div>
    </div>
  );

  function toggleGear(g: string) {
    setGearChosen(prev => prev.includes(g) ? prev.filter(x=>x!==g) : [...prev, g]);
  }
}

/* ===== UI bits (unchanged except SkillPicker gets a "max") ===== */

function Card({ title, children }: { title: string; children: any }) {
  return (
    <div className="border rounded-lg p-4">
      <h2 className="font-semibold mb-2">{title}</h2>
      {children}
    </div>
  );
}

function Text({label, value, onChange}:{label:string; value:string; onChange:(v:string)=>void}) {
  return (
    <label className="block">
      <div className="text-sm mb-1">{label}</div>
      <input className="w-full border rounded px-3 py-2" value={value} onChange={e=>onChange(e.target.value)} />
    </label>
  );
}

function Select({label, value, onChange, options}:{label:string; value:string; onChange:(v:string)=>void; options:string[]}) {
  return (
    <label className="block">
      <div className="text-sm mb-1">{label}</div>
      <select className="w-full border rounded px-3 py-2" value={value} onChange={e=>onChange(e.target.value)}>
        {options.map((o, i) => <option key={`${o}-${i}`} value={o}>{o || "—"}</option>)}
      </select>
    </label>
  );
}

function AddLine({label, onAdd}:{label:string; onAdd:(txt:string)=>void}) {
  const [txt, setTxt] = useState("");
  return (
    <div className="flex gap-2 items-center">
      <input className="flex-1 border rounded px-3 py-2" placeholder={label} value={txt} onChange={e=>setTxt(e.target.value)} />
      <button className="px-3 py-2 border rounded" onClick={()=>{ onAdd(txt); setTxt(""); }}>Add</button>
    </div>
  );
}

function FeatChooser({ pool, value, onChange, auto }:{ pool:string[]; value:string[]; onChange:(v:string[])=>void; auto:string[] }) {
  const chosen = new Set(value);
  function toggle(n: string) {
    const next = new Set(chosen);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    onChange(Array.from(next));
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {pool.map((n) => (
        <label key={n} className={`border rounded px-3 py-2 cursor-pointer ${chosen.has(n) ? "bg-zinc-100" : ""}`}>
          <input type="checkbox" className="mr-2" checked={chosen.has(n)} onChange={()=>toggle(n)} />
          {n}{auto.includes(n) ? " (auto)" : ""}
        </label>
      ))}
    </div>
  );
}

function SkillPicker({value, onChange, max}:{value: SkillKey[]; onChange:(s:SkillKey[])=>void; max:number}) {
  const chosen = new Set(value);
  function toggle(k: SkillKey) {
    const arr = [...chosen];
    const idx = arr.indexOf(k);
    if (idx>=0) arr.splice(idx,1);
    else arr.push(k);
    // enforce unique and max
    onChange(Array.from(new Set(arr)).slice(0,max) as SkillKey[]);
  }
  const ALL_SKILLS: SkillKey[] = [
    "endure","fight","force","stunt",
    "cool","drive","shoot","survival",
    "flirt","leadership","speech","style",
    "detect","fix","heal","know",
    "awareness","dexterity","stealth","streetwise",
  ];
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
      <div className="grid grid-cols-2 gap-3">
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
