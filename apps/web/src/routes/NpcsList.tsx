// apps/web/src/routes/NpcsList.tsx
import { useEffect, useState, useRef } from "react";
import { api, uploadImage } from "../lib/api";

type NpcTemplate = {
  id: string;
  name: string;
  side: "ally" | "enemy";
  enemyType?: "goon" | "bad_guy" | "boss" | null;
  portraitUrl?: string | null;
};

type Side = "ally" | "enemy";
type EnemyType = "goon" | "bad_guy" | "boss";
type Level3 = "Basic" | "Critical" | "Extreme";

type NewNpcForm = {
  name: string;
  side: Side;

  // Ally fields
  brawn: number;
  nerves: number;
  smooth: number;
  focus: number;
  crime: number;
  allyGrit: number;
  help: string;
  flaw: string;

  // Enemy fields
  enemyType: EnemyType;
  enemyGritMax: number;
  attackLevel: Level3;
  defenseLevel: Level3;
  weakSpot: string;
};

const defaultForm: NewNpcForm = {
  name: "",
  side: "enemy",

  brawn: 3,
  nerves: 3,
  smooth: 3,
  focus: 3,
  crime: 3,
  allyGrit: 1,
  help: "",
  flaw: "",

  enemyType: "goon",
  enemyGritMax: 6,
  attackLevel: "Basic",
  defenseLevel: "Basic",
  weakSpot: "",
};

export default function NpcsList() {
  const [templates, setTemplates] = useState<NpcTemplate[]>([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState<NewNpcForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);


  // portrait upload
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);

  // Load existing templates
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api("/npc-templates");
        if (!alive) return;
        const arr: NpcTemplate[] = Array.isArray(res) ? res : res?.results ?? [];
        setTemplates(arr);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load NPC templates.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function update<K extends keyof NewNpcForm>(key: K, value: NewNpcForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onPortraitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setPortraitFile(file);

    if (portraitPreview) {
      URL.revokeObjectURL(portraitPreview);
    }

    if (file) {
      const url = URL.createObjectURL(file);
      setPortraitPreview(url);
    } else {
      setPortraitPreview(null);
    }
  }

  async function onCreateTemplate(e: React.FormEvent) {
    e.preventDefault();

    if (saving) return; // prevent double-submit
    setSaving(true);
    setFormError(null);

    const name = form.name.trim();
    if (!name) {
      setFormError("Name is required.");
      setSaving(false);
      return;
    }

    const payload: any = {
      name,
      side: form.side,
    };

    try {
      // Upload portrait if present
      if (portraitFile) {
        const { url } = await uploadImage(portraitFile);
        payload.portraitUrl = url;
      }

      if (form.side === "ally") {
        payload.brawn = Number(form.brawn);
        payload.nerves = Number(form.nerves);
        payload.smooth = Number(form.smooth);
        payload.focus = Number(form.focus);
        payload.crime = Number(form.crime);
        payload.allyGrit = Number(form.allyGrit);
        if (form.help.trim()) payload.help = form.help.trim();
        if (form.flaw.trim()) payload.flaw = form.flaw.trim();
      } else {
        payload.enemyType = form.enemyType;
        payload.enemyGritMax = Number(form.enemyGritMax);
        payload.attackLevel = form.attackLevel;
        payload.defenseLevel = form.defenseLevel;
        if (form.weakSpot.trim()) payload.weakSpot = form.weakSpot.trim();
      }

      const created = await api("/npc-templates", {
        method: "POST",
        json: payload,
      });

      const tpl: NpcTemplate =
        created && typeof created === "object"
          ? {
              id: created.id,
              name: created.name,
              side: created.side,
              enemyType: created.enemyType ?? null,
              portraitUrl: created.portraitUrl ?? null,
            }
          : created;

      setTemplates((prev) => [...prev, tpl]);
      setForm(defaultForm);
      // clear portrait state
      if (portraitPreview) {
        URL.revokeObjectURL(portraitPreview);
      }
      setPortraitFile(null);
      setPortraitPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // clear portrait state
      if (portraitPreview) {
        URL.revokeObjectURL(portraitPreview);
      }
      setPortraitFile(null);
      setPortraitPreview(null);
    } catch (e: any) {
      setFormError(e?.message || "Failed to create NPC template.");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteTemplate(id: string) {
    const tpl = templates.find((t) => t.id === id);
    const name = tpl?.name ?? "this NPC";

    if (!confirm(`Delete "${name}" from your NPC Library? This cannot be undone.`)) {
      return;
    }

    try {
      await api(`/npc-templates/${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e: any) {
      alert(e?.message || "Failed to delete NPC template.");
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">NPC Library</h1>
      </div>

      {/* Create NPC Template */}
      <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/70 p-4">
        <h2 className="text-xl font-semibold mb-3">Create NPC</h2>

        <form onSubmit={onCreateTemplate} className="space-y-3">
          {/* Name + Side */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-sm mb-1">Name*</label>
              <input
                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </div>

            <div className="w-full sm:w-40">
              <label className="block text-sm mb-1">Side*</label>
              <select
                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white text-sm"
                value={form.side}
                onChange={(e) =>
                  update("side", e.target.value as Side)
                }
              >
                <option value="ally" className="text-white bg-slate-800">
                  Ally
                </option>
                <option value="enemy" className="text-white bg-slate-800">
                  Enemy
                </option>
              </select>
            </div>
          </div>

          {/* Portrait upload */}
          <div>
            <label className="block text-sm mb-1">Portrait (optional)</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={onPortraitChange}
                ref={fileInputRef}
                className="text-sm"
              />
              {portraitPreview && (
                <div className="w-12 h-12 rounded overflow-hidden border border-slate-600">
                  <img
                    src={portraitPreview}
                    alt="Portrait preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Ally fields */}
          {form.side === "ally" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Attributes (3–5)*</label>
                <div className="grid grid-cols-5 gap-2">
                  {(["brawn", "nerves", "smooth", "focus", "crime"] as const).map(
                    (key) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-xs mb-0.5 capitalize">{key}</span>
                        <input
                          type="number"
                          min={3}
                          max={5}
                          className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                          value={form[key]}
                          onChange={(e) =>
                            update(
                              key,
                              Number(e.target.value || 0) as any
                            )
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="flex gap-3 items-end">
                <div>
                  <label className="block text-sm mb-1">Grit (0–3)*</label>
                  <input
                    type="number"
                    min={0}
                    max={3}
                    className="w-20 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                    value={form.allyGrit}
                    onChange={(e) =>
                      update("allyGrit", Number(e.target.value || 0))
                    }
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Help (optional)</label>
                  <textarea
                    rows={2}
                    className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
                    value={form.help}
                    onChange={(e) => update("help", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Flaw (optional)</label>
                  <textarea
                    rows={2}
                    className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
                    value={form.flaw}
                    onChange={(e) => update("flaw", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Enemy fields */}
          {form.side === "enemy" && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:w-40">
                  <label className="block text-sm mb-1">Enemy Type*</label>
                  <select
                    className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white text-sm"
                    value={form.enemyType}
                    onChange={(e) =>
                      update("enemyType", e.target.value as EnemyType)
                    }
                  >
                    <option value="goon" className="text-white bg-slate-800">
                      Goon
                    </option>
                    <option value="bad_guy" className="text-white bg-slate-800">
                      Bad Guy
                    </option>
                    <option value="boss" className="text-white bg-slate-800">
                      Boss
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Grit Max*</label>
                  <input
                    type="number"
                    min={1}
                    className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                    value={form.enemyGritMax}
                    onChange={(e) =>
                      update("enemyGritMax", Number(e.target.value || 1))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:w-40">
                  <label className="block text-sm mb-1">Attack Level*</label>
                  <select
                    className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white text-sm"
                    value={form.attackLevel}
                    onChange={(e) =>
                      update("attackLevel", e.target.value as Level3)
                    }
                  >
                    <option value="Basic" className="text-white bg-slate-800">
                      Basic
                    </option>
                    <option value="Critical" className="text-white bg-slate-800">
                      Critical
                    </option><option value="Extreme" className="text-white bg-slate-800">
                      Extreme
                    </option>
                  </select>
                </div>

                <div className="w-full sm:w-40">
                  <label className="block text-sm mb-1">Defense Level*</label>
                  <select
                    className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white text-sm"
                    value={form.defenseLevel}
                    onChange={(e) =>
                      update("defenseLevel", e.target.value as Level3)
                    }
                  >
                    <option value="Basic" className="text-white bg-slate-800">
                      Basic
                    </option>
                    <option value="Critical" className="text-white bg-slate-800">
                      Critical
                    </option><option value="Extreme" className="text-white bg-slate-800">
                      Extreme
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Weak Spot*
                </label>
                <input
                  className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
                  value={form.weakSpot}
                  onChange={(e) => update("weakSpot", e.target.value)}
                />
              </div>
            </div>
          )}

          {formError && (
            <div className="text-sm text-red-400">{formError}</div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create NPC"}
          </button>
        </form>
      </div>

      {err && <div className="text-red-400 text-center mb-3">{err}</div>}

      {/* Existing templates */}
      {!templates.length ? (
        <div className="text-center opacity-70">
          <p>No NPCs yet.</p>
          <p className="mt-2 text-sm">
            Use the form above to create reusable allies and enemies you can drop into campaigns.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="border border-slate-700 rounded p-3 flex gap-3 items-start bg-slate-900/70"
            >
              <div className="w-16 h-16 rounded overflow-hidden bg-slate-800 flex items-center justify-center text-xs">
                {t.portraitUrl ? (
                  <img
                    src={t.portraitUrl}
                    alt={t.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{t.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg">{t.name}</div>
                <div className="text-xs text-slate-400 mb-1">
                  {t.side === "ally" ? "Ally" : "Enemy"}
                  {t.enemyType ? ` — ${t.enemyType.replace("_", " ")}` : ""}
                </div>
              </div>
              <button
                onClick={() => onDeleteTemplate(t.id)}
                className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
