export type TeamId = "horizon" | "orbit";
export type View = "overview" | "rounds" | "catalog";
export type EvidenceLevel = "M" | "I";

export type MapName =
  "Ascent" | "Haven" | "Split" | "Bind" | "Lotus" | "Icebox";

export interface MatchInfo {
  id: string;
  map: MapName;
  date: string;
  playedAt: string;
  duration: string;
  competition: string;
  mapId?: string;
  dataMode?: "official-json" | "mock";
  teams: Record<
    TeamId,
    { name: string; short: string; score: number; color: string }
  >;
  agents: Record<TeamId, string[]>;
}

export interface Player {
  id: string;
  name: string;
  tag: string;
  team: TeamId;
  agent: string;
  role: string;
  weapon: string;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number | null;
  headshotPercent: number | null;
  firstKills: number;
  firstDeaths?: number;
  kastPercent?: number | null;
  kastRounds?: number;
  abilityCasts: number;
}

export interface PlayerPosition {
  playerId: string;
  /** Units are declared by MatchEvent.coordinateSpace. */
  x: number;
  y: number;
  viewRadians?: number;
}

export interface MatchEvent {
  id: string;
  type: "kill" | "plant" | "defuse" | "detonate";
  timeMs: number;
  actorId: string;
  victimId?: string;
  weapon?: string;
  damageType?: string;
  damageItem?: string;
  ability?: AbilityReference;
  label: string;
  /** Missing means legacy mock percentages, never official world units. */
  coordinateSpace?: "mock-normalized" | "world";
  positions: PlayerPosition[];
  objectiveLocation?: { x: number; y: number };
  victimPosition?: Pick<PlayerPosition, "playerId" | "x" | "y">;
}

export interface AbilityReference {
  agentId: string;
  slot: string;
  name: string;
  namePtBr: string;
  sprite: string | null;
}

export interface Round {
  number: number;
  winner: TeamId;
  attackTeam: TeamId;
  site?: "A" | "B" | "C";
  result?: string;
  events: MatchEvent[];
  loadouts?: RoundLoadout[];
}

/** Round summary, not a purchase ledger or equipment at the selected event. */
export interface RoundLoadout {
  playerId: string;
  score: number | null;
  kills: number;
  assists: number;
  economy: {
    weaponId: string;
    weapon: string | null;
    armorId: string;
    loadoutValue: number | null;
    remaining: number | null;
    spent: number | null;
  } | null;
}

export interface CoachTip {
  id: string;
  title: string;
  category: string;
  level: EvidenceLevel;
  description: string;
  observation: string;
  limitation: string;
  source: string;
  rounds: number[];
}
