// shared/data/gear.ts
// Single source of truth for gear across all Outgunned books/modules.
// NOTE: Keep IDs stable. Display names can change; IDs should not.

export type GearId = string;

export type GearKind =
  | "weapon"
  | "armor"
  | "ride"
  | "kit"
  | "tool"
  | "device"
  | "outfit"
  | "consumable"
  | "cash"
  | "companion"
  | "artifact"
  | "virtual"
  | "misc";

export type GearSource =
  | { book: "Outgunned Corebook"; code: "OG"; page?: number }
  | { book: "World of Killers"; code: "OGWoK"; page?: number }
  | { book: "Action Flicks"; code: "OGAF"; page?: number }
  | { book: "Action Flicks 2 — Star Knights"; code: "OGAF2-SK"; page?: number }
  | { book: "Action Flicks 2 — Occult Ops"; code: "OGAF2-OO"; page?: number }
  | { book: "Action Flicks 2 — Medieval Saga"; code: "OGAF2-MS"; page?: number }
  | { book: "Action Flicks 2 — District 77"; code: "OGAF2-D77"; page?: number }
  | { book: "Action Flicks 2 — Fury Wasteland"; code: "OGAF2-FW"; page?: number }
  | { book: "Action Flicks 2 — Arcade Endless"; code: "OGAF2-AE"; page?: number }
  | { book: "Action Flicks 2 — Quirky Toons"; code: "OGAF2-QT"; page?: number }
  | { book: "Action Flicks 2 — In-Console"; code: "OGAF2-IC"; page?: number }
  | { book: "Outgunned Adventure"; code: "OGA"; page?: number }
  | { book: "Other"; code: "OTHER"; note?: string };


type GunCell = number | "X" | "±0" | `+${number}G`;

export type GunProfile = {
  melee?: GunCell;
  close?: GunCell;
  medium?: GunCell;
  long?: GunCell;
};

export type ParsedGunCell =
  | { kind: "blocked" }                 // "X"
  | { kind: "neutral" }                 // "±0"
  | { kind: "flat"; value: number }     // -2, -1, 0, +1, +2, +3
  | { kind: "gamble"; value: number };  // "+1G", "+2G"

export function parseGunCell(cell?: number | "X" | "±0" | `+${number}G`): ParsedGunCell {
  if (cell == null) return { kind: "neutral" };     // default safe
  if (cell === "X") return { kind: "blocked" };
  if (cell === "±0") return { kind: "neutral" };
  if (typeof cell === "number") return { kind: "flat", value: cell };

  // "+<n>G"
  const m = /^\+?(-?\d+)G$/.exec(cell);
  if (m) return { kind: "gamble", value: Number(m[1]) };

  // Fallback: try number in string (robustness)
  const n = Number(cell);
  return Number.isFinite(n) ? { kind: "flat", value: n } : { kind: "neutral" };
}

export function parseGunRanges(r?: {
  melee?: number | "X" | "±0" | `+${number}G`;
  close?: number | "X" | "±0" | `+${number}G`;
  medium?: number | "X" | "±0" | `+${number}G`;
  long?: number | "X" | "±0" | `+${number}G`;
}) {
  return {
    melee: parseGunCell(r?.melee),
    close: parseGunCell(r?.close),
    medium: parseGunCell(r?.medium),
    long: parseGunCell(r?.long),
  };
}

export type GearItem = {
  id: GearId;                // kebab-case, stable
  name: string;
  kind: GearKind;
  cost?: number;             // Outgunned price scale; omit if N/A or special
  tags?: string[];
  props?: {
    gun?: GunProfile;        // Ranged profile modifiers
    speed?: number;          // for rides
    type?: string | string[];           // ride subtype, weapon class, etc.
    [k: string]: any;
  };
  note?: string;             // brief UX text / special rules reminder
  source?: GearSource;
};

/** Small helpers */
const OG = (page?: number): GearSource => ({ book: "Outgunned Corebook", code: "OG", page });
const OGA = (page?: number): GearSource => ({ book: "Outgunned Adventure", code: "OGA", page });
const WoK = (page?: number): GearSource => ({ book: "World of Killers", code: "OGWoK", page });
const AF  = (page?: number): GearSource => ({ book: "Action Flicks", code: "OGAF", page });
const AF2_SK  = (p?: number): GearSource => ({ book: "Action Flicks 2 — Star Knights", code: "OGAF2-SK", page: p });
const AF2_OO  = (p?: number): GearSource => ({ book: "Action Flicks 2 — Occult Ops", code: "OGAF2-OO", page: p });
const AF2_MS  = (p?: number): GearSource => ({ book: "Action Flicks 2 — Medieval Saga", code: "OGAF2-MS", page: p });
const AF2_D77 = (p?: number): GearSource => ({ book: "Action Flicks 2 — District 77", code: "OGAF2-D77", page: p });
const AF2_FW  = (p?: number): GearSource => ({ book: "Action Flicks 2 — Fury Wasteland", code: "OGAF2-FW", page: p });
const AF2_AE  = (p?: number): GearSource => ({ book: "Action Flicks 2 — Arcade Endless", code: "OGAF2-AE", page: p });
const AF2_QT  = (p?: number): GearSource => ({ book: "Action Flicks 2 — Quirky Toons", code: "OGAF2-QT", page: p });
const AF2_IC  = (p?: number): GearSource => ({ book: "Action Flicks 2 — In-Console", code: "OGAF2-IC", page: p });

/**
 * CATALOG
 * - Includes everything from your sheet PLUS a few missing generics:
 *   - Ride category placeholders (Bike/Car/Nautical/Flying/Armored)
 *   - $1 Credit token (for flexible “$1 item of your choice”)
 * - Typos fixed: “Telecopic” → “Telescopic”.
 */
export const GEAR: GearItem[] = [
  // ===== Outgunned Corebook — Gear =====
  { id: "bulletproof-vest", name: "Bulletproof Vest", kind: "armor", cost: 3, tags: ["defense"], note: "Grants Help to avoid bullets.", source: OG(103) },
  { id: "camera", name: "Camera", kind: "device", cost: 1, tags: ["evidence","surveillance"], note: "Grants Help to shoot photos.", source: OG(103) },
  { id: "elegant-clothes", name: "Elegant Clothes", kind: "outfit", cost: 3, tags: ["social","disguise"], note: "Grants Help to make a good impression.", source: OG(103) },
  { id: "first-aid-kit", name: "First-aid Kit", kind: "kit", cost: 2, tags: ["medical"], note: "Grants Help to treat wounds.", source: OG(103) },
  { id: "grappling-hook", name: "Grappling Hook", kind: "tool", cost: 1, tags: ["climb","mobility"], note: "Grants Help to climb and swing.", source: OG(103) },
  { id: "handcuffs", name: "Handcuffs", kind: "tool", cost: 1, tags: ["restraint","police"], note: "Grants Help to restrain people.", source: OG(103) },
  { id: "heavy-mace", name: "Heavy Mace", kind: "weapon", cost: 1, tags: ["melee","breach"], note: "Grants Help to break doors and smash things.", source: OG(103) },
  { id: "knife", name: "Knife", kind: "weapon", cost: 1, tags: ["melee","sharp"], note: "Grants Help to cut things.", source: OG(103) },
  { id: "sword", name: "Sword", kind: "weapon", cost: 1, tags: ["melee","sharp"], note: "Grants Help to cut things.", source: OG(103) },
  { id: "lockpicking-set", name: "Lockpicking Set", kind: "tool", cost: 2, tags: ["infiltration","stealth"], note: "Grants Help to open locks or safes.", source: OG(103) },
  { id: "night-vision-device", name: "Night Vision Device", kind: "device", cost: 2, tags: ["darkness","surveillance"], note: "Grants Help to see in the dark.", source: OG(103) },
  { id: "portable-computer", name: "Portable Computer", kind: "device", cost: 2, tags: ["intel","hacking","network"], note: "Grants Help to find information and connect to a network.", source: OG(103) },
  { id: "scuba-gear", name: "Scuba Gear", kind: "kit", cost: 3, tags: ["underwater","mobility"], note: "Grants Help to dive and swim underwater. Includes oxygen.", source: OG(103) },
  { id: "silencer", name: "Silencer", kind: "device", cost: 2, tags: ["stealth","weapon-mod"], note: "Grants the Silent Feat to a pistol, assault rifle, or precision rifle.", source: OG(103) },
  { id: "telescopic-sight", name: "Telescopic Sight", kind: "device", cost: 2, tags: ["aim","weapon-mod"], note: "Grants the Precision Shot Feat to a rifle or assault rifle.", source: OG(103) },
  { id: "toolbox", name: "Toolbox", kind: "tool", cost: 1, tags: ["repair","rides"], note: "Grants Help to repair Rides and other things.", source: OG(103) },
  { id: "wingsuit", name: "Wingsuit", kind: "outfit", cost: 3, tags: ["mobility","aerial"], note: "Grants Help to glide. Includes a parachute.", source: OG(103) },
  { id: "telephone", name: "Telephone", kind: "device", cost: 1, tags: ["comms"], note: "Communicate at a distance.", source: OG() },
  { id: "radio", name: "Radio", kind: "device", cost: 3, tags: ["comms","bulky"], note: "Communicate at a distance. Bulky.", source: OG() },
  { id: "badge", name: "Badge", kind: "outfit", cost: 1, tags: ["police"], note: "Grants Help where authority would support.", source: OG() },
  { id: "precious-item", name: "Precious Item- Update in Character Sheet", kind: "cash", cost: 3, tags: ["currency"], note: "Generic precious item.", source: OG() },
  { id: "notebook-and-pencil", name: "Notebook and Pencil", kind: "tool", cost: 1, tags: ["intel"], note: "Grants Help to remember information.", source: OG() },


  // ===== Outgunned Corebook — Firearms & Ammo =====
  { id: "pistol", name: "Pistol", kind: "weapon", cost: 1, tags: ["firearm"], props: { gun: { melee: 0, close: 0, medium: 0, long: -2 } }, note: "No Feat.", source: OG(100) },
  { id: "revolver", name: "Revolver", kind: "weapon", cost: 1, tags: ["firearm"], props: { gun: { melee: 0, close: 0, medium: 0, long: -2 } }, note: "No Feat.", source: OG(100) },
  { id: "machine-pistol", name: "Machine Pistol", kind: "weapon", cost: 2, tags: ["firearm","rapid-fire","short-range"], props: { gun: { melee: 0, close: +1, medium: 0, long: "X" } }, note: "Rapid Fire, Short Range.", source: OG(101) },
  { id: "shotgun", name: "Shotgun", kind: "weapon", cost: 2, tags: ["firearm","short-range","slow-reload"], props: { gun: { melee: +1, close: +1, medium: -2, long: "X" } }, note: "Short Range, Slow Reload.", source: OG(101) },
  { id: "rifle", name: "Rifle", kind: "weapon", cost: 2, tags: ["firearm","accurate","slow-reload"], props: { gun: { melee: -2, close: +1, medium: +1, long: 0 } }, note: "Accurate, Slow Reload.", source: OG(101) },
  { id: "assault-rifle", name: "Assault Rifle", kind: "weapon", cost: 3, tags: ["firearm","accurate","rapid-fire"], props: { gun: { melee: 0, close: +1, medium: +1, long: +1 } }, note: "Accurate, Rapid Fire.", source: OG(101) },
  { id: "precision-rifle", name: "Precision Rifle", kind: "weapon", cost: 3, tags: ["firearm","accurate","precision-shot","slow-reload"], props: { gun: { melee: "X", close: -1, medium: 0, long: +2 } }, note: "Accurate, Precision Shot, Slow Reload.", source: OG(101) },
  { id: "sub-machine-gun", name: "Sub-machine Gun", kind: "weapon", cost: 2, tags: ["firearm","rapid-fire"], props: { gun: { melee: 0, close: +1, medium: +1, long: 0 } }, note: "Rapid Fire.", source: OG(101) },
  { id: "machine-gun", name: "Machine Gun", kind: "weapon", cost: 3, tags: ["firearm","rapid-fire","slow-reload"], props: { gun: { melee: -2, close: 0, medium: +2, long: +1 } }, note: "Rapid Fire, Slow Reload.", source: OG(101) },
  { id: "bow", name: "Bow", kind: "weapon", cost: 2, tags: ["ranged","silent","single-shot"], props: { gun: { melee: -1, close: 0, medium: 0, long: "X" } }, note: "Silent, Single Shot.", source: OG(102) },
  { id: "throwing-knives-3", name: "Throwing Knives (3)", kind: "weapon", cost: 1, tags: ["ranged","silent","single-shot"], props: { gun: { melee: -1, close: -1, medium: -2, long: "X" } }, note: "Silent, Single Shot.", source: OG(102) },
  { id: "rocket-launcher", name: "Rocket Launcher", kind: "weapon", cost: 3, tags: ["explosive","single-shot","slow-reload"], props: { gun: { melee: "+2G", close: "+2G", medium: +3, long: +3 } }, note: "Explosive, Single Shot, Slow Reload.", source: OG(102) },
  { id: "grenade", name: "Grenade", kind: "consumable", cost: 2, tags: ["explosive","jam","single-shot"], props: { gun: { melee: "+1G", close: "+1G", medium: +2, long: +2 } }, note: "Explosive, Jam, Single Shot.", source: OG(102) },
  { id: "arrows-6", name: "Arrows (6)", kind: "consumable", cost: 1, tags: ["ammo","bow"], note: "Projectiles for bow.", source: OG(102) },
  { id: "rocket-1", name: "Rocket (1)", kind: "consumable", cost: 2, tags: ["ammo","rocket-launcher"], note: "Projectile for Rocket Launcher.", source: OG(102) },
  { id: "mags-2", name: "Mags (2)", kind: "consumable", cost: 1, tags: ["ammo"], note: "Mags for a type of weapon of your choice.", source: OG(102) },

  // Rides (generic + your “Common Rides”)
  { id: "ride-generic-speed-1", name: "Common Rides (Speed 1)- Update in Character Sheet", kind: "ride", cost: 3, tags: ["ride"], props: { speed: 1 }, note: "Bikes, cars, nautical rides with Speed 1.", source: OG(105) },
  { id: "ride-generic-speed-0", name: "Old Ride (Speed 0)- Update in Character Sheet", kind: "ride", cost: 2, tags: ["ride"], props: { speed: 0 }, note: "Old Bikes, cars, nautical rides with Speed 0.", source: OG() },
  // Added generics you’ll want for “of your choice” grants:
  { id: "ride-bike", name: "Ride (Bike)", kind: "ride", cost: 3, tags: ["ride","bike"], props: { type: "bike" }, source: OG(105) },
  { id: "ride-car", name: "Ride (Car)", kind: "ride", cost: 3, tags: ["ride","car"], props: { type: "car" }, source: OG(105) },
  { id: "ride-nautical", name: "Ride (Nautical)", kind: "ride", cost: 4, tags: ["ride","nautical"], props: { type: "nautical" }, source: OG(105) },
  { id: "ride-flying", name: "Ride (Flying)", kind: "ride", cost: 4, tags: ["ride","flying"], props: { type: "flying" }, source: OG(105) },
  { id: "ride-armored", name: "Ride (Armored)", kind: "ride", cost: 4, tags: ["ride","armored"], props: { type: "armored" }, source: OG(105) },
  { id: "starship-1", name: "Starship (Speed 1)", kind: "ride", cost: 3, tags: ["ride"], props: { speed: 1 }, source: OGAF2-SK(24) },

  // ===== World of Killers =====
  { id: "wok-viper", name: "Viper (Pistol)", kind: "weapon", tags: ["firearm","accurate","custom","silent"], props: { gun: { melee: 0, close: +1, medium: 0, long: -2 } }, source: WoK() },
  { id: "wok-banshee", name: "Banshee (Shotgun)", kind: "weapon", tags: ["firearm","custom","short-range"], props: { gun: { melee: +1, close: +1, medium: 0, long: -2 } }, source: WoK() },
  { id: "wok-lamia", name: "Lamia (Assault Rifle)", kind: "weapon", tags: ["firearm","accurate","custom","rapid-fire"], props: { gun: { melee: 0, close: +1, medium: +2, long: +1 } }, source: WoK() },
  { id: "wok-siren", name: "Siren (Precision Rifle)", kind: "weapon", tags: ["firearm","accurate","custom","precision-shot"], props: { gun: { melee: "X", close: 0, medium: 0, long: +2 } }, source: WoK() },
  { id: "wok-perfect-katana", name: "Perfect Katana", kind: "weapon", tags: ["melee","sharp","traditional"], note: "Grants Help to cut things.", source: WoK() },
  { id: "wok-incendiary-arrows-6", name: "Incendiary Arrows (6)", kind: "consumable", tags: ["ammo","bow","incendiary"], source: WoK() },
  { id: "wok-incendiary-ammo-2", name: "Incendiary Ammo (2)", kind: "consumable", tags: ["ammo","shotgun","incendiary"], source: WoK() },
  { id: "wok-bulletproof-suit", name: "Bulletproof Suit", kind: "outfit", tags: ["custom","defense","social"], note: "Help to make a good impression and dodge bullets.", source: WoK() },
  { id: "wok-armored-car", name: "Armored Car", kind: "ride", tags: ["ride","car","armored"], props: { speed: 2, type: "car" }, source: WoK() },
  { id: "wok-bolide", name: "Bolide", kind: "ride", tags: ["ride"], props: { speed: 3, type: ["car","bike"] }, note: "Type Car or Bike.", source: WoK() },
  { id: "wok-concealed-blade", name: "Concealed Blade", kind: "weapon", tags: ["melee","stealth"], note: "Help to hit unaware targets.", source: WoK() },
  { id: "wok-exclusive-invite", name: "Exclusive Invite", kind: "misc", tags: ["social","access"], note: "Access to an exclusive place or event.", source: WoK() },
  { id: "wok-trained-dog", name: "Trained Dog", kind: "companion", tags: ["ally"], note: "Rarely purchased; Director may allow (expensive).", source: WoK() },

  // ===== Action Flicks (core — lasers, cyber, horror bits) =====
  { id: "laser-pistol", name: "Laser Pistol", kind: "weapon", cost: 1, tags: ["laser"], props: { gun: { melee: 0, close: 0, medium: 0, long: -2 } }, source: AF() },
  { id: "laser-rifle", name: "Laser Rifle", kind: "weapon", cost: 2, tags: ["laser","rapid-fire"], props: { gun: { melee: 0, close: +1, medium: +1, long: 0 } }, source: AF() },
  { id: "laser-crossbow", name: "Laser Crossbow", kind: "weapon", cost: 3, tags: ["laser","explosive","maximum-power"], props: { gun: { melee: "+1G", close: "+2G", medium: +2, long: 1 } }, source: AF() },
  { id: "ship-droid", name: "Ship Droid", kind: "companion", cost: 3, tags: ["pilot","starship"], note: "Can take the spot of a copilot when driving a starship.", source: AF() },
  { id: "laser-blade", name: "Laser Blade", kind: "weapon", tags: ["melee","laser"], note: "Ignores the Armored Enemy Feat.", source: AF() },

  // Black Powder & Historical (Action Flicks)
  { id: "muzzle-loading-pistol", name: "Muzzle-loading Pistol", kind: "weapon", cost: 2, tags: ["jam","muzzle-loading"], props: { gun: { melee: 0, close: 0, medium: 0, long: -2 } }, source: AF() },
  { id: "musket", name: "Musket", kind: "weapon", cost: 3, tags: ["muzzle-loading"], props: { gun: { melee: -1, close: +1, medium: +1, long: 0 } }, source: AF() },
  { id: "crossbow", name: "Crossbow", kind: "weapon", cost: 3, tags: ["silent","single-shot","slow-reload"], props: { gun: { melee: -1, close: 0, medium: +1, long: 0 } }, source: AF() },
  { id: "longbow", name: "Longbow", kind: "weapon", cost: 3, tags: ["accurate","silent","single-shot"], props: { gun: { melee: -1, close: 0, medium: +1, long: 0 } }, source: AF() },
  { id: "light-armor", name: "Light Armor", kind: "armor", cost: 3, tags: ["defense"], note: "Help to avoid projectiles from muzzle-loading weapons.", source: AF() },
  { id: "horse", name: "Horse", kind: "ride", cost: 3, tags: ["ride","animal"], props: { speed: 1 }, note: "Ride with Speed 1.", source: AF() },
  { id: "rapier", name: "Rapier", kind: "weapon", cost: 2, tags: ["melee","sharp"], note: "Side-sword; shines with Sword Fighter.", source: AF() },

  // Toys / Youth (Action Flicks)
  { id: "airsoft-rifle", name: "Airsoft Rifle", kind: "weapon", cost: 1, tags: ["toy","single-shot"], props: { gun: { melee: -1, close: +1, medium: +1, long: "X" } }, source: AF() },
  { id: "slingshot", name: "Slingshot", kind: "weapon", cost: 1, tags: ["toy","silent","single-shot"], props: { gun: { melee: 0, close: 0, medium: -1, long: "X" } }, source: AF() },
  { id: "firecrackers", name: "Firecrackers", kind: "consumable", cost: 1, tags: ["toy","explosive","single-shot"], props: { gun: { melee: "+1G", close: "+1G", medium: +2, long: "X" } }, source: AF() },
  { id: "walkman", name: "Walkman", kind: "device", cost: 1, tags: ["music"], note: "Listen to your favorite song wherever you are.", source: AF() },

  // Supernatural / Horror (Action Flicks)
  { id: "ghostproof-rifle", name: "Ghostproof Rifle", kind: "weapon", tags: ["ghostproof","stream"], props: { gun: { melee: 0, close: +1, medium: +1, long: 0 } }, source: AF() },
  { id: "ghost-sniffer", name: "Ghost Sniffer", kind: "device", tags: ["ghosts","tracking"], note: "Help locating ghosts and following tracks.", source: AF() },
  { id: "ghostproof-trap", name: "Ghostproof Trap", kind: "device", tags: ["ghosts","trap"], note: "Capture ghosts who are Out of Grit.", source: AF() },
  { id: "legendary-weapon", name: "Legendary Weapon", kind: "weapon", tags: ["anti-vampire","anti-werewolf"], note: "Hurts classic monsters.", source: AF() },
  { id: "silver-blade", name: "Silver Blade", kind: "weapon", cost: 3, tags: ["anti-werewolf","melee","sharp"], source: AF() },
  { id: "memento", name: "Memento", kind: "misc", tags: ["luck"], note: "At start of each combat, flip a coin. Tails: gain 1 Adrenaline/Luck.", source: AF() },
  { id: "stake", name: "Stake", kind: "weapon", cost: 3, tags: ["anti-vampire","melee"], source: AF() },
  { id: "silver-bullets", name: "Silver Bullets", kind: "consumable", cost: 2, tags: ["ammo","revolver","anti-werewolf"], source: AF() },
  { id: "radiant-bullets", name: "Radiant Bullets", kind: "consumable", cost: 2, tags: ["ammo","revolver","anti-vampire"], source: AF() },
  { id: "rifle-hand", name: "Rifle Hand", kind: "weapon", cost: 2, tags: ["cyber","slow-reload"], props: { gun: { melee: +1, close: +1, medium: +1, long: "X" } }, source: AF() },
  { id: "grafted-rocket-launcher", name: "Grafted Rocket Launcher", kind: "weapon", cost: 3, tags: ["cyber","explosive","single-shot","slow-reload"], props: { gun: { melee: "+2G", close: "+2G", medium: +3, long: +3 } }, source: AF() },

  // Cyberware (Action Flicks)
  { id: "cyber-arm", name: "Cyber-arm", kind: "device", cost: 2, tags: ["cyber"], note: "Help to break/crack/smash. A/L: +2 to Force or Fight roll.", source: AF() },
  { id: "artificial-gills", name: "Artificial Gills", kind: "device", cost: 1, tags: ["bio"], note: "Breathe underwater; filter toxic gases.", source: AF() },
  { id: "skill-chip", name: "Skill Chip", kind: "device", cost: 2, tags: ["cyber"], note: "Gain 1 Skill Point to assign freely.", source: AF() },
  { id: "anti-jamming-chip", name: "Anti-Jamming Chip", kind: "device", cost: 3, tags: ["cyber"], note: "Your cyberware cannot be deactivated by the Enemy.", source: AF() },
  { id: "hacking-chip", name: "Hacking Chip", kind: "device", cost: 2, tags: ["cyber"], note: "Connect to tech without a computer. A/L: Deactivate a security system or Enemy Cyberware.", source: AF() },
  { id: "reflexes-chip", name: "Reflexes Chip", kind: "device", cost: 2, tags: ["cyber"], note: "A/L: Repeat one Reaction Roll.", source: AF() },
  { id: "ride-chip", name: "Ride Chip", kind: "device", cost: 1, tags: ["cyber","ride"], note: "At the wheel, your Ride’s Speed +1. A/L: Recall your ride to you.", source: AF() },
  { id: "exoskeleton", name: "Exoskeleton", kind: "armor", cost: 3, tags: ["cyber","cover"], note: "You gain benefits of Partial Cover.", source: AF() },
  { id: "empowered-legs", name: "Empowered Legs", kind: "device", cost: 1, tags: ["cyber","mobility"], note: "Help to run, jump, or break falls.", source: AF() },
  { id: "grafted-defibrillator", name: "Grafted Defibrillator", kind: "device", cost: 3, tags: ["cyber"], note: "Your Bad Box becomes a second Hot Box.", source: AF() },
  { id: "aesthetic-graft", name: "Aesthetic Graft", kind: "device", cost: 1, tags: ["cyber","cosmetic"], note: "Artificial hair, odd eyes, synthetic skin, etc.", source: AF() },
  { id: "grafted-jetpack", name: "Grafted Jetpack", kind: "device", cost: 3, tags: ["cyber","flight"], note: "A/L: Fly until end of Scene or combat.", source: AF() },
  { id: "grafted-blades", name: "Grafted Blades", kind: "weapon", cost: 1, tags: ["cyber","melee","quick-draw"], source: AF() },
  { id: "tool-hand", name: "Tool Hand", kind: "device", cost: 1, tags: ["cyber","repair","lockpicking"], note: "Help to repair and pick locks.", source: AF() },
  { id: "grappling-hand", name: "Grappling Hand", kind: "device", cost: 1, tags: ["cyber","climb"], note: "Help to climb.", source: AF() },
  { id: "nanosurgeons", name: "Nanosurgeons", kind: "device", cost: 3, tags: ["cyber","healing"], note: "A/L: Remove a Condition or recover 3 Grit.", source: AF() },
  { id: "infrared-eyes", name: "Infrared Eyes", kind: "device", cost: 1, tags: ["cyber","vision"], note: "Help to see in the dark.", source: AF() },
  { id: "sniper-eye", name: "Sniper Eye", kind: "device", cost: 2, tags: ["cyber","accurate","precision-shot"], note: "Firearms you use gain Accurate & Precision Shot.", source: AF() },
  { id: "photographic-eye", name: "Photographic Eye", kind: "device", cost: 1, tags: ["cyber","vision"], note: "Help to take photos.", source: AF() },
  { id: "eye-scope", name: "Eye Scope", kind: "device", cost: 2, tags: ["cyber","aim"], note: "Free Re-roll for shooting with firearms/ranged weapons.", source: AF() },
  { id: "scanner-eye", name: "Scanner Eye", kind: "device", cost: 1, tags: ["cyber","forensics"], note: "Help to analyze a crime scene or locate enemies.", source: AF() },
  { id: "roller-feet", name: "Roller Feet", kind: "device", cost: 2, tags: ["cyber","mobility"], note: "Quick Action to extract. You become a Ride with Speed 2.", source: AF() },
  { id: "ninja-feet", name: "Ninja Feet", kind: "device", cost: 2, tags: ["cyber","stealth"], note: "Your steps make no noise.", source: AF() },

  // ===== Outgunned Adventure =====
  { id: "oga-elegant-clothes", name: "Elegant Clothes", kind: "outfit", cost: 3, tags: ["social","bulky"], note: "Help for stylish occasions but a Hindrance to movements.", source: OGA() },
  { id: "oga-lockpicking-set", name: "Lockpicking Set", kind: "tool", cost: 2, tags: ["infiltration","traps"], note: "Pick locks and disarm traps.", source: OGA() },
  { id: "oga-tool-bag", name: "Tool-bag", kind: "tool", cost: 1, tags: ["repair","rides"], note: "Help to repair objects or rides.", source: OGA() },
  { id: "oga-knife", name: "Knife", kind: "weapon", cost: 1, tags: ["melee","sharp"], source: OGA() },
  { id: "oga-first-aid-kit", name: "First-aid Kit", kind: "kit", cost: 2, tags: ["medical"], source: OGA() },
  { id: "oga-grappling-hook", name: "Grappling Hook", kind: "tool", cost: 1, tags: ["climb"], source: OGA() },
  { id: "oga-rope", name: "Rope", kind: "tool", cost: 1, tags: ["climb"], note: "A long rope, very sturdy.", source: OGA() },
  { id: "oga-compass", name: "Compass", kind: "device", cost: 1, tags: ["navigation"], note: "Help to find your bearings or magnetic North.", source: OGA() },
  { id: "oga-winter-clothes", name: "Winter Clothes", kind: "outfit", cost: 1, tags: ["weather"], note: "Help to withstand cold or bad weather.", source: OGA() },
  { id: "oga-lantern", name: "Lantern", kind: "device", cost: 1, tags: ["light","hindrance-hide"], note: "Help to see in the dark, but a Hindrance when hiding.", source: OGA() },
  { id: "oga-climbing-gear", name: "Climbing Gear", kind: "tool", cost: 2, tags: ["climb","rock","ice"], note: "Help when climbing walls made of rock or ice.", source: OGA() },
  { id: "oga-camping-cookware", name: "Camping Cookware", kind: "kit", cost: 1, tags: ["camp","cook"], note: "Help to cook in a Camp.", source: OGA() },
  { id: "oga-musical-instrument", name: "Musical Instrument", kind: "device", cost: 2, tags: ["perform"], note: "Allows you to play and perform.", source: OGA() },
  { id: "oga-old-ride", name: "Old Ride", kind: "ride", cost: 3, tags: ["ride"], props: { speed: 1 }, note: "An old plane, ship, or jeep.", source: OGA() },
  { id: "oga-lighter", name: "Lighter", kind: "device", cost: 1, tags: ["fire"], note: "Help to light a fire.", source: OGA() },
  { id: "oga-radio", name: "Radio", kind: "device", cost: 3, tags: ["comms","bulky"], note: "Communicate at a distance. Bulky.", source: OGA() },

  // Outgunned Adventure — Weapons & Explosives
  { id: "oga-pistol-revolver", name: "Pistol/Revolver", kind: "weapon", cost: 1, tags: ["firearm"], source: OGA() },
  { id: "oga-old-rifle", name: "Old Rifle", kind: "weapon", cost: 1, tags: ["firearm","slow-reload"], note: "Allows you to shoot with +1.", source: OGA() },
  { id: "oga-hunting-rifle", name: "Hunting Rifle", kind: "weapon", cost: 2, tags: ["firearm","accurate","slow-reload"], note: "Allows you to shoot with +1.", source: OGA() },
  { id: "oga-shotgun", name: "Shotgun", kind: "weapon", cost: 2, tags: ["firearm","impact","slow-reload"], note: "Allows you to shoot with +1.", source: OGA() },
  { id: "oga-machine-gun", name: "Machine Gun", kind: "weapon", cost: 3, tags: ["firearm","rapid-fire"], note: "Allows you to shoot with +1.", source: OGA() },
  { id: "oga-gatling-gun", name: "Gatling Gun", kind: "weapon", cost: 0, tags: ["firearm","fixed","rapid-fire","uncommon"], note: "Allows you to shoot with +2.", source: OGA() },
  { id: "oga-bow", name: "Bow", kind: "weapon", cost: 2, tags: ["silent","single-shot"], note: "Allows you to shoot arrows.", source: OGA() },
  { id: "oga-hunting-bow", name: "Hunting Bow", kind: "weapon", cost: 3, tags: ["accurate","silent","single-shot"], note: "Allows you to shoot arrows with +1.", source: OGA() },
  { id: "oga-dynamite", name: "Dynamite", kind: "consumable", cost: 2, tags: ["explosive","single-shot"], note: "Boom!", source: OGA() },
  { id: "oga-machete-axe", name: "Machete/Axe", kind: "weapon", cost: 1, tags: ["melee","sharp"], source: OGA() },
  { id: "oga-club-hammer", name: "Club/Hammer", kind: "weapon", cost: 1, tags: ["melee","impact"], source: OGA() },
  { id: "oga-boomerang", name: "Boomerang", kind: "weapon", cost: 2, tags: ["throwing"], note: "Comes back when thrown.", source: OGA() },
  { id: "oga-whip", name: "Whip", kind: "weapon", cost: 1, tags: ["melee","grab"], note: "Can grab distant items.", source: OGA() },
  { id: "oga-rocket-launcher", name: "Rocket Launcher", kind: "weapon", cost: 0, tags: ["boom","single-shot","slow-reload","uncommon"], note: "Allows you to shoot with +1.", source: OGA() },
  { id: "oga-projectiles", name: "Projectiles", kind: "consumable", cost: 0, tags: ["ammo","uncommon"], note: "10 arrows for a bow or 1 rocket for a rocket launcher.", source: OGA() },
  { id: "oga-mags-2", name: "Mags (2)", kind: "consumable", cost: 1, tags: ["ammo"], note: "2 mags for a weapon of your choice.", source: OGA() },

  // ===== Action Flicks 2 — Star Knights =====
  { id: "star-sword", name: "Star Sword", kind: "weapon", tags: ["pure-energy","powerful"], source: AF2_SK() },
  { id: "double-star-sword", name: "Double Star Sword", kind: "weapon", tags: ["pure-energy","powerful","deflecting"], source: AF2_SK() },

  // ===== Action Flicks 2 — Occult Ops =====
  { id: "crystal-sphere", name: "Crystal Sphere", kind: "artifact", cost: 3, tags: ["forbidden","scry"], note: "Find exact location of an object or individual.", source: AF2_OO() },
  { id: "grimoire", name: "Grimoire", kind: "artifact", cost: 3, tags: ["forbidden","attack"], note: "Attack an Enemy from a distance with +1.", source: AF2_OO() },
  { id: "ouija-board", name: "Ouija Board", kind: "artifact", cost: 3, tags: ["forbidden","spirit"], note: "Communicate with restless spirits.", source: AF2_OO() },
  { id: "star-amulet", name: "Star Amulet", kind: "artifact", cost: 3, tags: ["forbidden","reaction"], note: "Gain +1 to a Reaction Roll against an Enemy.", source: AF2_OO() },
  { id: "tarot-deck", name: "Tarot Deck", kind: "artifact", cost: 3, tags: ["forbidden","divination"], note: "Predict a future event.", source: AF2_OO() },

  // ===== Action Flicks 2 — Medieval Saga =====
  { id: "short-bow", name: "Short Bow", kind: "weapon", cost: 2, tags: ["single-shot","handy"], note: "Allows you to shoot arrows.", source: AF2_MS() },
  { id: "heavy-bow", name: "Heavy Bow", kind: "weapon", cost: 3, tags: ["single-shot"], note: "Allows you to shoot arrows with +1.", source: AF2_MS() },
  { id: "ms-crossbow", name: "Crossbow", kind: "weapon", cost: 2, tags: ["single-shot","piercing","slow-reload"], note: "Allows you to shoot bolts.", source: AF2_MS() },
  { id: "chakram", name: "Chakram", kind: "weapon", cost: 1, tags: ["throwing"], source: AF2_MS() },
  { id: "spear", name: "Spear", kind: "weapon", cost: 2, tags: ["piercing","reach","throwing"], source: AF2_MS() },
  { id: "staff-hammer", name: "Staff/Hammer", kind: "weapon", cost: 3, tags: ["impact","reach"], source: AF2_MS() },
  { id: "ms-axe", name: "Axe", kind: "weapon", cost: 2, tags: ["impact","sharp"], source: AF2_MS() },
  { id: "ms-sword", name: "Sword", kind: "weapon", cost: 2, tags: ["sharp"], source: AF2_MS() },
  { id: "ms-shield", name: "Shield", kind: "armor", cost: 3, tags: ["defense"], note: "Help to defend from arrows and bolts.", source: AF2_MS() },
  { id: "ms-armor", name: "Armor", kind: "armor", cost: 1, tags: ["defense","bulky"], note: "Help to Reaction Rolls during combat.", source: AF2_MS() },
  { id: "arrows-bolts-8", name: "Arrows/Bolts (8)", kind: "consumable", cost: 1, tags: ["ammo"], source: AF2_MS() },

  // ===== Action Flicks 2 — District 77 (Police) =====
  { id: "taser-gun", name: "Taser Gun", kind: "weapon", cost: 1, tags: ["issue","non-lethal"], note: "Shoot only within Close range.", source: AF2_D77() },
  { id: "baton", name: "Baton", kind: "weapon", cost: 1, tags: ["issue","melee"], note: "Help to break things.", source: AF2_D77() },
  { id: "issue-handcuffs", name: "Handcuffs", kind: "tool", cost: 1, tags: ["issue","restraint"], note: "Help to incapacitate a target.", source: AF2_D77() },
  { id: "smoke-bomb", name: "Smoke Bomb", kind: "consumable", cost: 1, tags: ["cover"], note: "Creates smoke screen; Partial Cover for 3 Turns.", source: AF2_D77() },
  { id: "rubber-bullets", name: "Rubber Bullets", kind: "consumable", cost: 1, tags: ["issue","non-lethal","rifle-mag"], source: AF2_D77() },

  // ===== Action Flicks 2 — Fury Wasteland =====
  { id: "junk-rifle", name: "Junk Rifle", kind: "weapon", tags: ["junk-shooter","motor","scrap"], note: "Shoot with +1.", source: AF2_FW() },
  { id: "circular-saw", name: "Circular Saw", kind: "weapon", tags: ["heavy-metal","motor","scrap"], note: "Attack with +1.", source: AF2_FW() },
  { id: "flamethrower", name: "Flamethrower", kind: "weapon", tags: ["heavy-metal","inferno","motor","scrap"], source: AF2_FW() },
  { id: "power-armor", name: "Power Armor", kind: "armor", tags: ["heavy-metal","motor"], note: "+1 to all Brawn rolls.", source: AF2_FW() },
  { id: "mechanical-arm", name: "Mechanical Arm", kind: "device", tags: ["augment"], note: "+1 Brawn; -1 Dexterity for actions involving it.", source: AF2_FW() },
  { id: "gasoline", name: "Gasoline", kind: "consumable", tags: ["fuel","motor-weapon"], note: "Reloads a motor weapon.", source: AF2_FW() },

  // ===== Action Flicks 2 — Arcade Endless (Slashers) =====
  { id: "barbed-wire-bat", name: "Barbed-wire Bat", kind: "weapon", cost: 1, tags: ["slasher-1"], source: AF2_AE() },
  { id: "sharp-katana", name: "Sharp Katana", kind: "weapon", cost: 2, tags: ["slasher-2"], source: AF2_AE() },
  { id: "chainsaw", name: "Chainsaw", kind: "weapon", cost: 2, tags: ["motor","slasher-3"], source: AF2_AE() },
  { id: "ae-gasoline", name: "Gasoline", kind: "consumable", cost: 1, tags: ["fuel","motor-weapon"], note: "Reloads a motor weapon.", source: AF2_AE() },

  // ===== Action Flicks 2 — Quirky Toons =====
  { id: "plunger-gun", name: "Plunger Gun", kind: "weapon", tags: ["non-lethal","plunger"], note: "Shoot plungers at a distance.", source: AF2_QT() },
  { id: "plunger-rifle", name: "Plunger Rifle", kind: "weapon", tags: ["non-lethal","plunger"], note: "Shoot plungers at a distance with +1.", source: AF2_QT() },

  // ===== Action Flicks 2 — In-Console (Virtual) =====
  { id: "extra-life", name: "Extra Life (Virtual)", kind: "virtual", tags: ["single-use"], note: "Use the 1 UP! Feat.", source: AF2_IC() },
  { id: "super-mushroom", name: "Super Mushroom (Virtual)", kind: "virtual", cost: 3, tags: ["single-use"], note: "Use the Power Up! Feat.", source: AF2_IC() },
  { id: "small-chest", name: "Small Chest (Virtual)", kind: "virtual", cost: 3, tags: ["single-use"], note: "Use the Heavy Machine Gun Feat.", source: AF2_IC() },
  { id: "flash-bomb-virtual", name: "Flash Bomb (Virtual)", kind: "virtual", cost: 3, tags: ["single-use"], note: "All Heroes auto-succeed in next Reaction Turn.", source: AF2_IC() },
  { id: "skin-virtual", name: "Skin (Virtual)", kind: "virtual", cost: 1, tags: ["disguise"], note: "Disguise yourself with a different appearance.", source: AF2_IC() },
  { id: "old-map-virtual", name: "Old Map (Virtual)", kind: "virtual", cost: 2, tags: ["single-use","teleport"], note: "Teleport to last Time-Out or Camp.", source: AF2_IC() },
  { id: "red-shoes-virtual", name: "Red Shoes (Virtual)", kind: "virtual", cost: 2, tags: ["run","parkour"], note: "Help to run; run on water or ceiling.", source: AF2_IC() },
  { id: "super-star-virtual", name: "Super Star (Virtual)", kind: "virtual", cost: 3, tags: ["invincible","single-use"], note: "3 Turns: cannot lose Grit or suffer Conditions.", source: AF2_IC() },

  // ===== Utility: Credit token (not in your sheet, but needed for flexible grants) =====
  { id: "cash-1", name: "1$ Credit- Exchange for Gear", kind: "cash", cost: 1, tags: ["currency"], note: "Generic buying power unit for flexible grants.", source: OG(99) },
];
