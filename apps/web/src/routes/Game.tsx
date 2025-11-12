import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ChatBox from "../components/ChatBox";
import DiceRoller from "../components/DiceRoller";
import { SceneBoard } from "../components/SceneBoard";
import GMControls from "../components/GMControls";
import { api } from "../lib/api";
import CharacterMiniPanel from "../components/CharacterMiniPanel";
import { NPCsPanel } from "../components/NPCsPanel";

type GameRow = {
  id: string;
  campaignId: string;
  title?: string;
  name?: string;
  summary?: string | null;
};

type Me = { id: string } | null;
type RoleResp = { role?: "director" | "hero" };

export default function Game() {
  const { id } = useParams();
  const gameId = id!;
  const [game, setGame] = useState<GameRow | null>(null);
  const [me, setMe] = useState<Me>(null);
  const [isDirector, setIsDirector] = useState(false);
  const [heroes, setHeroes] = useState<any[]>([]);
  const [myHero, setMyHero] = useState<any | null>(null);

  // NEW: local picker state for which ability to roll + a simple modifier
  type Attr = "Brawn" | "Nerves" | "Smooth" | "Focus" | "Crime";
  type Skill =
    | "Endure" | "Fight" | "Force" | "Stunt"
    | "Cool" | "Drive" | "Shoot" | "Survival"
    | "Flirt" | "Leadership" | "Speech" | "Style"
    | "Detect" | "Fix" | "Heal" | "Know"
    | "Awareness" | "Dexterity" | "Stealth" | "Streetwise";

  const ATTRS: Attr[] = ["Brawn","Nerves","Smooth","Focus","Crime"];
  const SKILLS: Skill[] = [
    "Endure","Fight","Force","Stunt",
    "Cool","Drive","Shoot","Survival",
    "Flirt","Leadership","Speech","Style",
    "Detect","Fix","Heal","Know",
    "Awareness","Dexterity","Stealth","Streetwise",
  ];

  const [attrName, setAttrName] = useState<Attr>("Nerves"); // sensible default
  const [skillName, setSkillName] = useState<Skill>("Drive"); // sensible default
  const [modifier, setModifier] = useState<number>(0);

  // tolerant getters (match CharacterSheet behavior)
  function grab(obj: any, key: string) {
    if (!obj) return undefined;
    return obj[key] ?? obj[key?.toLowerCase?.()] ?? obj[key?.toUpperCase?.()];
  }
  function readNum(v: any) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function getAttrValue(char: any, name: Attr) {
    const c = char ?? {};
    const from =
      grab(c.attributes, name) ??
      grab(c.data?.attributes, name) ??
      c[name] ?? c[name?.toLowerCase?.()];
    return readNum(from);
  }
  function getSkillValue(char: any, name: Skill) {
    const c = char ?? {};
    const from =
      grab(c.skills, name) ??
      grab(c.data?.skills, name) ??
      c[name] ?? c[name?.toLowerCase?.()];
    return readNum(from);
  }

  const attributeValue = myHero ? getAttrValue(myHero, attrName) : 0;
  const skillValue = myHero ? getSkillValue(myHero, skillName) : 0;

  // Load game (for campaignId and top-of-page data)
  useEffect(() => {
    (async () => {
      const g = await api.get(`/games/${gameId}`).catch(() => null);
      setGame(g);
    })();
  }, [gameId]);

  // Identify user and role
  useEffect(() => {
    (async () => {
      try {
        const user = await api.get("/auth/me").catch(() => null);
        setMe(user ?? null);

        const roleRow: RoleResp = await api
          .get(`/games/${gameId}/role`)
          .catch(() => ({} as RoleResp));
        setIsDirector(roleRow?.role === "director");
      } catch {
        setMe(null);
        setIsDirector(false);
      }
    })();
  }, [gameId]);

  // Load heroes for the campaign and find this user's hero
  useEffect(() => {
    if (!game?.campaignId || !me?.id) return;
    (async () => {
      try {
        const list = await api
          .get(`/campaigns/${game.campaignId}/heroes`)
          .catch(() => []);
        setHeroes(list ?? []);
        const mine = (list as any[]).find((h) => h.ownerId === me.id);
        setMyHero(mine ?? null);
      } catch (err) {
        console.error("Failed to load heroes", err);
      }
    })();
  }, [game?.campaignId, me?.id]);

  if (!game) return <div className="p-6">Loading…</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="lg:col-span-2 flex flex-col gap-3">
        <ChatBox gameId={gameId} />

        {game?.campaignId && (
          <>
            <CharacterMiniPanel
              campaignId={game.campaignId}
              currentUserId={me?.id ?? null}
              isDirector={isDirector}
            />
            <NPCsPanel
              campaignId={game.campaignId}
              editable={isDirector}
            />
          </>
        )}
      </div>

      <div className="space-y-4">
        {/* 🎲 Players only; auto-uses their hero’s values */}
        {!isDirector && myHero && (
          <div className="rounded-xl border p-3 bg-white/70 space-y-3">
            {/* Ability pickers */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="opacity-60">Attribute</span>
              <select
                className="border rounded px-2 py-1"
                value={attrName}
                onChange={(e) => setAttrName(e.target.value as Attr)}
              >
                {ATTRS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>

              <span className="opacity-60 ml-2">Skill</span>
              <select
                className="border rounded px-2 py-1"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value as Skill)}
              >
                {SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <span className="opacity-60 ml-2">Modifier</span>
              <input
                type="number"
                className="w-20 border rounded px-2 py-1"
                value={modifier}
                onChange={(e) => setModifier(Number(e.target.value) || 0)}
              />
            </div>

            {/* Live preview of pulled numbers */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded bg-gray-100 p-2">
                <div className="opacity-60 text-xs">Attribute</div>
                <div className="font-semibold">{attrName}: {attributeValue}</div>
              </div>
              <div className="rounded bg-gray-100 p-2">
                <div className="opacity-60 text-xs">Skill</div>
                <div className="font-semibold">{skillName}: {skillValue}</div>
              </div>
              <div className="rounded bg-gray-100 p-2">
                <div className="opacity-60 text-xs">Total Dice</div>
                <div className="font-semibold">
                  {Math.max(0, attributeValue + skillValue + modifier)}
                </div>
              </div>
            </div>

            {/* 👉 Your existing DiceRoller (unchanged API) */}
            <DiceRoller
              attribute={attributeValue}
              skill={skillValue}
              modifier={modifier}
              defaultDifficulty="basic"
              canSpendAdrenaline={true}
              onPaidReroll={() => {
                // optional: decrement adrenaline on myHero here if you track it
                console.log("Paid re-roll spent");
              }}
            />
          </div>
        )}

        <SceneBoard
          gameId={gameId}
          currentUserId={me?.id ?? null}
          isDirector={isDirector}
        />

        {isDirector && <GMControls gameId={gameId} />}
      </div>
    </div>
  );
}