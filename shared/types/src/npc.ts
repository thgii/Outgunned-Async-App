export type NpcSide = 'ally' | 'enemy';
export type EnemyType = 'goon' | 'bad_guy' | 'boss';
export type Level3 = 'Basic' | 'Critical' | 'Extreme';

export type Npc = {
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

  created_at?: number;
  updated_at?: number;
};
