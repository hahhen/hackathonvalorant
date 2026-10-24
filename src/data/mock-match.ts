import type {
  CoachTip,
  MatchEvent,
  Player,
  PlayerPosition,
  Round,
  TeamId,
  MatchInfo,
} from "@/types/match";
import { demoMatches } from "@/data/mock-library";
import { getTacticalTip, tipCategories } from "@/data/tactical-catalog";

/** All statistics, names, events and coordinates below are fictional UI fixtures. */
export const match = demoMatches[0];

export const players: Player[] = [
  {
    id: "h1",
    name: "noah",
    tag: "HRZ",
    team: "horizon",
    agent: "Jett",
    role: "Duelista",
    weapon: "Operator",
    kills: 24,
    deaths: 17,
    assists: 4,
    acs: 284,
    adr: 179,
    headshotPercent: 32,
    firstKills: 6,
    abilityCasts: 47,
  },
  {
    id: "h2",
    name: "atlas",
    tag: "HRZ",
    team: "horizon",
    agent: "Sova",
    role: "Iniciador",
    weapon: "Vandal",
    kills: 19,
    deaths: 16,
    assists: 9,
    acs: 242,
    adr: 156,
    headshotPercent: 28,
    firstKills: 3,
    abilityCasts: 63,
  },
  {
    id: "h3",
    name: "kiro",
    tag: "HRZ",
    team: "horizon",
    agent: "Omen",
    role: "Controlador",
    weapon: "Phantom",
    kills: 17,
    deaths: 16,
    assists: 11,
    acs: 219,
    adr: 141,
    headshotPercent: 26,
    firstKills: 1,
    abilityCasts: 72,
  },
  {
    id: "h4",
    name: "lumi",
    tag: "HRZ",
    team: "horizon",
    agent: "Killjoy",
    role: "Sentinela",
    weapon: "Vandal",
    kills: 14,
    deaths: 18,
    assists: 7,
    acs: 186,
    adr: 123,
    headshotPercent: 31,
    firstKills: 1,
    abilityCasts: 58,
  },
  {
    id: "h5",
    name: "echo",
    tag: "HRZ",
    team: "horizon",
    agent: "KAY/O",
    role: "Iniciador",
    weapon: "Phantom",
    kills: 12,
    deaths: 17,
    assists: 14,
    acs: 171,
    adr: 118,
    headshotPercent: 22,
    firstKills: 2,
    abilityCasts: 81,
  },
  {
    id: "o1",
    name: "zen",
    tag: "ORB",
    team: "orbit",
    agent: "Raze",
    role: "Duelista",
    weapon: "Vandal",
    kills: 22,
    deaths: 18,
    assists: 6,
    acs: 263,
    adr: 170,
    headshotPercent: 29,
    firstKills: 4,
    abilityCasts: 54,
  },
  {
    id: "o2",
    name: "vex",
    tag: "ORB",
    team: "orbit",
    agent: "Reyna",
    role: "Duelista",
    weapon: "Vandal",
    kills: 19,
    deaths: 17,
    assists: 3,
    acs: 235,
    adr: 149,
    headshotPercent: 35,
    firstKills: 3,
    abilityCasts: 39,
  },
  {
    id: "o3",
    name: "mako",
    tag: "ORB",
    team: "orbit",
    agent: "Brimstone",
    role: "Controlador",
    weapon: "Phantom",
    kills: 17,
    deaths: 16,
    assists: 10,
    acs: 208,
    adr: 135,
    headshotPercent: 23,
    firstKills: 1,
    abilityCasts: 66,
  },
  {
    id: "o4",
    name: "nix",
    tag: "ORB",
    team: "orbit",
    agent: "Cypher",
    role: "Sentinela",
    weapon: "Spectre",
    kills: 15,
    deaths: 17,
    assists: 8,
    acs: 191,
    adr: 126,
    headshotPercent: 25,
    firstKills: 1,
    abilityCasts: 60,
  },
  {
    id: "o5",
    name: "sol",
    tag: "ORB",
    team: "orbit",
    agent: "Sage",
    role: "Sentinela",
    weapon: "Sheriff",
    kills: 11,
    deaths: 18,
    assists: 13,
    acs: 164,
    adr: 108,
    headshotPercent: 21,
    firstKills: 0,
    abilityCasts: 49,
  },
];

export const getPlayer = (id: string) =>
  players.find((player) => player.id === id)!;

const winners: TeamId[] = [
  "horizon",
  "horizon",
  "orbit",
  "horizon",
  "orbit",
  "horizon",
  "orbit",
  "orbit",
  "horizon",
  "horizon",
  "horizon",
  "orbit",
  "horizon",
  "orbit",
  "horizon",
  "horizon",
  "horizon",
  "orbit",
  "horizon",
  "orbit",
  "orbit",
  "horizon",
];

function createEvents(
  round: number,
  attackTeam: TeamId,
  winner: TeamId,
): MatchEvent[] {
  const attackers = players.filter((player) => player.team === attackTeam);
  const defenders = players.filter((player) => player.team !== attackTeam);
  const templates = [
    {
      type: "kill" as const,
      timeMs: 6700,
      actorId: attackers[0].id,
      victimId: defenders[4].id,
      weapon: "Vandal",
      label: "Primeira eliminação",
    },
    {
      type: "kill" as const,
      timeMs: 8300,
      actorId: defenders[1].id,
      victimId: attackers[0].id,
      weapon: "Vandal",
      label: "Retaliação em 1,6 s",
    },
    {
      type: "plant" as const,
      timeMs: 44200,
      actorId: attackers[1].id,
      label: "Spike plantada no B",
    },
    {
      type: "kill" as const,
      timeMs: 51600,
      actorId: defenders[1].id,
      victimId: attackers[2].id,
      weapon: "Phantom",
      label: "Disputa do afterplant",
    },
    {
      type: "kill" as const,
      timeMs: 54300,
      actorId: attackers[4].id,
      victimId: defenders[1].id,
      weapon: "Vandal",
      label: "Retaliação em 2,7 s",
    },
    {
      type: winner === attackTeam ? ("detonate" as const) : ("defuse" as const),
      timeMs: winner === attackTeam ? 89200 : 74800,
      actorId: winner === attackTeam ? attackers[1].id : defenders[3].id,
      label: winner === attackTeam ? "Spike detonada" : "Spike desarmada",
    },
  ];
  const dead = new Set<string>();
  return templates.map((template, index) => {
    const position = (player: Player): PlayerPosition => {
      const offset = Number(player.id[1]) - 1;
      const isAttacker = player.team === attackTeam;
      return {
        playerId: player.id,
        x: (isAttacker ? 24 : 67) + ((offset * 9 + round * 2 + index * 3) % 20),
        y: (isAttacker ? 44 : 26) + ((offset * 13 + index * 5 + round) % 31),
        viewRadians: isAttacker ? -0.7 + offset * 0.42 : 2.1 + offset * 0.31,
      };
    };
    const victimPosition =
      "victimId" in template && template.victimId
        ? position(getPlayer(template.victimId))
        : undefined;
    if ("victimId" in template && template.victimId)
      dead.add(template.victimId);
    return {
      ...template,
      id: `r${round}-e${index}`,
      coordinateSpace: "mock-normalized",
      positions: players.filter((player) => !dead.has(player.id)).map(position),
      victimPosition,
    };
  });
}

export const rounds: Round[] = winners.map((winner, index) => {
  const number = index + 1;
  const attackTeam: TeamId = number <= 12 ? "orbit" : "horizon";
  return {
    number,
    winner,
    attackTeam,
    site: "B",
    events: createEvents(number, attackTeam, winner),
  };
});

export function createReviewData(info: MatchInfo) {
  const agentRoles: Record<string, string> = {
    Jett: "Duelista",
    Raze: "Duelista",
    Reyna: "Duelista",
    Neon: "Duelista",
    Yoru: "Duelista",
    Iso: "Duelista",
    Phoenix: "Duelista",
    Sova: "Iniciador",
    Skye: "Iniciador",
    Breach: "Iniciador",
    Fade: "Iniciador",
    Gekko: "Iniciador",
    "KAY/O": "Iniciador",
    Omen: "Controlador",
    Brimstone: "Controlador",
    Viper: "Controlador",
    Astra: "Controlador",
    Harbor: "Controlador",
    Clove: "Controlador",
    Killjoy: "Sentinela",
    Cypher: "Sentinela",
    Sage: "Sentinela",
    Chamber: "Sentinela",
    Deadlock: "Sentinela",
  };
  const roster = players.map((player, index) => {
    const agent = info.agents[player.team][index % 5];
    return { ...player, agent, role: agentRoles[agent] ?? player.role };
  });
  if (info.id === match.id) return { players: roster, rounds };
  const winningTeam: TeamId =
    info.teams.horizon.score > info.teams.orbit.score ? "horizon" : "orbit";
  const remaining = {
    horizon: info.teams.horizon.score,
    orbit: info.teams.orbit.score,
  };
  remaining[winningTeam] -= 1;
  const sequence: TeamId[] = [];
  while (remaining.horizon + remaining.orbit > 0) {
    const preferred: TeamId = sequence.length % 3 === 0 ? "orbit" : "horizon";
    const winner: TeamId =
      remaining[preferred] > 0
        ? preferred
        : preferred === "horizon"
          ? "orbit"
          : "horizon";
    sequence.push(winner);
    remaining[winner] -= 1;
  }
  sequence.push(winningTeam);
  return {
    players: roster,
    rounds: sequence.map((winner, index): Round => {
      const number = index + 1;
      const attackTeam: TeamId =
        number <= 12
          ? "orbit"
          : number <= 24
            ? "horizon"
            : number % 2
              ? "orbit"
              : "horizon";
      return {
        number,
        winner,
        attackTeam,
        site: "B",
        events: createEvents(number, attackTeam, winner),
      };
    }),
  };
}

/** Presentation fixtures only: not derived from events and not detector outputs. */
const findingSeeds = [
  {
    id: "025",
    observation:
      "Exemplo de primeira eliminação seguida de derrota; revisar a conversão da vantagem.",
    rounds: [7, 14, 18],
  },
  {
    id: "023",
    observation:
      "Exemplo de posições próximas entre amostras após uma kill, com retaliação posterior.",
    rounds: [8, 18],
  },
  {
    id: "008",
    observation:
      "Exemplo de diferença entre os equipamentos registrados dos cinco jogadores.",
    rounds: [3, 15],
  },
  {
    id: "040",
    observation:
      "Exemplo de mortes e respostas para comparar janelas de troca de 1, 3 e 5 segundos.",
    rounds: [4, 12, 20],
  },
  {
    id: "058",
    observation:
      "Exemplo de plant concluído em desvantagem numérica para revisar a preparação do espaço.",
    rounds: [10, 18],
  },
  {
    id: "063",
    observation:
      "Exemplo de afterplant para comparar vitória por objetivo, eliminação e defuse sofrido.",
    rounds: [16, 21],
  },
  {
    id: "079",
    observation:
      "Exemplo de vantagem numérica perdida em uma sequência de mortes para o último adversário.",
    rounds: [14],
  },
  {
    id: "081",
    observation:
      "Exemplo de pick de Operator para comparar a posição em eventos seguintes.",
    rounds: [9, 17],
  },
  {
    id: "094",
    observation:
      "Exemplo de orientação anterior da vítima voltada para longe do killer; não confirma morte pelas costas.",
    rounds: [11],
  },
  {
    id: "096",
    observation:
      "Exemplo de finalização por habilidade para revisar sua relação temporal com o objetivo.",
    rounds: [6, 19],
  },
];

export function createMockCoachTips(info: MatchInfo): CoachTip[] {
  const total = info.teams.horizon.score + info.teams.orbit.score;
  return findingSeeds.flatMap((seed) => {
    const tip = getTacticalTip(seed.id);
    const relatedRounds = seed.rounds.filter((round) => round <= total);
    if (!relatedRounds.length) return [];
    return [
      {
        id: tip.id,
        title: tip.titulo,
        category: tipCategories.find((category) => category.id === tip.tipo)!
          .nome,
        level:
          tip.classificacao === "mensuravel" ? ("M" as const) : ("I" as const),
        description: tip.descricao,
        observation: seed.observation,
        limitation: tip.inferencia.limites,
        source: "Referência tática · " + tip.origem,
        rounds: relatedRounds,
      },
    ];
  });
}

export const timeLabel = (ms: number) =>
  `${Math.floor(ms / 60000)
    .toString()
    .padStart(2, "0")}:${Math.floor((ms % 60000) / 1000)
    .toString()
    .padStart(2, "0")}`;
