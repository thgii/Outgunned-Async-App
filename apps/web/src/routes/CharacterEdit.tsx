import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CharacterForm from "../components/CharacterForm";
import { api } from "../lib/api";
import {
  characterSchema,
  type CharacterDTO,
} from "@action-thread/types";

// Rebuild a canonical DTO from a row returned by the API.
// Your GET /characters/:id already JSON.parse's attributes, skills, resources, feats, gear, conditions.
function toDTO(row: any): CharacterDTO {
  // row.resources may contain grit, adrenaline, spotlight, luck, youLookSelected, isBroken, deathRoulette, cash
  const resources = row.resources ?? {};
  const attributes = row.attributes ?? { brawn:0, nerves:0, smooth:0, focus:0, crime:0 };
  const skills = row.skills ?? {
    endure:0, fight:0, force:0, stunt:0,
    cool:0, drive:0, shoot:0, survival:0,
    flirt:0, leadership:0, speech:0, style:0,
    detect:0, fix:0, heal:0, know:0,
    awareness:0, dexterity:0, stealth:0, streetwise:0
  };
  const storage = row.gear ?? { backpack:[], bag:[], gunsAndGear:[] };

  // Parse through schema to apply defaults / validation
  return characterSchema.parse({
    id: row.id,
    name: row.name ?? "",
    role: row.role ?? "",
    trope: row.trope ?? "",
    jobOrBackground: row.job ?? "",
    age: row.age ?? "Adult",
    catchphrase: row.catchphrase ?? "",
    flaw: row.flaw ?? "",
    attributes,
    skills,
    grit: resources.grit ?? { current:6, max:6 },
    adrenaline: resources.adrenaline ?? 0,
    spotlight: resources.spotlight ?? 0,
    luck: resources.luck ?? 0,
    youLookSelected: resources.youLookSelected ?? row.conditions ?? [],
    isBroken: resources.isBroken ?? false,
    deathRoulette: resources.deathRoulette ?? [false,false,false,false,false,false],
    cash: resources.cash ?? 1,
    storage,
    ride: row.ride ?? { name: "", speed: 0, armor: 0, tags: [] },
    feats: row.feats ?? [],
    missionOrTreasure: row.notes ?? "",
    achievementsBondsScarsReputations: row.achievementsBondsScarsReputations ?? "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export default function CharacterEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const [initial, setInitial] = useState<CharacterDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load existing row
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const row = await api(`/characters/${id}`);
        if (!alive) return;
        const dto = toDTO(row);
        setInitial(dto);
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load character");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  async function save(dto: CharacterDTO) {
    // PATCH back to the worker; it validates & maps columns server-side
    await api(`/characters/${id}`, { method: "PATCH", json: dto });
    nav(`/characters/${id}`);
  }

  const content = useMemo(() => {
    if (loading) return <div className="p-6">Loading…</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;
    if (!initial) return <div className="p-6">No data</div>;
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Edit Character</h1>
          <button
            onClick={() => nav(`/characters/${id}`)}
            className="text-sm underline"
          >
            Cancel
          </button>
        </div>
        <CharacterForm initial={initial} onSubmit={save} />
      </>
    );
  }, [loading, error, initial, id, nav]);

  return <div className="max-w-4xl mx-auto p-6">{content}</div>;
}
