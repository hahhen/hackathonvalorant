import type { TeamId } from "@/types/match";

/** Presentation labels; preserve source team IDs and names in the data. */
export const teamLabel = (team: TeamId) =>
  team === "horizon" ? "Meu time" : "Time inimigo";
export const teamShort = (team: TeamId) => (team === "horizon" ? "MT" : "TI");
export const teamColor = (team: TeamId) =>
  team === "horizon" ? "var(--team-friendly)" : "var(--primary)";
