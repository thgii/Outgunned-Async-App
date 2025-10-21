// shared/src/gear-grants.ts
export type GearSelector =
  | { type: "ids"; ids: string[] } // exact catalog IDs
  | { type: "kind"; kind: "weapon"|"ride"|"armor"|"kit"|"tool"|"device"|"outfit"|"consumable"|"cash"|"companion"|"artifact"|"virtual"|"misc"; limit?: number }
  | { type: "tags"; anyOf?: string[]; allOf?: string[]; limit?: number }
  | { type: "ride"; speed?: number; minSpeed?: number; maxSpeed?: number; types?: Array<"car"|"bike"|"nautical"|"flying"|"armored">; armored?: boolean }
  | { type: "custom"; label: string; constraint?: { maxCost?: number; costEq?: number; kind?: string } };
  | { type: "union"; options: GearSelector[] };

export type GearGrant =
  | { mode: "give"; items: string[] }                           // auto-grant these catalog IDs
  | { mode: "choose"; of: GearSelector; count: number }         // user chooses N
  | { mode: "credit"; amount: number; label?: string };         // $ to spend in a picker
