import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { playerRoundMetrics, tradeWindowMs } from "./player-round-metrics.mjs";

const players = [
  { puuid: "p", teamId: "Red" },
  { puuid: "q", teamId: "Red" },
  { puuid: "e", teamId: "Blue" },
  { puuid: "f", teamId: "Blue" },
];
const kill = (killer, victim, time, assistants = []) => ({
  killer,
  victim,
  timeSinceRoundStartMillis: time,
  assistants,
});
const round = (kills, damage = []) => ({
  playerStats: players.map((player) => ({
    puuid: player.puuid,
    kills: kills.filter((kill) => kill.killer === player.puuid),
    damage: player.puuid === "p" ? damage : [],
  })),
});
const calculate = (rounds) =>
  playerRoundMetrics({ players, roundResults: rounds }, players[0]);
assert.equal(tradeWindowMs, 3000);
const k = round([kill("p", "e", 100), kill("f", "p", 200)]);
const a = round([kill("q", "e", 100, ["p"]), kill("f", "p", 200)]);
const s = round([]);
const t = round([kill("e", "p", 100), kill("q", "e", 3100)]);
const lost = round([kill("e", "p", 100), kill("q", "e", 3101)]);
assert.equal(calculate([k, a, s, t, lost]).kastPercent, 80);
assert.equal(calculate([k, a, s, t, lost]).kastRounds, 4);
assert.equal(calculate([k, a, s, t, lost]).firstDeaths, 2);
assert.equal(calculate([k, a, s, t, lost]).firstKills, 1);
assert.equal(calculate([round([kill("p", "p", 100)])]).kastPercent, 0);
assert.equal(
  calculate([round([kill("p", "q", 100), kill("e", "p", 200)])]).kastPercent,
  0,
);
assert.equal(
  calculate([round([kill("e", "p", 100), kill("p", "e", 200)])]).kastPercent,
  100,
);
assert.equal(
  calculate([round([kill("e", "p", 100), kill("f", "p", 200)])]).firstDeaths,
  1,
);
assert.equal(
  calculate([round([kill("e", "q", 100), kill("f", "p", 100)])]).firstDeaths,
  1,
);
const damage = [
  { receiver: "e", damage: 150, headshots: 1, bodyshots: 2, legshots: 1 },
  { receiver: "q", damage: 999, headshots: 99, bodyshots: 0, legshots: 0 },
];
assert.equal(calculate([round([], damage), round([])]).adr, 75);
assert.equal(calculate([round([], damage)]).headshotPercent, 25);
assert.equal(calculate([round([])]).headshotPercent, null);
assert.equal(calculate([]).kastPercent, null);
const missing = round([]);
delete missing.playerStats[0].damage;
assert.equal(calculate([missing]).adr, null);

const data = JSON.parse(
  readFileSync(
    new URL("../src/data/official-match.json", import.meta.url),
    "utf8",
  ),
);
assert.equal(
  data.players.reduce((sum, p) => sum + p.firstDeaths, 0),
  32,
);
assert.equal(
  data.players.reduce((sum, p) => sum + p.firstKills, 0),
  32,
);
for (const player of data.players) {
  assert.ok(player.kastPercent >= 0 && player.kastPercent <= 100);
  assert.equal(
    player.kastPercent,
    Math.round((player.kastRounds / 32) * 1000) / 10,
  );
}
console.log(
  "OK: FK/FD, K/A/S/T, janela de 3 s, suicídio, fogo amigo, mortes repetidas, empates, ADR e HS% com ausência de dados.",
);
