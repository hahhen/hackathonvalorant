import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { playerRoundMetrics } from "./player-round-metrics.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const assets = JSON.parse(
  readFileSync(resolve(root, "public/assets/manifest.json"), "utf8"),
).assets;
const ids = JSON.parse(
  readFileSync(resolve(root, "src/data/valorant-ids.json"), "utf8"),
);
const maps = JSON.parse(
  readFileSync(resolve(root, "public/assets/minimaps/manifest.json"), "utf8"),
).maps;
const asset = (kind, id) => ({
  name:
    ids[kind]?.[String(id).toLowerCase()] ??
    assets.find(
      (item) =>
        item.kind === kind &&
        item.id.toLowerCase() === String(id).toLowerCase(),
    )?.name,
});
const normalizeTeamId = (id, friendlyTeamId) => {
  if (id === "Red" || id === "Blue") return id === friendlyTeamId ? "horizon" : "orbit";
  throw new Error(`Unsupported team: ${id}`);
};
const other = (id) => (id === "horizon" ? "orbit" : "horizon");
const location = (point) => {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y))
    throw new Error("Invalid world location");
  return { x: point.x, y: point.y };
};
const roles = ids.roles;

export function adaptMatch(raw, sourceName = "partida.json", options = {}) {
  const friendlyTeamId = options.friendlyTeamId ?? "Red";
  const teamId = id => normalizeTeamId(id, friendlyTeamId);
  const map = maps.find((map) => map.mapUrl === raw.matchInfo.mapId);
  if (
    !map ||
    !["Ascent", "Haven", "Split", "Bind", "Lotus", "Icebox"].includes(map.name)
  )
    throw new Error("Map not supported by the match library");
  const sourcePlayers = raw.players.filter((player) => !player.isObserver);
  const ids = new Map(
    sourcePlayers.map((player, index) => [player.puuid, `p${index + 1}`]),
  );
  const playerId = (puuid) => {
    const id = ids.get(puuid);
    if (!id) throw new Error("Event references an unknown player");
    return id;
  };
  const snapshots = (entries) =>
    (entries ?? []).map((entry) => ({
      playerId: playerId(entry.puuid),
      ...location(entry.location),
      ...(Number.isFinite(entry.viewRadians)
        ? { viewRadians: entry.viewRadians }
        : {}),
    }));
  const sortedRounds = [...raw.roundResults].sort(
    (a, b) => a.roundNum - b.roundNum,
  );
  const rounds = sortedRounds.map((round, index) => {
    if (round.roundNum !== index)
      throw new Error("Expected contiguous zero-based round numbers");
    const winner = teamId(round.winningTeam);
    if (!["Attacker", "Defender"].includes(round.winningTeamRole))
      throw new Error("Missing winning team role");
    const attackTeam =
      round.winningTeamRole === "Attacker" ? winner : other(winner);
    const kills = round.playerStats
      .flatMap((stats) => stats.kills ?? [])
      .sort(
        (a, b) => a.timeSinceRoundStartMillis - b.timeSinceRoundStartMillis,
      );
    const events = kills.map((kill, killIndex) => {
      const weapon =
        kill.finishingDamage.damageType === "Weapon"
          ? asset("weapons", kill.finishingDamage.damageItem)?.name
          : undefined;
      return {
        id: `r${index + 1}-k${killIndex}`,
        type: "kill",
        timeMs: kill.timeSinceRoundStartMillis,
        actorId: playerId(kill.killer),
        victimId: playerId(kill.victim),
        ...(weapon ? { weapon } : {}),
        damageType: kill.finishingDamage.damageType,
        damageItem: kill.finishingDamage.damageItem,
        label:
          kill.finishingDamage.damageType === "Bomb"
            ? "Morte pela spike"
            : kill.finishingDamage.damageType === "Ability"
              ? kill.finishingDamage.damageItem === "Ultimate"
                ? "Eliminação com ultimate"
                : "Eliminação com habilidade"
              : weapon
                ? "Eliminação"
                : "Eliminação · arma não catalogada",
        coordinateSpace: "world",
        positions: snapshots(kill.playerLocations),
        victimPosition: {
          playerId: playerId(kill.victim),
          ...location(kill.victimLocation),
        },
      };
    });
    if (round.bombPlanter && Number.isFinite(round.plantRoundTime))
      events.push({
        id: `r${index + 1}-plant`,
        type: "plant",
        timeMs: round.plantRoundTime,
        actorId: playerId(round.bombPlanter),
        label: `Spike plantada${round.plantSite ? ` no ${round.plantSite}` : ""}`,
        coordinateSpace: "world",
        positions: snapshots(round.plantPlayerLocations),
        objectiveLocation: location(round.plantLocation),
      });
    if (round.bombDefuser && Number.isFinite(round.defuseRoundTime))
      events.push({
        id: `r${index + 1}-defuse`,
        type: "defuse",
        timeMs: round.defuseRoundTime,
        actorId: playerId(round.bombDefuser),
        label: "Spike desarmada",
        coordinateSpace: "world",
        positions: snapshots(round.defusePlayerLocations),
        objectiveLocation: location(round.plantLocation),
      });
    events.sort((a, b) => a.timeMs - b.timeMs);
    if (
      events.some((event) => !Number.isFinite(event.timeMs) || event.timeMs < 0)
    )
      throw new Error("Invalid event timestamp");
    return {
      number: index + 1,
      winner,
      attackTeam,
      ...(round.plantSite ? { site: round.plantSite } : {}),
      result: round.roundResultCode || round.roundResult,
      events,
    };
  });
  const players = sourcePlayers.map((player) => {
    const agent = asset("agents", player.characterId)?.name;
    if (!agent) throw new Error("Unknown agent asset");
    const perRound = sortedRounds.flatMap((round) =>
      round.playerStats.filter((stats) => stats.puuid === player.puuid),
    );
    const loadouts = perRound
      .map((stats) => asset("weapons", stats.economy.weapon)?.name)
      .filter(Boolean);
    const weapon = [...new Set(loadouts)].sort(
      (a, b) =>
        loadouts.filter((item) => item === b).length -
        loadouts.filter((item) => item === a).length,
    )[0];
    return {
      id: playerId(player.puuid),
      name: player.gameName,
      tag: player.tagLine,
      team: teamId(player.teamId),
      agent,
      role: roles[agent] ?? "Agente",
      weapon: weapon ?? "",
      kills: player.stats.kills,
      deaths: player.stats.deaths,
      assists: player.stats.assists,
      acs: Math.round(player.stats.score / player.stats.roundsPlayed),
      ...playerRoundMetrics(raw, player),
      abilityCasts: Object.values(player.stats.abilityCasts ?? {}).reduce(
        (sum, value) => sum + value,
        0,
      ),
    };
  });
  const lookup = (id) => players.find((player) => player.id === id);
  const opening = rounds.filter(
    (round) =>
      lookup(
        round.events.find(
          (event) => event.type === "kill" && event.damageType !== "Bomb",
        )?.actorId,
      )?.team === "horizon",
  );
  const deaths = rounds.flatMap((round) =>
    round.events
      .filter(
        (event) =>
          event.type === "kill" && lookup(event.victimId)?.team === "horizon",
      )
      .map((event) => ({ event, round })),
  );
  const answered = deaths.filter(
    ({ event, round }) =>
      event.actorId !== event.victimId &&
      round.events.some(
        (next) =>
          next.type === "kill" &&
          next.victimId === event.actorId &&
          lookup(next.actorId)?.team === "horizon" &&
          next.timeMs > event.timeMs &&
          next.timeMs - event.timeMs <= 3000,
      ),
  );
  const plants = rounds.filter(
    (round) =>
      lookup(round.events.find((event) => event.type === "plant")?.actorId)
        ?.team === "horizon",
  );
  const metric = (success, total, suffix) => ({
    value: total ? String(Math.round((success / total) * 100)) : "—",
    detail: `${success} de ${total} ${suffix} · ${friendlyTeamId}`,
  });
  const teams = Object.fromEntries(
    raw.teams.map((team) => [
      teamId(team.teamId),
      {
        name: `Equipe ${team.teamId}`,
        short: team.teamId.toUpperCase(),
        score: team.roundsWon,
        color: team.teamId === "Red" ? "var(--foreground)" : "var(--primary)",
      },
    ]),
  );
  for (const [id, team] of Object.entries(teams))
    if (rounds.filter((round) => round.winner === id).length !== team.score)
      throw new Error("Round winners do not match final score");
  const playedAt = new Date(raw.matchInfo.gameStartMillis).toISOString();
  const durationSeconds = Math.floor(raw.matchInfo.gameLengthMillis / 1000);
  return {
    source: {
      file: sourceName,
      matchId: raw.matchInfo.matchId,
      gameVersion: raw.matchInfo.gameVersion,
      notes: [
        "Team labels Red/Blue come from the JSON, not inferred organization names.",
        "Detonation has a round result but no exact timestamp/snapshot; no event fabricated.",
        "Snapshot membership is preserved, not a computed alive count.",
      ],
    },
    match: {
      id: raw.matchInfo.matchId,
      map: map.name,
      mapId: raw.matchInfo.mapId,
      dataMode: "official-json",
      playedAt,
      date: new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(playedAt)),
      duration: `${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, "0")}`,
      competition: "Partida do JSON",
      teams,
      agents: Object.fromEntries(
        ["horizon", "orbit"].map((team) => [
          team,
          players
            .filter((player) => player.team === team)
            .map((player) => player.agent),
        ]),
      ),
    },
    players,
    rounds,
    metrics: {
      opening: metric(
        opening.filter((round) => round.winner === "horizon").length,
        opening.length,
        "rounds",
      ),
      trades: metric(answered.length, deaths.length, "mortes"),
      postplant: metric(
        plants.filter((round) => round.winner === "horizon").length,
        plants.length,
        "plants",
      ),
    },
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const input = process.argv[2];
  if (!input)
    throw new Error(
      "Usage: node scripts/import-match.mjs <official-match.json>",
    );
  const bytes = readFileSync(resolve(input));
  const data = adaptMatch(JSON.parse(bytes), basename(input));
  data.source.sha256 = createHash("sha256").update(bytes).digest("hex");
  const output = resolve(root, "src/data/official-match.json");
  writeFileSync(output, JSON.stringify(data) + "\n");
  console.log(
    JSON.stringify({
      output,
      rounds: data.rounds.length,
      players: data.players.length,
      events: data.rounds.reduce((sum, round) => sum + round.events.length, 0),
    }),
  );
}
