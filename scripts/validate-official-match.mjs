import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { adaptMatch } from "./import-match.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const data = read("src/data/official-match.json");
const maps = read("public/assets/minimaps/manifest.json").maps;
const map = maps.find((map) => map.mapUrl === data.match.mapId);
assert.ok(map?.projectionSupported);
assert.equal(data.match.dataMode, "official-json");
assert.equal(data.rounds.length, 32);
assert.equal(data.players.length, 10);
assert.equal(data.match.teams.horizon.score, 15);
assert.equal(data.match.teams.orbit.score, 17);
const known = new Set(data.players.map((player) => player.id));
let counts = { kill: 0, plant: 0, defuse: 0 };
let projected = 0;
for (const round of data.rounds) {
  assert.ok(round.events.length > 0);
  assert.ok(round.winner === "horizon" || round.winner === "orbit");
  assert.ok(round.attackTeam === "horizon" || round.attackTeam === "orbit");
  for (const [index, event] of round.events.entries()) {
    assert.equal(event.coordinateSpace, "world");
    assert.ok(
      event.timeMs >= 0 &&
        (index === 0 || event.timeMs >= round.events[index - 1].timeMs),
    );
    assert.ok(known.has(event.actorId));
    assert.ok(event.type in counts, "No fabricated detonation event");
    counts[event.type]++;
    if (event.weapon && !["Bandit", "Melee"].includes(event.weapon)) {
      const name = event.weapon.toLowerCase().replace(/[^a-z0-9]/g, "");
      assert.ok(
        existsSync(resolve(root, `public/assets/weapons/${name}-kill.png`)),
      );
    }
    if (event.type === "kill") {
      assert.ok(known.has(event.victimId));
      assert.equal(event.victimPosition.playerId, event.victimId);
      assert.equal(
        event.victimPosition.viewRadians,
        undefined,
        "Never synthesize victim orientation",
      );
    }
    for (const position of event.positions)
      assert.ok(known.has(position.playerId));
    for (const point of [
      ...event.positions,
      event.victimPosition,
      event.objectiveLocation,
    ].filter(Boolean)) {
      const x = point.y * map.xMultiplier + map.xScalarToAdd;
      const y = point.x * map.yMultiplier + map.yScalarToAdd;
      assert.ok(Number.isFinite(x) && Number.isFinite(y));
      assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1);
      projected++;
    }
  }
}
if (process.argv[2]) {
  const bytes = readFileSync(resolve(process.argv[2]));
  const raw = JSON.parse(bytes);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    data.source.sha256,
  );
  const fresh = adaptMatch(raw, data.source.file);
  fresh.source.sha256 = data.source.sha256;
  assert.deepEqual(data, fresh, "Generated data matches source file");
  const ids = new Map(
    raw.players
      .filter((player) => !player.isObserver)
      .map((player, index) => [player.puuid, `p${index + 1}`]),
  );
  let rawKills = 0;
  for (const original of raw.roundResults) {
    const round = data.rounds[original.roundNum];
    const kills = original.playerStats
      .flatMap((stats) => stats.kills)
      .sort(
        (a, b) => a.timeSinceRoundStartMillis - b.timeSinceRoundStartMillis,
      );
    const actual = round.events.filter((event) => event.type === "kill");
    assert.equal(actual.length, kills.length);
    for (const [index, kill] of kills.entries()) {
      const event = actual[index];
      assert.equal(event.timeMs, kill.timeSinceRoundStartMillis);
      assert.equal(event.actorId, ids.get(kill.killer));
      assert.equal(event.victimId, ids.get(kill.victim));
      assert.deepEqual(
        { x: event.victimPosition.x, y: event.victimPosition.y },
        kill.victimLocation,
      );
      assert.deepEqual(
        event.positions,
        kill.playerLocations.map((position) => ({
          playerId: ids.get(position.puuid),
          ...position.location,
          viewRadians: position.viewRadians,
        })),
      );
      rawKills++;
    }
    for (const [type, prefix, actor] of [
      ["plant", "plant", original.bombPlanter],
      ["defuse", "defuse", original.bombDefuser],
    ]) {
      const event = round.events.find((event) => event.type === type);
      assert.equal(!!event, !!actor);
      if (event) {
        assert.equal(event.timeMs, original[`${prefix}RoundTime`]);
        assert.equal(event.actorId, ids.get(actor));
        assert.deepEqual(event.objectiveLocation, original.plantLocation);
        assert.deepEqual(
          event.positions,
          original[`${prefix}PlayerLocations`].map((position) => ({
            playerId: ids.get(position.puuid),
            ...position.location,
            viewRadians: position.viewRadians,
          })),
        );
      }
    }
    assert.equal(
      round.attackTeam,
      original.winningTeamRole === "Attacker"
        ? round.winner
        : round.winner === "horizon"
          ? "orbit"
          : "horizon",
    );
  }
  assert.equal(rawKills, counts.kill);
}
console.log(
  JSON.stringify({
    status: "OK",
    rounds: data.rounds.length,
    events: counts,
    projected,
    sourceCompared: !!process.argv[2],
  }),
);
