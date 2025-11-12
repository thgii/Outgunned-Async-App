import { useEffect, useState, useRef } from "react";
import { api, uploadImage } from "../lib/api";

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
  // tags?: string | null; // removed
  rightHand?: string | null;
  strongSpots?: string | null;
  weakSpots?: string | null;
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
      // Force Boss on create
      const created = await api.post(`/campaigns/${campaignId}/villains`, {
        name: "New Villain",
        type: "boss",
        gritMax: 6,
        grit: 6,
        rightHand: "",
        strongSpots: "",
        weakSpots: "",
        bio: "",
        ...v,
      });
      setVillains((prev) => [...prev, created]);
    } finally {
      setSaving(false);
    }
  }

  async function update(id: string, patch: Partial<Villain>) {
    setSaving(true);
    try {
      // Always enforce boss type server-side too
      const updated = await api.patch(`/campaigns/${campaignId}/villains/${id}`, {
        ...patch,
        type: "boss",
      });
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
        <div className="flex items-center gap-2">
          <div className="font-bold text-lg">😈 Villains</div>

          {/* Tooltip */}
          <div className="relative group">
            <button
              type="button"
              aria-label="Villain rules"
              className="w-5 h-5 rounded-full text-xs border border-slate-500 text-slate-300 hover:text-white hover:border-slate-400"
              tabIndex={0}
            >
              ?
            </button>
            <div
              className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100
                         absolute z-20 left-1/2 -translate-x-1/2 mt-2 w-[28rem] max-w-[90vw] text-left rounded-lg border border-slate-600
                         bg-slate-900/95 shadow-xl p-3 transition duration-150"
            >
              <div className="text-slate-200 text-sm leading-snug space-y-2">
                <p>
                  The Villain can only lose during the Showdown and can’t be defeated in earlier Shots. A Villain can
                  meet their bitter end during a Turning Point, only to get replaced by another, stronger and eviler
                  than them.
                </p>
                <ul className="list-none space-y-1">
                  <li>♦ All rolls against a Villain are made with -1, unless you are in a Showdown.</li>
                  <li>♦ You can't spend a Spotlight to hurt, capture, or swindle the Villain, unless you are in a Showdown.</li>
                  <li>♦ Not all Villains are fearsome Enemies in combat. Those who aren’t can rely on a right hand who is ready to make your life difficult.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {isDirector && (
          <button
            className="px-2 py-1 text-sm rounded bg-emerald-600 hover:bg-emerald-500"
            onClick={() => create({})}
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleUpload(file: File) {
    const url = await uploadImage(file); // expects your api helper to return { url } or the URL string
    const finalUrl = (url as any)?.url ?? (url as any);
    if (finalUrl) onChange({ portraitUrl: finalUrl });
  }

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
          {/* Type is fixed to Boss */}
          <StaticField label="Enemy Type" value="Boss" />

          <Field
            label="Right Hand"
            value={v.rightHand ?? ""}
            editable={editable}
            onChange={(val) => onChange({ rightHand: val || null })}
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

          {/* Upload portrait (replaces URL entry) */}
          <label className="flex flex-col col-span-2">
            <span className="text-xs text-slate-400 mb-1">Portrait</span>
            {editable ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
                >
                  Upload Portrait
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
                <div className="text-xs text-slate-400 truncate">
                  {v.portraitUrl ? "Uploaded" : "No file selected"}
                </div>
              </div>
            ) : (
              <div>{v.portraitUrl ? "Uploaded" : <span className="text-slate-500">(none)</span>}</div>
            )}
          </label>
        </div>

        {/* Strong / Weak Spots */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-400">Strong Spots</span>
            {editable ? (
              <textarea
                value={v.strongSpots ?? ""}
                onChange={(e) => onChange({ strongSpots: e.target.value || null })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 min-h-[80px]"
                placeholder="What makes the Villain formidable…"
              />
            ) : (
              <div className="text-sm whitespace-pre-wrap">{v.strongSpots || <span className="text-slate-500">(none)</span>}</div>
            )}
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-400">Weak Spots</span>
            {editable ? (
              <textarea
                value={v.weakSpots ?? ""}
                onChange={(e) => onChange({ weakSpots: e.target.value || null })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 min-h-[80px]"
                placeholder="Cracks in their armor, exploitable flaws…"
              />
            ) : (
              <div className="text-sm whitespace-pre-wrap">{v.weakSpots || <span className="text-slate-500">(none)</span>}</div>
            )}
          </div>
        </div>

        {/* Bio / notes */}
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
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            {select.map(([v, lab]) => (
              <option key={v} value={v} className="text-white bg-slate-900">
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

function StaticField({ label, value }: { label: string; value: string }) {
  return (
    <label className="flex flex-col">
      <span className="text-xs text-slate-400 mb-1">{label}</span>
      <div>{value}</div>
    </label>
  );
}
