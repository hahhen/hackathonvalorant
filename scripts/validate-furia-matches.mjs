import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import { discoverFuria } from "./import-furia-matches.mjs";
import { adaptMatch } from "./import-match.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const nativeRequire = createRequire(import.meta.url),
  cache = new Map();
function load(path) {
  let filename = resolve(root, path);
  if (!existsSync(filename))
    filename = [".ts", ".tsx", ".json"]
      .map((ext) => filename + ext)
      .find(existsSync);
  assert.ok(filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  if (filename.endsWith(".json"))
    return JSON.parse(readFileSync(filename, "utf8"));
  const module = { exports: {} };
  cache.set(filename, module);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    process,
    console,
    URL,
    Request,
    Response,
    RangeError,
    Error,
    require: (id) =>
      id.startsWith("@/")
        ? load(`src/${id.slice(2)}`)
        : id.startsWith(".")
          ? load(resolve(dirname(filename), id))
          : nativeRequire(id),
  });
  return module.exports;
}
const plain = (value) => JSON.parse(JSON.stringify(value));
const { officialReviews, getOfficialReview } = load(
  "src/data/official-matches.ts",
);
const { selectAnalysis } = load("src/lib/analysis-query.ts");
const { GET } = load("src/app/api/analyses/[id]/route.ts");
assert.equal(officialReviews.length, 12);
let rounds = 0,
  events = 0,
  wins = 0,
  queries = 0;
const roster = new Set();
for (const { file, bytes, raw, team } of discoverFuria()) {
  const review = getOfficialReview(raw.matchInfo.matchId);
  assert.ok(review);
  assert.equal(review.match.teams.horizon.name, "FURIA UTFPR");
  const hash = createHash("sha256").update(bytes).digest("hex");
  assert.equal(review.source.sha256, hash);
  assert.equal(review.source.friendlyTeamId, team);
  const adapted = adaptMatch(raw, file, { friendlyTeamId: team });
  assert.deepEqual(plain(review.players), adapted.players);
  assert.deepEqual(plain(review.rounds), adapted.rounds);
  assert.equal(
    review.match.teams.horizon.score,
    raw.teams.find((t) => t.teamId === team).roundsWon,
  );
  for (const player of review.players) {
    const puuid = review.source.localPlayerToPuuid[player.id],
      original = raw.players.find((p) => p.puuid === puuid);
    assert.ok(original);
    assert.equal(original.gameName, player.name);
    assert.equal(original.tagLine, player.tag);
    assert.equal(player.team === "horizon", original.teamId === team);
    if (player.team === "horizon") roster.add(puuid);
  }
  const engine = JSON.parse(
    readFileSync(resolve(root, `src/data/analyses/${review.match.id}.json`)),
  );
  assert.equal(engine.source.sha256, hash);
  assert.equal(engine.engine.version, "0.4.0");
  const reviewIds = new Set(["010", "013", "025", "030", "062", "072", "079", "084", "093"]);
  assert.ok(engine.recommendations.every((r) => reviewIds.has(r.tipId)));
  assert.equal(new Set(engine.coverage.map((c) => c.detectorId)).size, 100);
  const check = (query) => {
    const slice = selectAnalysis(engine, review, query);
    const target =
      query.kind === "team"
        ? { kind: "team", teamId: team }
        : {
            kind: "player",
            teamId:
              review.players.find((p) => p.id === query.playerId).team ===
              "horizon"
                ? team
                : team === "Blue"
                  ? "Red"
                  : "Blue",
            playerId: review.source.localPlayerToPuuid[query.playerId],
          };
    assert.deepEqual(plain(slice.target), target);
    const selected = engine.recommendations.filter(
      (r) =>
        r.target.kind === target.kind &&
        r.target.teamId === target.teamId &&
        r.target.playerId === target.playerId &&
        r.period.kind === query.period &&
        (query.period !== "round" || r.period.roundNumber === query.round),
    );
    assert.deepEqual(
      plain(slice.tips.map((t) => t.analysis.recommendationId)),
      selected.map((r) => r.id),
    );
    for (const tip of slice.tips) {
      const original = selected.find(
        (r) => r.id === tip.analysis.recommendationId,
      );
      assert.deepEqual(plain(tip.analysis.sample), original.sample);
      assert.deepEqual(plain(tip.rounds), original.roundNumbers);
      assert.ok(tip.analysis.evidence.length);
    }
    queries++;
  };
  check({ kind: "team", period: "match" });
  for (const p of review.players)
    check({ kind: "player", period: "match", playerId: p.id });
  for (const r of review.rounds) {
    check({ kind: "team", period: "round", round: r.number });
    for (const p of review.players)
      check({
        kind: "player",
        period: "round",
        round: r.number,
        playerId: p.id,
      });
  }
  assert.throws(() =>
    selectAnalysis({ ...engine, source: { sha256: "bad" } }, review, {
      kind: "team",
      period: "match",
    }),
  );
  assert.throws(() =>
    selectAnalysis({ ...engine, engine: { ...engine.engine, version: "0.3.0" } }, review, {
      kind: "team",
      period: "match",
    }),
  );
  assert.throws(() =>
    selectAnalysis(engine, review, {
      kind: "player",
      period: "match",
      playerId: "unknown",
    }),
  );
  assert.throws(() =>
    selectAnalysis(engine, review, {
      kind: "team",
      period: "round",
      round: 999,
    }),
  );
  assert.ok(
    existsSync(
      resolve(root, `public/assets/maps/${review.match.map.toLowerCase()}.png`),
    ),
  );
  assert.ok(
    existsSync(
      resolve(
        root,
        `public/assets/minimaps/${review.match.map.toLowerCase()}.png`,
      ),
    ),
  );
  rounds += review.rounds.length;
  events += review.rounds.reduce((n, r) => n + r.events.length, 0);
  wins +=
    review.match.teams.horizon.score > review.match.teams.orbit.score ? 1 : 0;
}
assert.equal(rounds, 237);
assert.equal(roster.size, 5);
assert.equal(wins, 6);
assert.equal(
  getOfficialReview("ca8290e9-82e4-43f0-b0dc-6139ca6219a9"),
  undefined,
);
const id = officialReviews[0].match.id;
const request = (query) =>
  GET(new Request(`http://localhost/api/analyses/${id}?${query}`), {
    params: Promise.resolve({ id }),
  });
assert.equal((await request("kind=team&period=match")).status, 200);
assert.equal(
  (await request("kind=player&period=round&round=1&player=p1")).status,
  200,
);
assert.equal((await request("kind=team&period=round&round=999")).status, 400);
assert.equal(
  (await request("kind=player&period=match&player=unknown")).status,
  400,
);
assert.equal((await request("kind=wrong")).status, 400);
assert.equal(
  (
    await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "../secret" }),
    })
  ).status,
  404,
);
console.log(
  JSON.stringify({
    status: "OK",
    matches: 12,
    stages: [7, 5],
    rounds,
    events,
    wins,
    losses: 12 - wins,
    roster: roster.size,
    verifiedAnalysisQueries: queries,
  }),
);
