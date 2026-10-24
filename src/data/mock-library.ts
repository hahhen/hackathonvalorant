import type { MapName, MatchInfo } from "@/types/match";

export const mapNames: MapName[] = [
  "Ascent",
  "Haven",
  "Split",
  "Bind",
  "Lotus",
  "Icebox",
];

export const mapRosters: Record<
  Exclude<MapName, "Sunset" | "Summit">,
  MatchInfo["agents"]
> = {
  Ascent: {
    horizon: ["Jett", "Sova", "Omen", "Killjoy", "KAY/O"],
    orbit: ["Raze", "Reyna", "Brimstone", "Cypher", "Sage"],
  },
  Haven: {
    horizon: ["Jett", "Breach", "Omen", "Cypher", "Sova"],
    orbit: ["Neon", "Skye", "Brimstone", "Killjoy", "Sage"],
  },
  Split: {
    horizon: ["Raze", "Skye", "Omen", "Cypher", "Sage"],
    orbit: ["Jett", "Breach", "Astra", "Killjoy", "Viper"],
  },
  Bind: {
    horizon: ["Raze", "Skye", "Brimstone", "Viper", "Cypher"],
    orbit: ["Jett", "Fade", "Omen", "Killjoy", "Sage"],
  },
  Lotus: {
    horizon: ["Raze", "Fade", "Omen", "Killjoy", "Viper"],
    orbit: ["Jett", "Breach", "Astra", "Cypher", "Skye"],
  },
  Icebox: {
    horizon: ["Jett", "Sova", "Viper", "Killjoy", "Sage"],
    orbit: ["Reyna", "Gekko", "Harbor", "Cypher", "KAY/O"],
  },
};

export function makeDemoMatch(
  id: string,
  map: MapName,
  score: [number, number],
  playedAt: string,
  duration = "42:18",
): MatchInfo {
  return {
    id,
    map,
    playedAt,
    duration,
    date: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(playedAt)),
    competition: "Personalizada",
    teams: {
      horizon: {
        name: "Horizon",
        short: "HRZ",
        score: score[0],
        color: "var(--foreground)",
      },
      orbit: {
        name: "Orbit",
        short: "ORB",
        score: score[1],
        color: "var(--primary)",
      },
    },
    agents: mapRosters[map as keyof typeof mapRosters] ?? mapRosters.Ascent,
  };
}

export const demoMatches: MatchInfo[] = [
  makeDemoMatch(
    "demo-ascent-001",
    "Ascent",
    [13, 9],
    "2026-10-23T18:30:00-03:00",
  ),
  makeDemoMatch(
    "demo-haven-002",
    "Haven",
    [9, 13],
    "2026-10-23T17:00:00-03:00",
    "38:42",
  ),
  makeDemoMatch(
    "demo-split-003",
    "Split",
    [13, 11],
    "2026-10-22T20:00:00-03:00",
    "46:10",
  ),
  makeDemoMatch(
    "demo-bind-004",
    "Bind",
    [13, 8],
    "2026-10-22T19:00:00-03:00",
    "35:28",
  ),
  makeDemoMatch(
    "demo-lotus-005",
    "Lotus",
    [11, 13],
    "2026-10-21T21:00:00-03:00",
    "44:56",
  ),
  makeDemoMatch(
    "demo-icebox-006",
    "Icebox",
    [13, 10],
    "2026-10-21T19:30:00-03:00",
    "41:07",
  ),
];

export const matchStorageKey = "afterplant.demo-matches.v1";

export function readSavedMatches(): MatchInfo[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(matchStorageKey) ?? "[]",
    );
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is MatchInfo => {
      if (!item || typeof item !== "object") return false;
      const m = item as Partial<MatchInfo>;
      return (
        typeof m.id === "string" &&
        typeof m.playedAt === "string" &&
        !Number.isNaN(Date.parse(m.playedAt)) &&
        mapNames.includes(m.map as MapName) &&
        Number.isInteger(m.teams?.horizon?.score) &&
        Number.isInteger(m.teams?.orbit?.score) &&
        Number(m.teams?.horizon?.score) >= 0 &&
        Number(m.teams?.horizon?.score) <= 30 &&
        Number(m.teams?.orbit?.score) >= 0 &&
        Number(m.teams?.orbit?.score) <= 30 &&
        m.teams?.horizon?.score !== m.teams?.orbit?.score &&
        Array.isArray(m.agents?.horizon) &&
        m.agents.horizon.length === 5 &&
        m.agents.horizon.every((agent) => typeof agent === "string") &&
        Array.isArray(m.agents?.orbit) &&
        m.agents.orbit.length === 5 &&
        m.agents.orbit.every((agent) => typeof agent === "string")
      );
    });
  } catch {
    return [];
  }
}
