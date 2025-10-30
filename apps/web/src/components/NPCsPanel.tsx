import { useEffect, useMemo, useState } from 'react';
import { listNpcs, createNpc, updateNpc, deleteNpc, uploadImage } from "../lib/api";

type NpcSide = 'ally' | 'enemy';
type EnemyType = 'goon' | 'bad_guy' | 'boss';
type Level3 = 'Basic' | 'Critical' | 'Extreme';

type Npc = {
  id: string;
  campaignId: string;
  name: string;
  side: NpcSide;
  portraitUrl?: string | null;

  // allies
  brawn?: number | null;
  nerves?: number | null;
  smooth?: number | null;
  focus?: number | null;
  crime?: number | null;
  allyGrit?: number | null;

  // enemies
  enemyType?: EnemyType | null;
  enemyGritMax?: number | null;
  enemyGrit?: number | null;
  attackLevel?: Level3 | null;
  defenseLevel?: Level3 | null;
  weakSpot?: string | null;
  weakSpotDiscovered?: boolean;
  featPoints?: number | null;
};

export function NPCsPanel({
  campaignId,
  isDirector,
}: {
  campaignId: string;
  isDirector: boolean;
}) {
  const [list, setList] = useState<Npc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSide, setFilterSide] = useState<NpcSide | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listNpcs(campaignId);
      setList(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [campaignId]);

  const filtered = useMemo(() => {
    if (filterSide === 'all') return list;
    return list.filter(n => n.side === filterSide);
  }, [list, filterSide]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Characters</h2>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1"
            value={filterSide}
            onChange={e => setFilterSide(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="ally">Allies</option>
            <option value="enemy">Enemies</option>
          </select>
          {isDirector && (
            <button
              className="rounded px-3 py-1 bg-blue-600 text-white"
              onClick={() => setModalOpen(true)}
            >
              + Add Character
            </button>
          )}
        </div>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(n => (
          <NpcCard
            key={n.id}
            npc={n}
            isDirector={isDirector}
            onGritChange={async (v) => {
              // ally or enemy grit
              if (n.side === 'ally') {
                await updateNpc(campaignId, n.id, { allyGrit: v });
              } else {
                await updateNpc(campaignId, n.id, { enemyGrit: v });
              }
              refresh();
            }}
            onToggleDiscovered={async (v) => {
              await updateNpc(campaignId, n.id, { weakSpotDiscovered: v });
              refresh();
            }}
            onDelete={async () => {
              if (!confirm(`Delete ${n.name}?`)) return;
              await deleteNpc(campaignId, n.id);
              refresh();
            }}
          />
        ))}
      </div>

      {isDirector && modalOpen && (
        <NpcWizardModal
          onClose={() => setModalOpen(false)}
          onCreated={() => { setModalOpen(false); refresh(); }}
          campaignId={campaignId}
        />
      )}
    </section>
  );
}

function NpcCard({
  npc, isDirector, onGritChange, onToggleDiscovered, onDelete
}: {
  npc: Npc;
  isDirector: boolean;
  onGritChange: (v: number) => void;
  onToggleDiscovered: (v: boolean) => void;
  onDelete: () => void;
}) {
  const isAlly = npc.side === 'ally';
  const gritMax = isAlly ? 3 : (npc.enemyGritMax ?? 0);
  const gritVal = isAlly ? (npc.allyGrit ?? 0) : (npc.enemyGrit ?? 0);

  return (
    <div className="rounded border p-3 bg-white/60">
      <div className="flex items-center gap-3">
        <img
          src={npc.portraitUrl || 'https://placehold.co/64x64?text=NPC'}
          className="h-16 w-16 object-cover rounded"
          alt=""
        />
        <div className="flex-1">
          <div className="font-semibold">{npc.name}</div>
          <div className="text-xs text-slate-600">
            {npc.side === 'ally' ? 'Ally' : `Enemy • ${npc.enemyType}`}
          </div>
        </div>
        {isDirector && (
          <button className="text-red-600 text-sm" onClick={onDelete}>Delete</button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm">Grit:</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: gritMax }).map((_, i) => {
            const filled = i < gritVal;
            return (
              <button
                key={i}
                className={`h-4 w-4 rounded border ${filled ? 'bg-slate-900' : 'bg-white'}`}
                onClick={() => onGritChange(filled ? i : i + 1)}
                title={filled ? `Set to ${i}` : `Set to ${i + 1}`}
                disabled={!isDirector}
              />
            );
          })}
        </div>
      </div>

      {isAlly ? (
        <div className="mt-3 grid grid-cols-5 gap-1 text-xs">
          {[
            ['Brawn', npc.brawn],
            ['Nerves', npc.nerves],
            ['Smooth', npc.smooth],
            ['Focus', npc.focus],
            ['Crime', npc.crime],
          ].map(([k, v]) => (
            <div key={k as string} className="flex flex-col items-center p-1 rounded bg-slate-50 border">
              <div className="font-medium">{k}</div>
              <div>{v ?? '-'}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-1 text-sm">
          <div>Attack: <strong>{npc.attackLevel}</strong></div>
          <div>Defense: <strong>{npc.defenseLevel}</strong></div>
          <div>Feat Points: <strong>{npc.featPoints ?? '-'}</strong></div>
          <div className="flex items-center gap-2">
            <span>Weak Spot:</span>
            <span className="italic">
              {npc.weakSpot ? npc.weakSpot : <span className="text-slate-500">Hidden</span>}
            </span>
            {isDirector && (
              <label className="ml-auto text-xs inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={!!npc.weakSpotDiscovered}
                  onChange={e => onToggleDiscovered(e.target.checked)}
                />
                Discovered
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NpcWizardModal({
  campaignId, onClose, onCreated
}: {
  campaignId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [side, setSide] = useState<NpcSide>('ally');
  const [name, setName] = useState('');
  const [portrait, setPortrait] = useState<File | null>(null);

  // Ally fields
  const [brawn, setBrawn] = useState(3);
  const [nerves, setNerves] = useState(3);
  const [smooth, setSmooth] = useState(3);
  const [focus, setFocus] = useState(3);
  const [crime, setCrime] = useState(3);

  // Enemy fields
  const [enemyType, setEnemyType] = useState<EnemyType>('goon');
  const [enemyGritMax, setEnemyGritMax] = useState(1);
  const [attackLevel, setAttackLevel] = useState<Level3>('Basic');
  const [defenseLevel, setDefenseLevel] = useState<Level3>('Basic');
  const [weakSpot, setWeakSpot] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function NumberPicker({ label, value, set, min, max }:{
    label:string; value:number; set:(n:number)=>void; min:number; max:number;
  }) {
    return (
      <label className="flex items-center justify-between gap-3 text-black">
        <span>{label}</span>
        <input
          type="number"
          className="w-20 border rounded px-2 py-1"
          value={value}
          min={min}
          max={max}
          onChange={e => set(parseInt(e.target.value || '0', 10))}
        />
      </label>
    );
  }

  async function handleCreate() {
    setSaving(true);
    try {
      let portraitUrl: string | undefined;
      if (portrait) {
        const { url } = await uploadImage(portrait); // reuse your existing image upload
        portraitUrl = url;
      }

      if (side === 'ally') {
        await createNpc(campaignId, {
          name, side, portraitUrl,
          brawn, nerves, smooth, focus, crime,
          allyGrit: 0,
        });
      } else {
        await createNpc(campaignId, {
          name, side, portraitUrl,
          enemyType, enemyGritMax, enemyGrit: 0,
          attackLevel, defenseLevel, weakSpot, weakSpotDiscovered: false,
        });
      }
      onCreated();
    } catch (e: any) {
      setError(e.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-lg bg-white rounded shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-black">New Character</h3>
          <button onClick={onClose} className="text-slate-600">✕</button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <div className="text-sm mb-1 text-black">Portrait</div>
            <input type="file" accept="image/*" onChange={e => setPortrait(e.target.files?.[0] ?? null)} />
          </label>
          <label className="block">
            <div className="text-sm mb-1 text-black">Name</div>
            <input className="w-full border rounded px-3 py-2" value={name} onChange={e => setName(e.target.value)} />
          </label>

          <label className="block">
            <div className="text-sm mb-1 text-black">Side</div>
            <select className="w-full border rounded px-3 py-2" value={side} onChange={e => setSide(e.target.value as NpcSide)}>
              <option value="ally">Ally</option>
              <option value="enemy">Enemy</option>
            </select>
          </label>

          {side === 'ally' ? (
            <div className="space-y-2" >
              <NumberPicker label="Brawn"  value={brawn}  set={setBrawn}  min={3} max={5} />
              <NumberPicker label="Nerves" value={nerves} set={setNerves} min={3} max={5} />
              <NumberPicker label="Smooth" value={smooth} set={setSmooth} min={3} max={5} />
              <NumberPicker label="Focus"  value={focus}  set={setFocus}  min={3} max={5} />
              <NumberPicker label="Crime"  value={crime}  set={setCrime}  min={3} max={5} />
              <div className="text-xs text-slate-600">Allies start with 3 grit boxes; you can tick them from the list.</div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block">
                <div className="text-sm mb-1 text-black">Enemy Type</div>
                <select className="w-full border rounded px-3 py-2" value={enemyType} onChange={e => setEnemyType(e.target.value as EnemyType)}>
                  <option value="goon">Goon</option>
                  <option value="bad_guy">Bad Guy</option>
                  <option value="boss">Boss</option>
                </select>
              </label>
              <NumberPicker label="Grit Boxes (max)" value={enemyGritMax} set={setEnemyGritMax} min={1} max={999} />
              <label className="flex items-center justify-between gap-3 text-black">
                <span>Attack</span>
                <select className="border rounded px-2 py-1" value={attackLevel} onChange={e => setAttackLevel(e.target.value as Level3)}>
                  <option>Basic</option><option>Critical</option><option>Extreme</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-3 text-black">
                <span>Defense</span>
                <select className="border rounded px-2 py-1" value={defenseLevel} onChange={e => setDefenseLevel(e.target.value as Level3)}>
                  <option>Basic</option><option>Critical</option><option>Extreme</option>
                </select>
              </label>
              <label className="block">
                <div className="text-sm mb-1 text-black">Weak Spot</div>
                <input className="w-full border rounded px-3 py-2" value={weakSpot} onChange={e => setWeakSpot(e.target.value)} />
              </label>
              <div className="text-xs text-slate-600">Feat Points will auto-set by type (1/3/5).</div>
            </div>
          )}

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button className="px-3 py-1 rounded border text-black" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
