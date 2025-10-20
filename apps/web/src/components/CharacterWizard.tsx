import { useMemo, useState } from "react";
import type { CharacterDTO, SkillKey, AttrKey } from "@action-thread/types";
import { api } from "../lib/api";
import { DATA, findRole, findTrope, buildDerivedDTO, featsAllowanceByAge, featRules, roleOptionLists, isSpecialRole, FEAT_DESC, isNpcSpecialRole } from "../data/wizard";
import { useEffect } from "react";

const [npcSpecialAttrs, setNpcSpecialAttrs] = useState<AttrKey[]>([]);
const npcSpecial = isNpcSpecialRole(role);

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
useEffect(() => {
  if (age === "Young") {
    setSelectedFeats((prev) => prev.includes("Too Young to Die") ? prev : ["Too Young to Die", ...prev]);
  } else {
    // remove TYtD when not Young
    setSelectedFeats((prev) => prev.filter((f) => f !== "Too Young to Die"));
  }
}, [age]);

  const [skillBumps, setSkillBumps] = useState<SkillKey[]>([]);

  const [jobOrBackground, setJob] = useState(initial?.jobOrBackground ?? "");
  const [flaw, setFlaw] = useState(initial?.flaw ?? "");
  const [catchphrase, setCatchphrase] = useState(initial?.catchphrase ?? "");

  const [gearChosen, setGearChosen] = useState<string[]>([]);

  // Data derived from selections
  const roleDef = useMemo(() => role ? findRole(role) : null, [role]);
  const tropeDef = useMemo(() => trope ? findTrope(trope) : null, [trope]);
useEffect(() => {
  const options = tropeDef?.attribute_options as AttrKey[] | undefined;
  const hasFixed = !!tropeDef?.attribute;
  const needs = !!(options?.length && !hasFixed);

  // If not needed (fixed or none), clear the user-picked attribute.
  if (!needs) {
    setTropeAttribute(undefined);
    return;
  }

  // If needed and current selection is not valid for the new trope, clear it.
  if (needs && tropeAttribute && !options?.includes(tropeAttribute)) {
    setTropeAttribute(undefined);
  }
}, [tropeDef, tropeAttribute]);

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

// Feat description getter (uses catalog built from the JSON)
function describeFeat(name: string): string {
  return FEAT_DESC[name] || "";
}


// Feats pools (separated by source)
const roleFeats = useMemo(() => Array.from(new Set(roleDef?.feats || [])), [roleDef]);
const tropeFeats = useMemo(() => {
  const t = new Set<string>();
  if (tropeDef?.feats) tropeDef.feats.forEach((f: string) => t.add(f));
  if (tropeDef?.feat_options) tropeDef.feat_options.forEach((f: string) => t.add(f));
  // Avoid duplicate display if a feat is already in the role list
  roleFeats.forEach(f => t.delete(f));
  return Array.from(t);
}, [tropeDef, roleFeats]);

const featRule = useMemo(
  () => featRules(age, specialRole, roleFeats.length, tropeFeats.length),
  [age, specialRole, roleFeats.length, tropeFeats.length]
);

// Flat union (for DTO), include auto feats for display when Young
const featsPool = useMemo(() => {
  const pool = new Set<string>();
  roleFeats.forEach(f => pool.add(f));
  tropeFeats.forEach(f => pool.add(f));
  featRule.auto.forEach(f => pool.add(f));
  return Array.from(pool);
}, [roleFeats, tropeFeats, featRule.auto]);

  const canContinue = useMemo(() => {
    switch (step) {
      case "identity":
        return name.trim().length > 0;
      case "roleTrope": {
  // Trope chosen?
  if (!role || !trope) return false;

  // NPC special must pick 2 attributes
  if (npcSpecial) return npcSpecialAttrs.length === 2;

  // Regular trope: if 2+ options, must choose one
  const needsTropeAttr = !!(tropeDef?.attribute_options?.length && tropeDef.attribute_options.length > 1);
  if (needsTropeAttr && !tropeAttribute) return false;

  return true;
}

      case "tropeAttr":
        return !tropeNeedsAttr || !!tropeAttribute;
      case "age":
        return age === "Young" || age === "Adult" || age === "Old";
case "feats": {
  const picksOnly = selectedFeats.filter(f => f !== "Too Young to Die");
  const roleCount = picksOnly.filter(f => roleFeats.includes(f)).length;
  const tropeCount = picksOnly.filter(f => tropeFeats.includes(f)).length;

  // Always require total and minimums; Special has mins = 0
  const totalsOk = picksOnly.length >= featRule.total;
  const minsOk = roleCount >= featRule.roleMin && tropeCount >= featRule.tropeMin;

  return totalsOk && minsOk;
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
}, [step, name, role, trope, tropeNeedsAttr, tropeAttribute, age, selectedFeats, roleFeats, tropeFeats, featRule.total, featRule.roleMin, featRule.tropeMin, skillBumps, specialRole]);

  function next() {
    if (!canContinue) return;
    if (step === "identity") setStep("roleTrope");
else if (step === "roleTrope") setStep("age");
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
else if (step === "age") setStep("roleTrope");
    else if (step === "feats") setStep("age");
    else if (step === "skillBumps") setStep("feats");
    else if (step === "jobEtc") setStep("skillBumps");
    else if (step === "gear") setStep("jobEtc");
    else if (step === "review") setStep("gear");
  }

function toggleFeat(f: string) {
  // prevent toggling away auto TYtD
  if (age === "Young" && f === "Too Young to Die") return;

  const isRole = roleFeats.includes(f);
  const isTrope = tropeFeats.includes(f);

  setSelectedFeats(prev => {
    const have = new Set(prev);

    // remove
    if (have.has(f)) {
      have.delete(f);
      return age === "Young"
        ? ["Too Young to Die", ...Array.from(have).filter(x => x !== "Too Young to Die")]
        : Array.from(have);
    }

    // add
    const picksOnly = Array.from(have).filter(x => x !== "Too Young to Die");
    const roleCount = picksOnly.filter(x => roleFeats.includes(x)).length;
    const tropeCount = picksOnly.filter(x => tropeFeats.includes(x)).length;

    // Special: only total matters (3)
    if (specialRole) {
      if (picksOnly.length >= featRule.total) return prev;
      have.add(f);
      return Array.from(have);
    }

    // Young: exactly 1 Role + 1 Trope (auto TYtD handled separately)
    if (age === "Young") {
      // cap total user picks to featRule.total
      if (picksOnly.length >= featRule.total) return prev;
      // enforce per-source cap = min = 1 each (if trope available)
      if (isRole) {
        if (roleCount >= Math.max(1, featRule.roleMin)) return prev;
      } else if (isTrope) {
        if (featRule.tropeMin > 0 && tropeCount >= featRule.tropeMin) return prev;
      }
      have.add(f);
      return ["Too Young to Die", ...Array.from(have).filter(x => x !== "Too Young to Die")];
    }

    // Adult: exactly 2 Role + 1 Trope (or 3 Role if no trope feats)
    if (age === "Adult") {
      if (picksOnly.length >= featRule.total) return prev;
      if (isRole) {
        if (roleCount >= featRule.roleMin) return prev;
      } else if (isTrope) {
        if (featRule.tropeMin > 0 && tropeCount >= featRule.tropeMin) return prev;
      }
      have.add(f);
      return Array.from(have);
    }

    // Old: total 4; the 4th pick can be Role or Trope. No per-source caps here.
    if (picksOnly.length >= featRule.total) return prev;
    have.add(f);
    return Array.from(have);
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
      specialAttrPicks: npcSpecial ? npcSpecialAttrs : undefined,
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
      specialAttrPicks: npcSpecial ? npcSpecialAttrs : undefined,
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
{/* ---- Inline attribute pickers ---- */}
{npcSpecial && (
  <div className="mt-2 rounded-lg border p-3">
    <div className="text-xs font-semibold uppercase text-gray-600 mb-1">NPC Special: Choose any 2 attributes</div>
    <div className="flex flex-wrap gap-2">
      {(["brawn","nerves","smooth","focus","crime"] as AttrKey[]).map(a => {
        const on = npcSpecialAttrs.includes(a);
        const disabled = !on && npcSpecialAttrs.length >= 2;
        return (
          <label key={`npc-attr-${a}`} className={`px-2 py-1 border rounded cursor-pointer ${on ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}>
            <input
              type="checkbox"
              className="mr-1"
              checked={on}
              disabled={disabled}
              onChange={() => {
                setNpcSpecialAttrs(prev => on ? prev.filter(x=>x!==a) : [...prev,a]);
              }}
            />
            {a}
          </label>
        );
      })}
    </div>
  </div>
)}

{!npcSpecial && tropeDef?.attribute_options?.length ? (
  <div className="mt-2 rounded-lg border p-3">
    <div className="text-xs font-semibold uppercase text-gray-600 mb-1">Trope Attribute</div>
    {tropeDef.attribute_options.length === 1 ? (
      <div className="text-sm text-muted-foreground">
        This trope grants <b>{tropeDef.attribute_options[0]}</b>.
      </div>
    ) : (
      <Select
        label="Choose one"
        value={tropeAttribute ?? ""}
        onChange={(v)=>setTropeAttribute((v||undefined) as AttrKey)}
        options={["","brawn","nerves","smooth","focus","crime"]}
      />
    )}
  </div>
) : null}

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
{/* --- Trope Attribute on the same page --- */}
{tropeDef && (
  <div className="mt-4 rounded-xl border p-3">
    <div className="text-xs font-semibold uppercase text-gray-600 mb-2">
      Trope Attribute
    </div>

    {/* Fixed attribute (no choice) */}
    {tropeDef.attribute && (
      <div className="text-sm">
        {specialRole && (
          <div className="text-xs text-muted-foreground mb-1">
            Special Role: this sets a fixed attribute.
          </div>
        )}
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
          {String(tropeDef.attribute)}
        </span>
        <div className="text-xs text-muted-foreground mt-1">
          This trope/role dictates the attribute; no selection needed.
        </div>
      </div>
    )}

    {/* Choice among options */}
    {!tropeDef.attribute && !!tropeDef.attribute_options?.length && (
      <>
        {specialRole && (
          <div className="text-xs text-muted-foreground mb-1">
            Special Role: choose one attribute from the available options.
          </div>
        )}
        <Select
          label="Choose Trope Attribute *"
          value={tropeAttribute ?? ""}
          onChange={(v) => setTropeAttribute((v || undefined) as AttrKey)}
          options={[
            "",
            ...((tropeDef.attribute_options as string[]) || []),
          ]}
        />
        {!tropeAttribute && (
          <div className="text-xs text-amber-600 mt-1">
            Select an attribute to continue.
          </div>
        )}
      </>
    )}

    {/* No attribute info in data */}
    {!tropeDef.attribute && !tropeDef.attribute_options?.length && (
      <div className="text-xs text-muted-foreground">
        This trope does not specify an attribute.
      </div>
    )}
  </div>
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
            Young: 2 feats + “Too Young to Die”. Adult: 3 feats. Old: 4 feats and start with 2 lethal bullets.
          </p>
        </Card>
      )}

{step === "feats" && (
  <Card title="Feats">
{specialRole ? (
  <p className="text-sm">Pick <b>3</b> feats from the lists below (Special Role).</p>
) : age === "Young" ? (
  <p className="text-sm">
    <b>Young:</b> <i>Too Young to Die</i> is added automatically. Choose <b>1 Role feat</b> and <b>1 Trope feat</b>.
  </p>
) : age === "Adult" ? (
  <p className="text-sm">Pick <b>2 Role feats</b> and <b>1 Trope feat</b>.</p>
) : (
  <p className="text-sm">
    <b>Old:</b> Choose <b>4</b> feats total (minimum <b>2 Role</b> and <b>1 Trope</b>; the extra can be from either list).
  </p>
)}


    <div className="grid grid-cols-2 gap-4 mt-3">
      <div>
        <h4 className="font-semibold text-sm mb-1">
  Role Feats{!specialRole && age === "Adult" ? ` (${featRule.roleMin} required)` : ""}
</h4>
        <div className="grid gap-2">
          {roleFeats.map(f => {
  const desc = describeFeat(f);
  return (
    <label
      key={`role-${f}`}
className={`border rounded px-3 py-2 text-sm cursor-pointer transition-colors ${
  selectedFeats.includes(f)
    ? "bg-black text-white border-black"
    : "hover:bg-zinc-800 hover:text-white"
}`}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          className="mr-2"
          checked={selectedFeats.includes(f) || (age === "Young" && f === "Too Young to Die")}
          onChange={() => toggleFeat(f)}
          disabled={age === "Young" && f === "Too Young to Die"}
        />
        <span>{f}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide opacity-60">Role</span>
      </div>
      {desc ? (
        <div className="mt-1 text-xs leading-snug text-muted-foreground">
          {desc}
        </div>
      ) : null}
    </label>
  );
})}

        </div>
      </div>

      <div>
<h4 className="font-semibold text-sm mb-1">
  Trope Feats{!specialRole && age === "Adult" ? ` (${featRule.tropeMin} required)` : ""}
</h4>
        <div className="grid gap-2">
          {tropeFeats.length ? tropeFeats.map(f => {
  const desc = describeFeat(f);
  return (
    <label
      key={`trope-${f}`}
className={`border rounded px-3 py-2 text-sm cursor-pointer transition-colors ${
  selectedFeats.includes(f)
    ? "bg-black text-white border-black"
    : "hover:bg-zinc-800 hover:text-white"
}`}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          className="mr-2"
          checked={selectedFeats.includes(f)}
          onChange={() => toggleFeat(f)}
        />
        <span>{f}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide opacity-60">Trope</span>
      </div>
      {desc ? (
        <div className="mt-1 text-xs leading-snug text-muted-foreground">
          {desc}
        </div>
      ) : null}
    </label>
  );
}) : (

            <div className="text-xs italic text-muted-foreground">No trope feats available.</div>
          )}
        </div>
      </div>
    </div>
  </Card>
)}


{step === "skillBumps" && (
  <Card title="Extra Skill Points">
    <p className="text-sm">
      Choose <b>{specialRole ? 6 : 2} different skills</b> to gain +1 each.
    </p>
    <SkillPicker
      value={skillBumps}
      onChange={setSkillBumps}
      max={specialRole ? 6 : 2}
    />
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
<select
  value={value}
  onChange={e => onChange(e.target.value)}
  className="border rounded px-2 py-1 bg-white text-black dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
>
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

function SkillPicker({value, onChange, max = 2}:{value: SkillKey[]; onChange:(s:SkillKey[])=>void; max?: number}) {
  const chosen = new Set(value);
  function toggle(k: SkillKey) {
    const arr = [...chosen];
    const idx = arr.indexOf(k);
    if (idx>=0) arr.splice(idx,1);
    else arr.push(k);
    // enforce unique and max n
    onChange(Array.from(new Set(arr)).slice(0, max) as SkillKey[]);
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {ALL_SKILLS.map(k => (
        <label key={k} className={`border rounded px-3 py-2 cursor-pointer ${chosen.has(k) ? "bg-zinc-100" : ""}`}>
          <input
  type="checkbox"
  className="mr-2"
  checked={chosen.has(k)}
  onChange={()=>toggle(k)}
  disabled={!chosen.has(k) && chosen.size >= max}
/>
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
