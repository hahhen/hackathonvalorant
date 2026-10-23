import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { adaptMatch } from "./import-match.mjs";
import { uspSources } from "./import-usp-matches.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sources = uspSources.map((source) => {
  const bytes = readFileSync(
    resolve(root, "Dados .Json/Univavá/Classificatória 4", source.file),
  );
  return { source, bytes, raw: JSON.parse(bytes) };
});
assert.equal(sources.length, 4);
const rosterIds = new Set();
let rounds = 0,
  events = 0;
for (const { source, bytes, raw } of sources) {
  const data = JSON.parse(
    readFileSync(
      resolve(root, `src/data/matches/${raw.matchInfo.matchId}.json`),
      "utf8",
    ),
  );
  assert.equal(
    data.source.sha256,
    createHash("sha256").update(bytes).digest("hex"),
  );
  assert.equal(data.source.friendlyTeamId, source.team);
  assert.equal(data.match.teams.horizon.score, 13);
  assert.equal(data.match.teams.horizon.name, "USP Stars");
  assert.equal(data.match.teams.orbit.name, source.opponent);
  assert.equal(data.players.length, 10);
  assert.equal(
    data.players.filter((player) => player.team === "horizon").length,
    5,
  );
  const usp = raw.players.filter((player) => player.teamId === source.team);
  for (const player of usp) rosterIds.add(player.puuid);
  assert.equal(usp.length, 5);
  const expected = adaptMatch(raw, source.file, {
    friendlyTeamId: source.team,
  });
  assert.deepEqual(data.players, expected.players);
  assert.deepEqual(data.rounds, expected.rounds);
  for (const [index, round] of data.rounds.entries()) {
    assert.equal(round.loadouts.length, 10);
    for (const [playerIndex, summary] of round.loadouts.entries()) {
      const stats = raw.roundResults[index].playerStats[playerIndex];
      assert.deepEqual(
        summary.economy && {
          weapon: summary.economy.weaponId,
          armor: summary.economy.armorId,
          loadoutValue: summary.economy.loadoutValue,
          remaining: summary.economy.remaining,
          spent: summary.economy.spent,
        },
        stats.economy,
      );
      assert.equal(summary.score, stats.score);
      assert.equal(summary.kills, stats.kills.length);
    }
  }
  assert.equal(
    data.match.teams.horizon.score,
    expected.match.teams.horizon.score,
  );
  assert.equal(data.match.teams.orbit.score, expected.match.teams.orbit.score);
  for (const key of ["opening", "trades", "postplant"]) {
    assert.equal(data.metrics[key].value, expected.metrics[key].value);
    assert.equal(
      data.metrics[key].detail,
      expected.metrics[key].detail.replace(`· ${source.team}`, "· Meu time"),
    );
  }
  assert.ok(
    existsSync(
      resolve(root, `public/assets/maps/${data.match.map.toLowerCase()}.png`),
    ),
  );
  assert.ok(
    existsSync(
      resolve(
        root,
        `public/assets/minimaps/${data.match.map.toLowerCase()}.png`,
      ),
    ),
  );
  rounds += data.rounds.length;
  events += data.rounds.reduce(
    (total, round) => total + round.events.length,
    0,
  );
}
assert.equal(
  rosterIds.size,
  5,
  "The same USP Stars roster in all four original JSONs",
);
console.log(
  JSON.stringify({
    status: "OK",
    matches: sources.length,
    rounds,
    events,
    sameUspPlayers: rosterIds.size,
    ceubFriendlySide: "Blue",
  }),
);
