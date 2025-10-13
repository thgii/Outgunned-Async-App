import React, { useMemo, useState } from "react";
import data from "../data/outgunned_data.json"; // <-- this is your updated file (with *_options)
import { api } from "../lib/api";

type Role = {
  name: string;
  source?: string;
  attribute?: string;
  skills?: string[];
  feats?: string[];
  gear?: string[];
  jobs?: string[];
  catchphrases?: string[];
  flaws?: string[];

  // dynamic fields we added
  feat_options?: string[];
  gear_options?: string[];
  jobs_options?: string[];
  catchphrases_options?: string[];
  flaws_options?: string[];
};

type Trope = {
  name: string;
  source?: string;
  attribute?: string; // e.g., "Nerves or Crime"
  skills?: string[];
  feats?: string[];

  // dynamic fields we added
  attribute_options?: string[]; // e.g., ["Nerves","Crime"]
  feat_options?: string[];
};

type Feat = { name: string; text?: string; source?: string };
type Gear = { name: string; text?: string; source?: string };

type Character = {
  name: string;
  role?: Role | null;
  trope?: Trope | null;
  tropeAttribute?: string | null;
  age?: "Young" | "Adult" | "Old" | null;
  job?: string | null;
  catchphrase?: string | null;
  flaw?: string | null;
  feats: string[];
  gear: string[];
};

const ALL_AGES: Array<Character["age"]> = ["Young", "Adult", "Old"];

const StepHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-4">
    <h2 className="text-xl font-bold">{title}</h2>
    {subtitle && <p className="text-sm opacity-80">{subtitle}</p>}
  </div>
);

const Pill: React.FC<{
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ selected, onClick, children, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={[
      "px-3 py-1 rounded-full border text-sm",
      selected ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-300 hover:bg-slate-50",
      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
    ].join(" ")}
  >
    {children}
  </button>
);

export default function CharacterCreator() {
  const [step, setStep] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const [ch, setCh] = useState<Character>({
    name: "",
    role: null,
    trope: null,
    tropeAttribute: null,
    age: null,
    job: null,
    catchphrase: null,
    flaw: null,
    feats: [],
    gear: [],
  });

  // ------- Derived dynamic pools --------
  const roleFeatOptions = useMemo<string[]>(
    () => (ch.role?.feat_options ?? ch.role?.feats ?? []) as string[],
    [ch.role]
  );

  const tropeFeatOptions = useMemo<string[]>(
    () => (ch.trope?.feat_options ?? ch.trope?.feats ?? []) as string[],
    [ch.trope]
  );

  const allowedFeatNames = useMemo<string[]>(() => {
    const s = new Set<string>([...roleFeatOptions, ...tropeFeatOptions]);
    return [...s];
  }, [roleFeatOptions, tropeFeatOptions]);

  const allowedFeats = useMemo<Feat[]>(
    () => data.feats.filter((f: any) => allowedFeatNames.includes(f.name)),
    [allowedFeatNames]
  );

  const allowedGearNames = useMemo<string[]>(
    () => (ch.role?.gear_options ?? ch.role?.gear ?? []) as string[],
    [ch.role]
  );

  const allowedGear = useMemo<Gear[]>(
    () => data.gear.filter((g: any) => allowedGearNames.includes(g.name)),
    [allowedGearNames]
  );

  const roleJobs = useMemo<string[]>(
    () => (ch.role?.jobs_options ?? ch.role?.jobs ?? []) as string[],
    [ch.role]
  );
  const roleCatchphrases = useMemo<string[]>(
    () => (ch.role?.catchphrases_options ?? ch.role?.catchphrases ?? []) as string[],
    [ch.role]
  );
  const roleFlaws = useMemo<string[]>(
    () => (ch.role?.flaws_options ?? ch.role?.flaws ?? []) as string[],
    [ch.role]
  );

  // ------- Step guards --------
  const canNextFromRole = !!ch.role;
  const tropeNeedsAttr = !!ch.trope?.attribute_options?.length;
  const canNextFromTrope = !!ch.trope && (!tropeNeedsAttr || !!ch.tropeAttribute);
  const canNextFromAge = !!ch.age;

  const canNextFromPersonal =
    !!ch.job && !!ch.catchphrase && !!ch.flaw;

  const canNextFromFeats = ch.feats.length > 0; // adjust if you have a specific feat count rule
  const canNextFromGear = true; // usually optional; change if you require at least 1

  // ------- Helpers --------
  const toggleInArray = (arr: string[], value: string): string[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const resetDownstream = (after: "role" | "trope" | "age" | "personal" | "feats") => {
    // Clear any fields that depend on the changed step
    if (after === "role") {
      setCh((s) => ({
        ...s,
        // keep name
        // role changed upstairs
        job: null,
        catchphrase: null,
        flaw: null,
        feats: [],
        gear: [],
      }));
    } else if (after === "trope") {
      setCh((s) => ({
        ...s,
        tropeAttribute: null,
        feats: [], // feats depend on trope union
      }));
    } else if (after === "age") {
      // nothing else strictly depends on age here
    } else if (after === "personal") {
      // nothing else strictly depends on personal choices
    } else if (after === "feats") {
      // nothing else
    }
  };

  // ------- Save --------
  const onSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: ch.name?.trim() || "New Hero",
        role: ch.role ? { name: ch.role.name } : null,
        trope: ch.trope ? { name: ch.trope.name } : null,
        tropeAttribute: ch.tropeAttribute || null,
        age: ch.age || null,
        job: ch.job || null,
        catchphrase: ch.catchphrase || null,
        flaw: ch.flaw || null,
        feats: ch.feats,
        gear: ch.gear,
      };
      await api("/characters", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
      alert("Character saved!");
    } catch (e: any) {
      console.error(e);
      alert("Save failed. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Name */}
      <div className="flex items-center gap-3">
        <label className="text-sm w-24">Name</label>
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Your hero's name"
          value={ch.name}
          onChange={(e) => setCh({ ...ch, name: e.target.value })}
        />
      </div>

      {/* Stepper */}
      <div className="flex flex-wrap gap-2 text-xs">
        {["Role", "Trope", "Age", "Personal", "Feats", "Gear", "Review"].map((label, i) => (
          <Pill key={label} selected={step === i} onClick={() => setStep(i)}>
            {i + 1}. {label}
          </Pill>
        ))}
      </div>

      {/* CONTENT */}
      {step === 0 && (
        <section>
          <StepHeader title="Choose a Role" subtitle="This sets your job, catchphrase & flaw menus, and your gear/feat pools." />
          <div className="grid sm:grid-cols-2 gap-3">
            {data.roles.map((r: Role) => {
              const selected = ch.role?.name === r.name;
              return (
                <div
                  key={r.name}
                  className={`border rounded p-3 ${selected ? "border-blue-600 ring-2 ring-blue-200" : "border-slate-300"}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-semibold">{r.name}</div>
                    <Pill
                      selected={selected}
                      onClick={() => {
                        setCh({ ...ch, role: r });
                        resetDownstream("role");
                      }}
                    >
                      {selected ? "Selected" : "Select"}
                    </Pill>
                  </div>
                  {r.skills?.length ? (
                    <div className="text-xs mt-2">
                      <span className="opacity-70">Skills:</span> {r.skills.join(", ")}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-between">
            <span />
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={!canNextFromRole}
              onClick={() => setStep(1)}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section>
          <StepHeader title="Choose a Trope" subtitle="Some tropes require picking an attribute option." />
          <div className="grid sm:grid-cols-2 gap-3">
            {data.tropes.map((t: Trope) => {
              const selected = ch.trope?.name === t.name;
              const needsAttr = !!t.attribute_options?.length;
              return (
                <div
                  key={t.name}
                  className={`border rounded p-3 ${selected ? "border-blue-600 ring-2 ring-blue-200" : "border-slate-300"}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-semibold">{t.name}</div>
                    <Pill
                      selected={selected}
                      onClick={() => {
                        setCh({ ...ch, trope: t, tropeAttribute: null, feats: [] });
                        resetDownstream("trope");
                      }}
                    >
                      {selected ? "Selected" : "Select"}
                    </Pill>
                  </div>

                  {t.attribute && (
                    <div className="text-xs mt-2">
                      <span className="opacity-70">Attribute:</span> {t.attribute}
                    </div>
                  )}

                  {selected && needsAttr && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold mb-1">Choose your Trope Attribute Point</div>
                      <div className="flex flex-wrap gap-2">
                        {t.attribute_options!.map((opt) => (
                          <Pill
                            key={opt}
                            selected={ch.tropeAttribute === opt}
                            onClick={() => setCh({ ...ch, tropeAttribute: opt })}
                          >
                            {opt}
                          </Pill>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-between">
            <button className="px-4 py-2 rounded border" onClick={() => setStep(0)}>
              Back
            </button>
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={!canNextFromTrope}
              onClick={() => setStep(2)}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <StepHeader title="Choose Age" subtitle="Some tables elsewhere may key off this choice." />
          <div className="flex gap-2 flex-wrap">
            {ALL_AGES.map((a) => (
              <Pill key={a} selected={ch.age === a} onClick={() => setCh({ ...ch, age: a })}>
                {a}
              </Pill>
            ))}
          </div>

          <div className="mt-6 flex justify-between">
            <button className="px-4 py-2 rounded border" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={!canNextFromAge}
              onClick={() => setStep(3)}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <StepHeader title="Personal Details" subtitle="Pick from your Role’s lists: Job, Catchphrase, and Flaw." />

          <div className="grid sm:grid-cols-3 gap-4">
            {/* Job */}
            <div>
              <div className="text-sm font-semibold mb-2">Job</div>
              <div className="flex flex-wrap gap-2">
                {roleJobs.map((j) => (
                  <Pill key={j} selected={ch.job === j} onClick={() => setCh({ ...ch, job: j })}>
                    {j}
                  </Pill>
                ))}
              </div>
            </div>

            {/* Catchphrase */}
            <div>
              <div className="text-sm font-semibold mb-2">Catchphrase</div>
              <div className="flex flex-wrap gap-2">
                {roleCatchphrases.map((c) => (
                  <Pill key={c} selected={ch.catchphrase === c} onClick={() => setCh({ ...ch, catchphrase: c })}>
                    {c}
                  </Pill>
                ))}
              </div>
            </div>

            {/* Flaw */}
            <div>
              <div className="text-sm font-semibold mb-2">Flaw</div>
              <div className="flex flex-wrap gap-2">
                {roleFlaws.map((f) => (
                  <Pill key={f} selected={ch.flaw === f} onClick={() => setCh({ ...ch, flaw: f })}>
                    {f}
                  </Pill>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button className="px-4 py-2 rounded border" onClick={() => setStep(2)}>
              Back
            </button>
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={!canNextFromPersonal}
              onClick={() => setStep(4)}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section>
          <StepHeader title="Choose Feats" subtitle="Only feats allowed by your Role or Trope are shown." />
          <div className="grid sm:grid-cols-2 gap-3">
            {allowedFeats.map((f) => {
              const selected = ch.feats.includes(f.name);
              const source =
                (ch.trope?.feat_options?.includes(f.name) || ch.trope?.feats?.includes(f.name)) ? "Trope"
                : (ch.role?.feat_options?.includes(f.name) || ch.role?.feats?.includes(f.name)) ? "Role"
                : "";
              return (
                <div key={f.name} className={`border rounded p-3 ${selected ? "border-blue-600" : "border-slate-300"}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{f.name}</div>
                    {source && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border">{source}</span>}
                  </div>
                  {f.text && <div className="text-xs opacity-80 mt-1">{f.text}</div>}
                  <div className="mt-2">
                    <Pill
                      selected={selected}
                      onClick={() => setCh({ ...ch, feats: toggleInArray(ch.feats, f.name) })}
                    >
                      {selected ? "Remove" : "Add"}
                    </Pill>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-between">
            <button className="px-4 py-2 rounded border" onClick={() => setStep(3)}>
              Back
            </button>
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={!canNextFromFeats}
              onClick={() => setStep(5)}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section>
          <StepHeader title="Choose Gear" subtitle="Only gear allowed by your Role is shown." />
          <div className="grid sm:grid-cols-2 gap-3">
            {allowedGear.map((g) => {
              const selected = ch.gear.includes(g.name);
              return (
                <div key={g.name} className={`border rounded p-3 ${selected ? "border-blue-600" : "border-slate-300"}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{g.name}</div>
                  </div>
                  {g.text && <div className="text-xs opacity-80 mt-1">{g.text}</div>}
                  <div className="mt-2">
                    <Pill
                      selected={selected}
                      onClick={() => setCh({ ...ch, gear: toggleInArray(ch.gear, g.name) })}
                    >
                      {selected ? "Remove" : "Add"}
                    </Pill>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-between">
            <button className="px-4 py-2 rounded border" onClick={() => setStep(4)}>
              Back
            </button>
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white"
              onClick={() => setStep(6)}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 6 && (
        <section>
          <StepHeader title="Review & Save" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="border rounded p-3">
              <div><span className="opacity-70">Name:</span> {ch.name || "—"}</div>
              <div><span className="opacity-70">Age:</span> {ch.age || "—"}</div>
              <div><span className="opacity-70">Role:</span> {ch.role?.name || "—"}</div>
              <div><span className="opacity-70">Trope:</span> {ch.trope?.name || "—"}</div>
              {ch.trope?.attribute_options?.length ? (
                <div><span className="opacity-70">Trope Attribute:</span> {ch.tropeAttribute || "—"}</div>
              ) : null}
            </div>

            <div className="border rounded p-3">
              <div><span className="opacity-70">Job:</span> {ch.job || "—"}</div>
              <div><span className="opacity-70">Catchphrase:</span> {ch.catchphrase || "—"}</div>
              <div><span className="opacity-70">Flaw:</span> {ch.flaw || "—"}</div>
              <div className="mt-2"><span className="opacity-70">Feats:</span> {ch.feats.join(", ") || "—"}</div>
              <div className="mt-1"><span className="opacity-70">Gear:</span> {ch.gear.join(", ") || "—"}</div>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button className="px-4 py-2 rounded border" onClick={() => setStep(5)}>
              Back
            </button>
            <button
              className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
              disabled={saving}
              onClick={onSave}
            >
              {saving ? "Saving..." : "Save Character"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
