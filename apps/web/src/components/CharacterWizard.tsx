import { useMemo, useState } from "react";
import type { CharacterDTO, SkillKey, AttrKey } from "@action-thread/types";
import { api } from "../lib/api";
import { DATA, findRole, findTrope, buildDerivedDTO, featRules, roleOptionLists, isSpecialRole, FEAT_DESC } from "../data/wizard";
import { useEffect } from "react";
// data
import { roleGearGrants, tropeGearGrants } from "@/data/wizard";
// catalog resolver
import { optionsForGrant, toNames } from "@/lib/gear";


// ---- local attribute normalizer for warnings ----
const normalizeAttr = (a?: string | null) => {
  if (!a) return null;
  const k = a.trim().toLowerCase();
  return ["brawn", "nerves", "smooth", "focus", "crime"].includes(k) ? (k as any) : null;
};

// ---------------- Display helpers ----------------
function labelize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Accepts string | { name?: string; value?: any } | unknown
function asName(x: any): string {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number") return String(x);
  if (typeof x === "object") {
    if ("name" in x && x.name) return String((x as any).name);
    if ("value" in x && (x as any).value != null) return String((x as any).value);
  }
  return "";
}

function sanitizeFeats(
  picks: string[],
  roleFeats: string[],
  tropeFeats: string[],
  featRule: { total: number; roleMin: number; tropeMin: number; auto: string[] },
  specialRole: boolean,
  age: "Young" | "Adult" | "Old"
) {
  // Ignore auto feat when counting (display-only)
  const AUTO = "Too Young to Die";
  const base = picks.filter(f => f !== AUTO);

  if (specialRole) {
    // Special roles: only total matters
    const out = base.slice(0, Math.max(0, featRule.total));
    return age === "Young" ? [AUTO, ...out] : out;
  }

  // Partition by source
  const roleChosen  = base.filter(f => roleFeats.includes(f));
  const tropeChosen = base.filter(f => tropeFeats.includes(f));

  // Enforce minimums first
  let keptRole  = roleChosen.slice(0, Math.max(0, featRule.roleMin));
  let keptTrope = tropeChosen.slice(0, Math.max(0, featRule.tropeMin));

  // Fill remaining capacity from whatever remains (prefers stability)
  const remaining = base.filter(f => !keptRole.includes(f) && !keptTrope.includes(f));
  const capacity = Math.max(0, featRule.total - keptRole.length - keptTrope.length);
  const filler = remaining.slice(0, capacity);

  const out = [...keptRole, ...keptTrope, ...filler];
  return age === "Young" ? [AUTO, ...out] : out;
}

type Step =
  | "identity"
  | "roleTrope"
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

// Role attribute (when role provides attribute_options)
const [roleAttribute, setRoleAttribute] = useState<AttrKey | undefined>(undefined);

// Special: N.P.C. — choose any two attributes
const [specialAttrs, setSpecialAttrs] = useState<AttrKey[]>([]);

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
const roleDef = useMemo(() => (role ? findRole(role) : null), [role]);
const tropeDef = useMemo(() => (trope ? findTrope(trope) : null), [trope]);

// === Gear grants (from JSON) ===
const roleGrants  = useMemo(() => role ? roleGearGrants(role)   : [], [role]);
const tropeGrants = useMemo(() => trope ? tropeGearGrants(trope) : [], [trope]);
const allGrants   = useMemo(() => [...roleGrants, ...tropeGrants], [roleGrants, tropeGrants]);

// Per-grant selections: array parallel to allGrants, each entry is a list of selected catalog IDs
const [selectedByGrant, setSelectedByGrant] = useState<string[][]>(() => allGrants.map(() => []));
// Freeform user-added items (strings)
const [gearCustom, setGearCustom] = useState<string[]>([]);

// Reset grant selections and custom adds when Role or Trope change
useEffect(() => {
  setSelectedByGrant(allGrants.map(() => []));
  setGearCustom([]);
}, [role, trope]);

const specialRole = isSpecialRole(role);
const npcSpecial = specialRole && String(role).toLowerCase().includes("n.p.c");

// Role attribute options (regular roles)
const roleAttrOptions = (roleDef?.attribute_options as AttrKey[] | undefined) || [];

// Trope attribute options (prefer options from JSON; disabled for Special Roles)
const tropeAttrOptions = (tropeDef?.attribute_options as AttrKey[] | undefined) || [];

useEffect(() => {
  // Clear role pick if not applicable
  if (!roleAttrOptions.length || specialRole) setRoleAttribute(undefined);

  // Clear special picks if not NPC special
  if (!npcSpecial) setSpecialAttrs([]);

  // Trope attribute is only needed for non-special roles when trope provides options
  if (specialRole || !tropeAttrOptions.length) {
    setTropeAttribute(undefined);
    return;
  }

  // Validate the current tropeAttribute against tropeAttrOptions
  if (tropeAttribute && !tropeAttrOptions.includes(tropeAttribute)) {
    setTropeAttribute(undefined);
  }
}, [specialRole, npcSpecial, roleAttrOptions, tropeAttrOptions]);

  // When Role is Special, force Trope = Role and keep them in sync
  useEffect(() => {
    if (specialRole && role) {
      setTrope(role);
    }
  }, [specialRole, role]);

// Trope attribute needed when the trope exposes options AND role is not Special
const tropeNeedsAttr = !!(tropeAttrOptions.length) && !specialRole;

// Role attribute needed when the role exposes options AND role is not Special
const roleNeedsAttr = !!(roleAttrOptions.length) && !specialRole;

  const { jobs, flaws, catchphrases, gear } = roleOptionLists(role);

// What attribute(s) the ROLE already grants (to display above the Trope picker)
const roleGainedAttrs = useMemo((): string[] => {
  if (!roleDef) return [];

  // Special roles with array attributes: show both
  if (specialRole && Array.isArray(roleDef.attribute)) {
    return roleDef.attribute.map((a: any) => (normalizeAttr(String(a)) ?? String(a)));
  }

  // Special: N.P.C. — show whatever the user has picked so far (if any)
  if (npcSpecial && specialAttrs.length) {
    return specialAttrs.map(String);
  }

  // Regular role with options: show the chosen roleAttribute (if picked)
  if (roleNeedsAttr && roleAttribute) {
    return [String(roleAttribute)];
  }

  // Regular role with fixed attribute
  if (!specialRole && typeof roleDef.attribute === "string") {
    return [normalizeAttr(String(roleDef.attribute)) ?? String(roleDef.attribute)];
  }

  return [];
}, [roleDef, specialRole, npcSpecial, specialAttrs, roleNeedsAttr, roleAttribute]);

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
case "roleTrope":
  return (
    !!role &&
    !!trope &&
    (!roleNeedsAttr || !!roleAttribute) &&
    (!tropeNeedsAttr || !!tropeAttribute) &&
    (!npcSpecial || specialAttrs.length === 2)
  );
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
        return skillBumps.length === (specialRole ? 6 : 2);
      case "jobEtc":
        return true; // free-form ok
      case "gear": {
      // All choose-grants must meet their pick count; credit/grant are free
        const allOk = allGrants.every((g, idx) => {
          if (g.mode !== "choose") return true;
          const picked = selectedByGrant[idx]?.length ?? 0;
          return picked >= g.count;
        });
        return allOk;
      }

      case "review":
        return true;
    }
}, [step, name, role, trope, tropeNeedsAttr, tropeAttribute, age, selectedFeats, roleFeats, tropeFeats, featRule.total, featRule.roleMin, featRule.tropeMin, skillBumps, specialRole]);

  function next() {
    if (!canContinue) return;
    if (step === "identity") setStep("roleTrope");
    else if (step === "roleTrope") setStep("age");
    else if (step === "age") setStep("feats");
    else if (step === "feats") setStep("skillBumps");
    else if (step === "skillBumps") setStep("jobEtc");
    else if (step === "jobEtc") setStep("gear");
    else if (step === "gear") setStep("review");
  }
  function back() {
    if (step === "roleTrope") setStep("identity");
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

  // Build human-readable names from grant selections
function grantPickedNames(): string[] {
  const out: string[] = [];
  allGrants.forEach((g, idx) => {
    if (g.mode === "give") {
      // Convert give -> names via optionsForGrant shim
      const giveNames = toNames(
        optionsForGrant({ ...g, mode: "choose", of: { type: "ids", ids: g.items }, count: g.items.length } as any)
      );
      out.push(...giveNames);
      return;
    }
    // choose / credit
    const ids = selectedByGrant[idx] ?? [];
    const chosenItems = optionsForGrant(g).filter(o => ids.includes(o.id));
    out.push(...toNames(chosenItems));
  });
  return out;
}


// Can we legally build yet?
const canBuild = useMemo(() => {
  if (!name.trim()) return false;
  if (!role) return false;
  if (!trope) return false;
if (roleNeedsAttr && !roleAttribute) return false;
if (tropeNeedsAttr && !tropeAttribute) return false;
if (npcSpecial && specialAttrs.length !== 2) return false;
return true;
}, [name, role, trope, roleNeedsAttr, roleAttribute, tropeNeedsAttr, tropeAttribute, npcSpecial, specialAttrs]);

// Final gear list = grant picks + freeform user-added items
const mergedGearChosen = useMemo(() => {
  return [...grantPickedNames(), ...gearCustom];
}, [selectedByGrant, allGrants, gearCustom]);

// Only build when it's safe (and preferably only when needed)
const reviewDTO = useMemo(() => {
  if (!canBuild) return null;
  try {
    const safeFeats = sanitizeFeats(selectedFeats, roleFeats, tropeFeats, featRule, specialRole, age);
    return buildDerivedDTO({
      name: name.trim(),
      role,
      trope,
      age,
      roleAttribute,
      tropeAttribute,
      specialAttributes: specialAttrs,
      selectedFeats: safeFeats,
      skillBumps,
      jobOrBackground: jobOrBackground.trim(),
      flaw: flaw.trim(),
      catchphrase: catchphrase.trim(),
      gearChosen: mergedGearChosen,
    });
  } catch {
    return null; // never throw during render
  }
  // You can also narrow this to step === "review" if you want:
  // }, [step, canBuild, name, role, trope, age, tropeAttribute, selectedFeats, skillBumps, jobOrBackground, flaw, catchphrase, mergedGearChosen]);
}, [canBuild, name, role, trope, age, roleAttribute, tropeAttribute, specialAttrs, selectedFeats, skillBumps, jobOrBackground, flaw, catchphrase, mergedGearChosen]);

// Snapshot BEFORE extra Skill Bumps, showing base 1 + Role/Trope bonuses
const preBumpDTO = useMemo(() => {
  if (!canBuild) return null;
  try {
    const safeFeats = sanitizeFeats(selectedFeats, roleFeats, tropeFeats, featRule, specialRole, age);
    const dto = buildDerivedDTO({
      name: name.trim(),
      role,
      trope,
      age,
      roleAttribute,
      tropeAttribute,
      specialAttributes: specialAttrs,
      selectedFeats: safeFeats,
      skillBumps: [],
      jobOrBackground: jobOrBackground.trim(),
      flaw: flaw.trim(),
      catchphrase: catchphrase.trim(),
      gearChosen: mergedGearChosen,
    });

    return dto;
  } catch {
    return null;
  }
}, [
  canBuild, name, role, trope, age,
  roleAttribute, tropeAttribute, specialAttrs,
  selectedFeats, jobOrBackground, flaw, catchphrase,
  mergedGearChosen, roleDef, tropeDef
]);

// Snapshot BEFORE Trope attribute is applied (for lost-point warning math)
const preTropeDTO = useMemo(() => {
  if (!canBuild) return null;
  try {
    const safeFeats = sanitizeFeats(
      selectedFeats,
      roleFeats,
      tropeFeats,
      featRule,
      specialRole,
      age
    );
    const dto = buildDerivedDTO({
      name: name.trim(),
      role,
      trope,
      age,
      roleAttribute,
      // IMPORTANT: omit Trope attribute here so we see the pre-Trope value
      tropeAttribute: undefined,
      specialAttributes: specialAttrs,
      selectedFeats: safeFeats,
      skillBumps: [],
      jobOrBackground: jobOrBackground.trim(),
      flaw: flaw.trim(),
      catchphrase: catchphrase.trim(),
      gearChosen: mergedGearChosen,
    });
    return dto;
  } catch {
    return null;
  }
}, [
  canBuild, name, role, trope, age,
  roleAttribute, /* note: no tropeAttribute here on purpose */,
  specialAttrs, selectedFeats, jobOrBackground, flaw, catchphrase,
  mergedGearChosen, roleDef, tropeDef, featRule, roleFeats, tropeFeats, specialRole
]);

  async function save() {
    try {
      const safeFeats = sanitizeFeats(selectedFeats, roleFeats, tropeFeats, featRule, specialRole, age);
      const dto = buildDerivedDTO({
        name,
        role,
        trope,
        age,
        roleAttribute,                 // NEW
        tropeAttribute,
        specialAttributes: specialAttrs, // NEW (NPC Special)
        selectedFeats: safeFeats,
        skillBumps,
        jobOrBackground: jobOrBackground.trim(),
        flaw: flaw.trim(),
        catchphrase: catchphrase.trim(),
        gearChosen: mergedGearChosen,
      });

    const created = await api("/characters", { method: "POST", json: dto });
    onComplete?.(created);
  } catch (err: any) {
    alert(err?.message || "Failed to save hero.");
  }
}


  // Basic UI: (Tailwind present; keep it minimal and readable)
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Create Hero</h1>

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

{/* Role Attribute (only when role exposes options and not Special) */}
{!specialRole && roleNeedsAttr && (
  <Select
    label="Role Attribute *"
    value={roleAttribute ?? ""}
    onChange={(v) => setRoleAttribute((v || undefined) as AttrKey)}
    options={["", ...roleAttrOptions]}
  />
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
      Attributes and Skills
    </div>

    {/* Role attribute(s) gained (shown before the Trope selection) */}
    {roleGainedAttrs.length > 0 && (
      <div className="mb-3">
        <div className="text-xs text-muted-foreground mb-1">Role grants:</div>
        <div className="flex flex-wrap gap-2">
          {roleGainedAttrs.map((a) => (
            <span
              key={`role-attr-chip-${a}`}
              className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
            >
              {labelize(String(a))}
            </span>
          ))}
        </div>
      </div>
    )}

{/* Trope Attribute (only when the trope exposes options AND role is not Special) */}
{tropeNeedsAttr && (
  <>
    <div className="text-xs text-muted-foreground mb-1">
      Choose an attribute granted by your Trope.
    </div>

    <Select
      label="Choose Trope Attribute *"
      value={tropeAttribute ?? ""}
      onChange={(v) => setTropeAttribute((v || undefined) as AttrKey)}
      options={["", ...tropeAttrOptions]}
    />

    {/* Lost-point warning: Role already at 3 → Trope +1 is wasted */}
    {tropeAttribute && preBumpDTO && preTropeDTO && (() => {
      const attr = normalizeAttr(tropeAttribute) as AttrKey | null;
      if (!attr) return null;

      const beforeTrope = (preTropeDTO.attributes?.[attr] as number) ?? 0; // value WITHOUT the Trope +1
      const withTrope = (preBumpDTO.attributes?.[attr] as number) ?? 0;    // value WITH the Trope +1 (capped)

      // If pre-Trope is already at cap, the +1 is necessarily lost
      const CAP = 3;
      const lost = beforeTrope >= CAP || withTrope === beforeTrope;

      return lost ? (
        <div className="text-xs text-amber-600 mt-1">
          This choice would push <b>{labelize(attr)}</b> above the cap of 3 because your Role already brought it to 3.
          The extra point from your Trope will be <b>lost</b>.
        </div>
      ) : null;
    })()}


    {!tropeAttribute && (
      <div className="text-xs text-amber-600 mt-1">
        Select an attribute to continue.
      </div>
    )}
  </>
)}

{/* No attribute info in data (non-Special role, no options, no fixed attr) */}
{!specialRole && !tropeAttrOptions.length && !tropeDef?.attribute && (
  <div className="text-xs text-muted-foreground">
    This trope does not specify an attribute.
  </div>
)}

{/* Special: N.P.C. — pick any two attributes */}
{npcSpecial && (
  <Card title="Special: N.P.C. — Attributes">
    <div className="text-xs text-muted-foreground mb-2">
      Choose <b>any two</b> attributes to gain +1 each.
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Select
        label="Special Attribute #1 *"
        value={specialAttrs[0] ?? ""}
        onChange={(v) => {
          const a = (v || undefined) as AttrKey | undefined;
          setSpecialAttrs((prev) => {
            const second = prev[1] && prev[1] !== a ? prev[1] : (prev[1] === a ? undefined : prev[1]);
            return [a!, second!].filter(Boolean) as AttrKey[];
          });
        }}
        options={["", "brawn","nerves","smooth","focus","crime"].map(x =>
          typeof x === "string" && ["brawn","nerves","smooth","focus","crime"].includes(x) ? x : x
        )}
      />
      <Select
        label="Special Attribute #2 *"
        value={specialAttrs[1] ?? ""}
        onChange={(v) => {
          const b = (v || undefined) as AttrKey | undefined;
          setSpecialAttrs((prev) => {
            const first = prev[0] && prev[0] !== b ? prev[0] : (prev[0] === b ? undefined : prev[0]);
            const next = [first!, b!].filter(Boolean) as AttrKey[];
            // enforce uniqueness
            return Array.from(new Set(next)).slice(0, 2) as AttrKey[];
          });
        }}
        options={["", "brawn","nerves","smooth","focus","crime"]}
      />
    </div>
    {specialAttrs.length !== 2 && (
      <div className="text-xs text-destructive mt-1">
        Required: select two distinct attributes.
      </div>
    )}
  </Card>
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

        </div>
      )}
</Card>
)}
      {step === "age" && (
        <Card title="Age">
          <Select label="Age" value={age} onChange={v=>setAge(v as any)} options={["Young","Adult","Old"]} />
          <p className="text-xs text-muted-foreground mt-2">
            Young: 2 feats + “Too Young to Die”; 2 Adrenaline/Luck. Adult: 3 feats. Old: 4 feats and start with 2 lethal bullets.
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
      Choose <b>{specialRole ? 6 : 2} skills</b> to gain +1 each.
    </p>

    {/* Current values BEFORE extra bumps, grouped by attribute */}
    {preBumpDTO && (
      <div className="mt-3 mb-3">
        <div className="text-xs text-muted-foreground mb-2">
          Current values (before these extra points):
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {ATTR_ORDER.map((attr) => (
            <div key={attr} className="rounded border p-2">
              <div className="font-semibold text-sm capitalize mb-1">
                {labelize(attr)}: <span className="tabular-nums">{preBumpDTO.attributes[attr] as any}</span>
              </div>
              <ul className="grid grid-cols-2 gap-x-4 text-sm">
                {ATTR_SKILL_GROUPS[attr].map((sk) => (
                  <li key={sk} className="flex justify-between">
                    <span>{labelize(sk)}</span>
                    <span className="tabular-nums">{(preBumpDTO.skills[sk] as any) ?? 0}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    )}

    <SkillPicker
      value={skillBumps}
      onChange={setSkillBumps}
      max={specialRole ? 6 : 2}
      baseLevels={(preBumpDTO?.skills as Record<SkillKey, number>) || {}}
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
    {allGrants.length ? (
      <>
        <p className="text-sm mb-2">
          Pick your starting gear. Some are automatically granted, others let you choose. You can still add custom items below.
        </p>

        {/* Render each grant */}
        <div className="space-y-4">
          {allGrants.map((grant, idx) => {
            // Auto-granted items
            if (grant.mode === "give") {
              const names = toNames(
                optionsForGrant({ ...grant, mode: "choose", of: { type: "ids", ids: grant.items }, count: grant.items.length } as any)
              );
              return (
                <div key={idx} className="border rounded p-2">
                  <div className="text-sm font-medium">Granted:</div>
                  <div className="text-sm">{names.join(", ")}</div>
                </div>
              );
            }

            // Budget grant
            if (grant.mode === "credit") {
              const options = optionsForGrant(grant);
              const chosen = new Set(selectedByGrant[idx] ?? []);
              const total = options
                .filter(o => chosen.has(o.id))
                .reduce((sum, o) => sum + (o.cost ?? 0), 0);

              const toggle = (id: string) => {
                setSelectedByGrant(prev => {
                  const copy = prev.map(x => [...x]);
                  const current = new Set(copy[idx] ?? []);
                  if (current.has(id)) {
                    current.delete(id);
                  } else {
                    const item = options.find(o => o.id === id)!;
                    if (total + (item.cost ?? 0) > grant.amount) return prev; // keep budget
                    current.add(id);
                  }
                  copy[idx] = [...current];
                  return copy;
                });
              };

              return (
                <div key={idx} className="border rounded p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {grant.label ?? `Spend up to $${grant.amount}`}
                    </div>
                    <div className="text-xs opacity-70">
                      Selected: ${total} / ${grant.amount}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {options.map(o => {
                      const checked = chosen.has(o.id);
                      const wouldExceed = !checked && (total + (o.cost ?? 0) > grant.amount);
                      return (
                        <label key={o.id} className={`border rounded px-2 py-1 text-sm flex items-center gap-2 ${wouldExceed ? "opacity-50" : ""}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(o.id)}
                            disabled={wouldExceed}
                          />
                          <span>{o.name}{o.cost != null ? ` ($${o.cost})` : ""}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Choose-from options
            const options = optionsForGrant(grant);
            const chosen = new Set(selectedByGrant[idx] ?? []);
            const limit = grant.count;

            const toggle = (id: string) => {
              setSelectedByGrant(prev => {
                const copy = prev.map(x => [...x]);
                const current = new Set(copy[idx] ?? []);
                if (current.has(id)) {
                  current.delete(id);
                } else {
                  if (current.size >= limit) return prev; // enforce pick count
                  current.add(id);
                }
                copy[idx] = [...current];
                return copy;
              });
            };

            const label =
              (("label" in (grant.of as any)) && (grant.of as any).label) ||
              (grant.of.type === "ids"   ? "Choose" :
               grant.of.type === "kind"  ? `Choose a ${grant.of.kind}` :
               grant.of.type === "ride"  ? "Choose a ride" :
               "Choose");

            return (
              <div key={idx} className="border rounded p-2">
                <div className="text-sm font-medium">
                  {label} {limit > 1 ? `(pick ${limit})` : `(pick 1)`}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {options.map(o => {
                    const checked = chosen.has(o.id);
                    const full = !checked && (chosen.size >= limit);
                    return (
                      <label key={o.id} className={`border rounded px-2 py-1 text-sm flex items-center gap-2 ${full ? "opacity-50" : ""}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(o.id)}
                          disabled={full}
                        />
                        <span>{o.name}{o.cost != null ? ` ($${o.cost})` : ""}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom additions */}
        <div className="mt-4">
          <AddLine label="Add custom gear" onAdd={(txt)=> txt && setGearCustom(prev => [...prev, txt])} />
          {!!(grantPickedNames().length + gearCustom.length) && (
            <ul className="list-disc ml-6 mt-2 text-sm">
              {[...grantPickedNames(), ...gearCustom].map((g,i)=><li key={i}>{g}</li>)}
            </ul>
          )}
        </div>
      </>
    ) : (
      // No grants? Fallback helper text.
      <p className="text-sm text-muted-foreground">
        No structured gear found for this Role/Trope. Add custom gear below.
      </p>
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
        {step==="review" && <button className="rounded px-3 py-2 bg-emerald-600 text-white" onClick={save}>Save Hero</button>}
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
      {options.map(o => (
        <option key={o} value={o}>
          {o ? labelize(o) : "—"}
        </option>
      ))}
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

// Attribute → Skills grouping (display order)
const ATTR_SKILL_GROUPS: Record<AttrKey, SkillKey[]> = {
  brawn:  ["endure","fight","force","stunt"],
  nerves: ["cool","drive","shoot","survival"],
  smooth: ["flirt","leadership","speech","style"],
  focus:  ["detect","fix","heal","know"],
  crime:  ["awareness","dexterity","stealth","streetwise"],
};
const ATTR_ORDER: AttrKey[] = ["brawn","nerves","smooth","focus","crime"];

const ALL_SKILLS: SkillKey[] = [
  "endure", "fight", "force", "stunt",
  "cool", "drive", "shoot", "survival",
  "flirt", "leadership", "speech", "style",
  "detect", "fix", "heal", "know",
  "awareness", "dexterity", "stealth", "streetwise",
];

function SkillPicker({
  value,
  onChange,
  max = 2,
  baseLevels = {},
}: {
  value: SkillKey[];
  onChange: (s: SkillKey[]) => void;
  max?: number;
  baseLevels?: Partial<Record<SkillKey, number>>;
}) {
  // value is a multiset expressed as an array (duplicates allowed)
  const counts = useMemo(() => {
    const m = new Map<SkillKey, number>();
    for (const k of value) m.set(k, (m.get(k) || 0) + 1);
    return m;
  }, [value]);

  const total = value.length;

  function add(k: SkillKey) {
    if (total >= max) return; // cap
    onChange([...value, k]);
  }
  function removeOne(k: SkillKey) {
    const idx = value.indexOf(k);
    if (idx === -1) return;
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  }

return (
  <div className="space-y-2">
    <div className="text-sm text-muted-foreground">
      Skill bumps selected: <b>{total}</b> / {max}
    </div>
    <div className="grid grid-cols-2 gap-2">
      {ALL_SKILLS.map((k) => {
        const c = counts.get(k as SkillKey) || 0;
        const baseVal = (baseLevels[k as SkillKey] as number) ?? 0;
        const currentWithBumps = baseVal + c;

        return (
          <div
            key={k}
            className="border rounded px-3 py-2 flex items-center justify-between"
          >
            <span className="mr-2">{labelize(k)}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 border rounded disabled:opacity-50"
                onClick={() => removeOne(k as SkillKey)}
                disabled={c === 0}
                aria-label={`Remove ${k}`}
              >
                −
              </button>

              <span className="tabular-nums w-6 text-center">{c}</span>

              {currentWithBumps >= 3 && (
                <span className="text-[10px] uppercase opacity-60">cap</span>
              )}

              <button
                type="button"
                className="px-2 py-1 border rounded disabled:opacity-50"
                onClick={() => add(k as SkillKey)}
                disabled={total >= max || currentWithBumps >= 3}
                aria-label={`Add ${k}`}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
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
      <div>
        Feats: {
          (dto.feats?.length
            ? dto.feats
                .map((f: any) => {
                  const name = typeof f === "string" ? f : (f?.name ?? (f?.value != null ? String(f.value) : ""));
                  return name;
                })
                .filter(Boolean)
                .join(", ")
            : "—")
        }
      </div>


      <div>Adrenaline/Luck: {dto.adrenaline ?? dto.luck} | Spotlight: {dto.spotlight} | Cash: {dto.cash}</div>
<div className="mt-6">
  <b>Attributes & Skills</b>

  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
    {Object.entries(ATTR_SKILL_GROUPS).map(([attrKey, skills]) => (
      <div key={attrKey} className="rounded-lg border p-2">
        {/* Attribute header */}
        <div className="flex items-center justify-between font-semibold">
          <span>{attrKey.charAt(0).toUpperCase() + attrKey.slice(1)}</span>
          <span>{dto.attributes?.[attrKey as AttrKey] ?? 0}</span>
        </div>

        {/* Skills list under that attribute */}
        <ul className="mt-2 ml-3 space-y-0.5">
          {skills.map((sk) => (
            <li key={sk} className="flex items-center justify-between text-sm">
              <span>{sk.charAt(0).toUpperCase() + sk.slice(1)}</span>
              <span>{dto.skills?.[sk as SkillKey] ?? 0}</span>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
</div>

      {!!(dto.storage?.gunsAndGear?.length) && (
        <div><b>Gear</b>: {dto.storage.gunsAndGear.map(g=>g.name).join(", ")}</div>
      )}
    </div>
  );
}
