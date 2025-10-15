import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  characterSchema,
  type CharacterDTO,
  SKILLS
} from "@action-thread/types";
import { useMemo } from "react";

const YOU_LOOK = ["Hurt","Tired","Nervous","LikeAFool","Distracted","Scared"] as const;

type Props = { initial?: Partial<CharacterDTO>; onSubmit: (dto: CharacterDTO) => Promise<void> | void };

export default function CharacterForm({ initial, onSubmit }: Props) {
  const defaults: CharacterDTO = {
  id: undefined,
  name: "",            // empty is OK for the form; Zod will enforce on submit
  role: "",
  trope: "",
  jobOrBackground: "",
  age: "Adult",
  catchphrase: "",
  flaw: "",

  attributes: { brawn: 0, nerves: 0, smooth: 0, focus: 0, crime: 0 },
  skills: {
    endure: 0, fight: 0, force: 0, stunt: 0,
    cool: 0, drive: 0, shoot: 0, survival: 0,
    flirt: 0, leadership: 0, speech: 0, style: 0,
    detect: 0, fix: 0, heal: 0, know: 0,
    awareness: 0, dexterity: 0, stealth: 0, streetwise: 0,
  },

  grit: { current: 6, max: 6 },
  adrenaline: 0,
  spotlight: 0,
  luck: 0,

  experiences: [],
  feats: [],

  youLookSelected: [],
  isBroken: false,
  deathRoulette: [false, false, false, false, false, false],

  cash: 1,
  storage: { backpack: [], bag: [], gunsAndGear: [] },
  ride: { name: "", speed: 0, armor: 0, tags: [] },

  missionOrTreasure: "",
  achievementsBondsScarsReputations: "",
  createdAt: undefined,
  updatedAt: undefined,
  ...(initial ?? {}),
};


  const methods = useForm<CharacterDTO>({
    resolver: zodResolver(characterSchema),
    defaultValues: defaults,
    mode: "onChange",
  });

  const { register, handleSubmit, watch, setValue, formState } = methods;
  const youLookSelected = watch("youLookSelected");
  const brokenAuto = useMemo(() => (new Set(youLookSelected).size >= 3), [youLookSelected]);

  return (
    <FormProvider {...methods}>
      <form
  onSubmit={handleSubmit(async (data) => {
    // basic validation before hitting the API
    if (!data.name.trim() || !data.role.trim()) {
      alert("Please enter both a Name and a Role before saving your character.");
      return; // stop the submit, don’t call onSubmit
    }

    if (new Set(data.youLookSelected).size >= 3) data.isBroken = true;
    await onSubmit({
      ...data,
      name: data.name.trim(),
      role: data.role.trim(),
    });
  })}
>

        {/* Identity */}
        <section className="grid gap-3 md:grid-cols-3">
          <Input label="Name *" {...register("name")} required />
          <Input label="Role *" {...register("role")} required />
          <Input label="Trope" {...register("trope")} />
          <Input label="Job / Background" {...register("jobOrBackground")} />
          <Select label="Age" {...register("age")}>
            <option>Young</option><option>Adult</option><option>Old</option>
          </Select>
          <Input label="Catchphrase" {...register("catchphrase")} />
          <Input label="Flaw" {...register("flaw")} />
        </section>

        {/* Attributes + Skills */}
        <section className="grid md:grid-cols-5 gap-4">
          {(["brawn","nerves","smooth","focus","crime"] as const).map((attr) => (
            <div key={attr} className="rounded-xl border p-3">
              <h3 className="font-semibold uppercase">{attr}</h3>
              <Num {...register(`attributes.${attr}`, { valueAsNumber: true })} min={0} max={6} />
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {byAttr(attr).map(skill => (
                  <label key={skill} className="flex items-center gap-2">
                    <span className="w-24 capitalize">{skill}</span>
                    <Num {...register(`skills.${skill}`, { valueAsNumber: true })} min={0} max={6} />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Resources */}
        <section className="grid md:grid-cols-4 gap-4">
          <Counter label="Grit (current/max)">
            <Num {...register("grit.current", { valueAsNumber: true })} min={0} max={12}/><span>/</span>
            <Num {...register("grit.max", { valueAsNumber: true })} min={1} max={12}/>
          </Counter>
          <Counter label="Adrenaline"><Num {...register("adrenaline", { valueAsNumber: true })} min={0} max={12}/></Counter>
          <Counter label="Spotlight"><Num {...register("spotlight", { valueAsNumber: true })} min={0} max={6}/></Counter>
          <Counter label="Luck"><Num {...register("luck", { valueAsNumber: true })} min={0} max={6}/></Counter>
        </section>

        {/* Feats */}
        <section className="rounded-xl border p-3">
          <h3 className="font-semibold">Feats</h3>
          {[0,1,2,3,4,5].map(i => (
            <Input key={i} placeholder={`Feat ${i+1}`} {...register(`feats.${i}` as const)} />
          ))}
        </section>

        {/* You Look */}
        <section className="rounded-xl border p-3">
          <h3 className="font-semibold">You Look</h3>
          <div className="grid md:grid-cols-3 gap-2">
            {YOU_LOOK.map(y => (
              <label key={y} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={youLookSelected.includes(y)}
                  onChange={(e) => {
                    const set = new Set(youLookSelected);
                    e.target.checked ? set.add(y) : set.delete(y);
                    setValue("youLookSelected", Array.from(set));
                    if (set.size >= 3) setValue("isBroken", true);
                  }}
                />
                <span>{y.replace("LikeAFool","Like a Fool")}</span>
              </label>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" {...register("isBroken")} readOnly />
            <span className={brokenAuto ? "font-semibold" : ""}>Broken (auto when 3+ conditions)</span>
          </label>
        </section>

        {/* Death Roulette */}
        <section className="rounded-xl border p-3">
          <h3 className="font-semibold">Death Roulette (mark lethal)</h3>
          <div className="flex gap-3">
            {[0,1,2,3,4,5].map(i => (
              <label key={i} className="flex items-center gap-2">
                <input type="checkbox" {...register(`deathRoulette.${i}` as const)} />
                <span>{i+1}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Inventory */}
        <section className="grid md:grid-cols-3 gap-4">
          <Counter label="Cash ($)"><Num {...register("cash", { valueAsNumber: true })} min={0} max={5}/></Counter>
          <Input label="Ride Name" {...register("ride.name")} />
          <div className="flex items-center gap-2">
            <Num {...register("ride.speed", { valueAsNumber: true })} min={0} max={5}/> <span>Speed</span>
            <Num {...register("ride.armor", { valueAsNumber: true })} min={0} max={5}/> <span>Armor</span>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <Textarea label="Backpack" placeholder="One per line" {...register("storage.backpack")} />
          <Textarea label="Bag" placeholder="One per line" {...register("storage.bag")} />
        </section>

        <section className="rounded-xl border p-3">
          <h3 className="font-semibold">Guns & Gear</h3>
          {[0,1,2,3].map(i => (
            <div key={i} className="grid md:grid-cols-4 gap-2">
              <Input placeholder="Item name" {...register(`storage.gunsAndGear.${i}.name` as const)} />
              <Input placeholder="Tags (comma-sep)" onChange={(e)=> {
                const v = e.target.value.split(",").map(s=>s.trim()).filter(Boolean);
                setValue(`storage.gunsAndGear.${i}.tags` as any, v);
              }} />
              <Input placeholder="Ranges (melee/close/medium/long)" />
              <div />
            </div>
          ))}
        </section>

        {/* Notes */}
        <section className="grid md:grid-cols-2 gap-4">
          <Textarea label="Mission / Treasure" {...register("missionOrTreasure")} />
          <Textarea label="Achievements / Bonds / Scars / Reputations" {...register("achievementsBondsScarsReputations")} />
        </section>

        <div className="pt-2">
          <button type="submit" className="rounded-xl px-4 py-2 border">Save Character</button>
          {!formState.isValid && <span className="ml-3 text-sm text-red-600">Fix validation errors</span>}
        </div>
      </form>
    </FormProvider>
  );
}

// tiny field helpers
function Input(props: any){ return <label className="grid text-sm">{props.label && <span>{props.label}</span>}<input className="border rounded px-2 py-1" {...props}/></label> }
function Num(props: any){ return <input type="number" className="border rounded px-2 py-1 w-16" {...props}/> }
function Select(props: any){ return <label className="grid text-sm">{props.label && <span>{props.label}</span>}<select className="border rounded px-2 py-1" {...props}/></label> }
function Counter({label, children}:{label:string, children:any}){ return <div className="border rounded-xl p-3"><div className="text-sm font-semibold">{label}</div><div className="mt-2 flex items-center gap-2">{children}</div></div> }
function Textarea(props:any){ return <label className="grid text-sm">{props.label && <span>{props.label}</span>}<textarea rows={5} className="border rounded px-2 py-1" {...props}/></label> }

function byAttr(attr: "brawn"|"nerves"|"smooth"|"focus"|"crime"){
  const map: Record<string, string[]> = {
    brawn:["endure","fight","force","stunt"],
    nerves:["cool","drive","shoot","survival"],
    smooth:["flirt","leadership","speech","style"],
    focus:["detect","fix","heal","know"],
    crime:["awareness","dexterity","stealth","streetwise"],
  };
  return map[attr];
}
