import { useMemo, useState } from "react";

/**
 * Director's Toolkit → Attributes & Skills (no external UI kit)
 * - Pure React + Tailwind
 * - Searchable
 * - Deep-link anchors for each Attribute
 */

type Skill = { name: string; desc: string };

type Block = {
  key: "brawn" | "nerves" | "smooth" | "focus" | "crime";
  title: string;
  blurb: string;
  skills: Skill[];
};

const BLOCKS: Block[] = [
  {
    key: "brawn",
    title: "BRAWN",
    blurb: "Use brawn for all actions that require physical effort.",
    skills: [
      { name: "Endure", desc: "Handle pain, keep going despite exhaustion, hold your liquor." },
      { name: "Fight", desc: "Fight enemies bare handed or in close quarters." },
      { name: "Force", desc: "Hoist, push, pull, or break things." },
      { name: "Stunt", desc: "Jump or run recklessly, dodge bullets." },
    ],
  },
  {
    key: "nerves",
    title: "NERVES",
    blurb: "You need nerves of steel for actions that require quick reflexes and steady hands.",
    skills: [
      { name: "Cool", desc: "Keep your cool, hold still, or show courage." },
      { name: "Drive", desc: "Drive a car or bike, pilot a plane or helicopter." },
      { name: "Shoot", desc: "Shoot with pistols and rifles, throw objects with precision." },
      { name: "Survival", desc: "Find your bearings in the wilds, improvise weapons or shelter, hunt your dinner." },
    ],
  },
  {
    key: "smooth",
    title: "SMOOTH",
    blurb:
      "Show off how smooth you are whenever you have to interact with other people or want to manipulate them.",
    skills: [
      { name: "Flirt", desc: "Seduce someone or use your charm." },
      { name: "Leadership", desc: "Inspire, give orders, or intimidate people." },
      { name: "Speech", desc: "Persuade or deceive someone, or carry out negotiations." },
      { name: "Style", desc: "Show style and elegance, clean up nice, or prove your artistic talent." },
    ],
  },
  {
    key: "focus",
    title: "FOCUS",
    blurb:
      "You’ll need focus to concentrate, to notice details, and to recall memories and knowledge.",
    skills: [
      { name: "Detect", desc: "Find clues and intel, notice details, sniff out lies." },
      { name: "Heal", desc: "Give first aid or comfort someone." },
      { name: "Fix", desc: "Fix a computer or a car, turn off the security system, or hack into a server." },
      { name: "Know", desc: "Remember information you learned, recall details and other useful knowledge." },
    ],
  },
  {
    key: "crime",
    title: "CRIME",
    blurb:
      "Your aptitude for crime will come in handy when acting in secret or to notice incoming threats.",
    skills: [
      { name: "Awareness", desc: "Keep your eyes and ears open, notice incoming threats." },
      { name: "Dexterity", desc: "Perform sleight of hand, steal something, pick a lock." },
      { name: "Stealth", desc: "Hide, sneak, or move quietly." },
      {
        name: "Streetwise",
        desc:
          "Interact with criminals, recall information useful for moving in seedy neighborhoods or dealing with organized crime.",
      },
    ],
  },
];

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function DirectorsToolkit_AttributesAndSkills() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return BLOCKS;
    const q = query.trim().toLowerCase();
    return BLOCKS.map((b) => {
      const skills = b.skills.filter(
        (s) => s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)
      );
      const matchAttr =
        b.title.toLowerCase().includes(q) || b.blurb.toLowerCase().includes(q);
      return matchAttr || skills.length ? { ...b, skills: skills.length ? skills : b.skills } : null;
    }).filter(Boolean) as Block[];
  }, [query]);

  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl border shadow-xl bg-white">
      <div className="p-6 border-b space-y-3">
        <div className="text-xs uppercase tracking-widest text-gray-500">Director&apos;s Toolkit</div>
        <h2 className="text-2xl font-semibold">Attributes & Skills</h2>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search attributes or skills…"
            className="w-full pl-3 pr-3 py-2 rounded border focus:outline-none focus:ring"
          />
        </div>
      </div>

      <div className="p-6">
        {/* Quick anchor nav */}
        <nav className="flex flex-wrap gap-2 mb-4">
          {BLOCKS.map((b) => (
            <a
              key={b.key}
              href={`#attr-${b.key}`}
              className="text-xs px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              {b.title}
            </a>
          ))}
        </nav>

        <div className="space-y-3">
          {filtered.map((block) => (
            <details
              key={block.key}
              id={`attr-${block.key}`}
              className="rounded-2xl border p-3 open:shadow-sm"
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-col items-start gap-1">
                  <div className="text-lg font-semibold">
                    {highlight(block.title, query)}
                  </div>
                  <p className="text-sm text-gray-600">
                    {highlight(block.blurb, query)}
                  </p>
                </div>
              </summary>

              <ul className="grid sm:grid-cols-2 gap-3 mt-3">
                {block.skills.map((s) => (
                  <li key={s.name} className="rounded-xl p-3 bg-gray-50">
                    <div className="font-medium">{highlight(s.name, query)}</div>
                    <p className="text-sm text-gray-600">{highlight(s.desc, query)}</p>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        <div className="mt-6 text-right">
          <a href="#top" className="text-xs underline text-gray-600">
            Back to top
          </a>
        </div>
      </div>
    </div>
  );
}
