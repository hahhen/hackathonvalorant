/** Local analytical convention, not an official Riot KAST field. */
export const tradeWindowMs = 3000;

export function playerRoundMetrics(raw, player) {
  const teams = new Map(
    raw.players
      .filter((item) => !item.isObserver)
      .map((item) => [item.puuid, item.teamId]),
  );
  const enemy = (kill) =>
    teams.has(kill.killer) &&
    teams.has(kill.victim) &&
    teams.get(kill.killer) !== teams.get(kill.victim);
  const rounds = raw.roundResults.filter((round) =>
    round.playerStats.some((stats) => stats.puuid === player.puuid),
  );
  let firstKills = 0,
    firstDeaths = 0,
    kastRounds = 0;
  const damage = [];
  let damageAvailable = rounds.length > 0;
  for (const round of rounds) {
    const stats = round.playerStats.find(
      (stats) => stats.puuid === player.puuid,
    );
    if (!Array.isArray(stats.damage)) damageAvailable = false;
    damage.push(
      ...(stats.damage ?? []).filter(
        (hit) =>
          teams.has(hit.receiver) && teams.get(hit.receiver) !== player.teamId,
      ),
    );
    const kills = round.playerStats
      .flatMap((stats) => stats.kills ?? [])
      .sort(
        (a, b) => a.timeSinceRoundStartMillis - b.timeSinceRoundStartMillis,
      );
    const firstKill = kills.find(enemy);
    const firstDeath = kills[0];
    // Ties remain tied: don't resolve simultaneity using array order.
    if (
      firstKill &&
      kills.some(
        (kill) =>
          enemy(kill) &&
          kill.timeSinceRoundStartMillis ===
            firstKill.timeSinceRoundStartMillis &&
          kill.killer === player.puuid,
      )
    )
      firstKills++;
    if (
      firstDeath &&
      kills.some(
        (kill) =>
          kill.timeSinceRoundStartMillis ===
            firstDeath.timeSinceRoundStartMillis &&
          kill.victim === player.puuid,
      )
    )
      firstDeaths++;
    const deaths = kills.filter((kill) => kill.victim === player.puuid);
    const k = kills.some((kill) => enemy(kill) && kill.killer === player.puuid);
    const a = kills.some(
      (kill) => enemy(kill) && (kill.assistants ?? []).includes(player.puuid),
    );
    const s = deaths.length === 0;
    const t = deaths.some(
      (death) =>
        enemy(death) &&
        kills.some(
          (kill) =>
            enemy(kill) &&
            kill.victim === death.killer &&
            teams.get(kill.killer) === player.teamId &&
            kill.killer !== player.puuid &&
            kill.timeSinceRoundStartMillis > death.timeSinceRoundStartMillis &&
            kill.timeSinceRoundStartMillis - death.timeSinceRoundStartMillis <=
              tradeWindowMs,
        ),
    );
    if (k || a || s || t) kastRounds++;
  }
  const hitsAvailable = damage.every((hit) =>
    [hit.headshots, hit.bodyshots, hit.legshots].every(Number.isFinite),
  );
  const hits = damage.reduce(
    (sum, hit) => sum + hit.headshots + hit.bodyshots + hit.legshots,
    0,
  );
  return {
    firstKills,
    firstDeaths,
    kastRounds,
    kastPercent: rounds.length
      ? Math.round((kastRounds / rounds.length) * 1000) / 10
      : null,
    adr:
      damageAvailable && damage.every((hit) => Number.isFinite(hit.damage))
        ? Math.round(
            damage.reduce((sum, hit) => sum + hit.damage, 0) / rounds.length,
          )
        : null,
    headshotPercent:
      damageAvailable && hitsAvailable && hits > 0
        ? Math.round(
            (damage.reduce((sum, hit) => sum + hit.headshots, 0) / hits) * 100,
          )
        : null,
  };
}
