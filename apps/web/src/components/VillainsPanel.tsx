import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Villain = {
  id: string;
  campaignId: string;
  name: string;
  type?: "goon" | "bad_guy" | "boss" | null;
  portraitUrl?: string | null;
  gritMax?: number | null;
  grit?: number | null;
  attackLevel?: "Basic" | "Critical" | "Extreme" | null;
  defenseLevel?: "Basic" | "Critical" | "Extreme" | null;
  tags?: string | null;
  bio?: string | null;
  data?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export function VillainsPanel({
  campaignId,
  isDirector = false,
}: {
  campaignId: string;
  isDirector?: boolean;
}) {
  const [villains, setVillains] = useState<Villain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/campaigns/${campaignId}/villains`);
      setVillains(res ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [campaignId]);

  async function create(v: Partial<Villain>) {
    setSaving(true);
    try {
      const created = await api.post(`/campaigns/${campaignId}/villains`, v);
      setVillains((prev) => [...prev, created]);
    } finally {
      setSaving(false);
    }
  }

  async function update(id: string, patch: Partial<Villain>) {
    setSaving(true);
    try {
      const updated = await api.patch(`/campaigns/${campaignId}/villains/${id}`, patch);
      setVillains((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setSaving(true);
    try {
      await api.delete(`/campaigns/${campaignId}/villains/${id}`);
      setVillains((prev) => prev.filter((x) => x.id !== id));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-lg">😈 Villains</div>
        {isDirector && (
          <button
            className="px-2 py-1 text-sm rounded bg-emerald-600 hover:bg-emerald-500"
            onClick={() =>
              create({ name: "New Villain", type: "bad_guy", gritMax: 6, grit: 6 })
            }
          >
            + Add Villain
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-slate-300 text-sm">loading…</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {villains.map((v) => (
            <VillainCard
              key={v.id}
              v={v}
              editable={isDirector}
              onChange={(patch) => update(v.id, patch)}
              onDelete={() => remove(v.id)}
            />
          ))}
          {villains.length === 0 && (
            <div className="text-slate-400 text-sm">No villains yet.</div>
          )}
        </div>
      )}

      {saving && <div className="text-xs text-slate-400 mt-2">saving…</div>}
    </div>
  );
}

function VillainCard({
  v,
  editable,
  onChange,
  onDelete,
}: {
  v: Villain;
  editable: boolean;
  onChange: (patch: Partial<Villain>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-700 p-3 flex gap-3">
      <img
        src={v.portraitUrl || "/placeholder-avatar.png"}
        alt={v.name}
        className="w-16 h-16 rounded object-cover border border-slate-700"
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          {editable ? (
            <input
              className="bg-transparent border-b border-slate-600 focus:outline-none px-1 font-semibold"
              value={v.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          ) : (
            <div className="font-semibold">{v.name}</div>
          )}
          {editable && (
            <button
              onClick={onDelete}
              className="text-xs text-red-300 hover:text-red-200"
            >
              Remove
            </button>
          )}
        </div>

        <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
          <Field
            label="Type"
            value={v.type ?? ""}
            editable={editable}
            onChange={(val) =>
              onChange({ type: (val as Villain["type"]) || null })
            }
            select={[
              ["", "(none)"],
              ["goon", "Goon"],
              ["bad_guy", "Bad Guy"],
              ["boss", "Boss"],
            ]}
          />
          <Field
            label="Tags"
            value={v.tags ?? ""}
            editable={editable}
            onChange={(val) => onChange({ tags: val || null })}
          />
          <Field
            label="Attack"
            value={v.attackLevel ?? ""}
            editable={editable}
            onChange={(val) =>
              onChange({ attackLevel: (val as Villain["attackLevel"]) || null })
            }
            select={[
              ["", "(none)"],
              ["Basic", "Basic"],
              ["Critical", "Critical"],
              ["Extreme", "Extreme"],
            ]}
          />
          <Field
            label="Defense"
            value={v.defenseLevel ?? ""}
            editable={editable}
            onChange={(val) =>
              onChange({
                defenseLevel: (val as Villain["defenseLevel"]) || null,
              })
            }
            select={[
              ["", "(none)"],
              ["Basic", "Basic"],
              ["Critical", "Critical"],
              ["Extreme", "Extreme"],
            ]}
          />

          <Field
            label="Grit"
            value={String(v.grit ?? "")}
            type="number"
            editable={editable}
            onChange={(val) => onChange({ grit: val ? Number(val) : null })}
          />
          <Field
            label="Grit Max"
            value={String(v.gritMax ?? "")}
            type="number"
            editable={editable}
            onChange={(val) => onChange({ gritMax: val ? Number(val) : null })}
          />

          <Field
            label="Portrait URL"
            value={v.portraitUrl ?? ""}
            editable={editable}
            onChange={(val) => onChange({ portraitUrl: val || null })}
            full
          />
        </div>

        <div className="mt-2">
          {editable ? (
            <textarea
              value={v.bio ?? ""}
              onChange={(e) => onChange({ bio: e.target.value || null })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 min-h-[80px]"
              placeholder="Villain bio / moves / threats…"
            />
          ) : (
            <div className="text-sm whitespace-pre-wrap">{v.bio}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  editable,
  type,
  select,
  full = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  editable: boolean;
  type?: "text" | "number";
  select?: Array<[string, string]>;
  full?: boolean;
}) {
  return (
    <label className={`flex flex-col ${full ? "col-span-2" : ""}`}>
      <span className="text-xs text-slate-400 mb-1">{label}</span>
      {editable ? (
        select ? (
          <select
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            {select.map(([v, lab]) => (
              <option key={v} value={v}>
                {lab}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type ?? "text"}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      ) : (
        <div>{value || <span className="text-slate-500">(none)</span>}</div>
      )}
    </label>
  );
}
