import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = fileURLToPath(new URL("../", import.meta.url));
const nativeRequire = createRequire(import.meta.url);
const cache = new Map();
function load(path) {
  let filename = resolve(root, path);
  if (!existsSync(filename))
    filename = [".ts", ".tsx", ".json"]
      .map((ext) => filename + ext)
      .find(existsSync);
  assert.ok(filename, `Module not found: ${path}`);
  if (cache.has(filename)) return cache.get(filename).exports;
  if (filename.endsWith(".json"))
    return JSON.parse(readFileSync(filename, "utf8"));
  const module = { exports: {} };
  cache.set(filename, module);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (id) => {
      if (id.startsWith("@/")) return load(`src/${id.slice(2)}`);
      if (id.startsWith(".")) return load(resolve(dirname(filename), id));
      return nativeRequire(id);
    },
  });
  return module.exports;
}

const { TacticalMinimap } = load("src/components/review/tactical-minimap.tsx");
const { demoMatches } = load("src/data/mock-library.ts");
const { createReviewData } = load("src/data/mock-match.ts");
const { findMinimap, minimapToWorld } = load("src/lib/minimap.ts");
const { projectInspectorPoint, projectInspectorHeading, snapshotObjective } =
  load("src/lib/inspector-projection.ts");
const count = (html, name) =>
  (html.match(new RegExp(`data-marker="${name}"`, "g")) ?? []).length;
function assertDeathMarkers(html, event, getPlayer, names = true) {
  const dead = !!event.victimPosition;
  assert.equal(count(html, "victim-portrait"), Number(dead));
  assert.equal(count(html, "victim-name"), Number(dead && names));
  assert.equal(count(html, "death-cross"), Number(dead));
  const expectedLine =
    dead &&
    event.type === "kill" &&
    event.damageType !== "Bomb" &&
    event.actorId !== event.victimId &&
    event.positions.some((position) => position.playerId === event.actorId);
  assert.equal(count(html, "kill-line"), Number(expectedLine));
  if (expectedLine) {
    const line = html.match(/<line data-marker="kill-line"[^>]*>/)?.[0];
    assert.ok(line?.includes('stroke="var(--event-elimination)"'));
    assert.ok(line?.includes('stroke-dasharray="2 6"'));
    assert.ok(
      html.indexOf('data-marker="kill-line"') >
        html.lastIndexOf('data-marker="victim"'),
    );
    assert.ok(
      html.indexOf('data-marker="kill-line"') >
        html.lastIndexOf('data-marker="player"'),
    );
  }
  for (const direction of html.matchAll(
    /<g data-marker="direction">([\s\S]*?)<\/g>/g,
  ))
    assert.equal(
      (direction[1].match(/<path /g) ?? []).length,
      1,
      "Only the cone, no central line",
    );
  if (dead) {
    const color =
      getPlayer(event.victimPosition.playerId).team === "horizon"
        ? "var(--team-friendly)"
        : "var(--primary)";
    assert.ok(
      html.includes(
        `data-marker="death-cross" d="m-8-8 16 16m0-16L-8 8" stroke="${color}"`,
      ),
    );
    assert.match(html, /data-marker="victim-portrait"[^>]*opacity="\.3"/);
  }
}
const { initialMinimapCamera, zoomMinimap, panMinimap } = load(
  "src/lib/minimap-camera.ts",
);
const zoomed = zoomMinimap(initialMinimapCamera, 2);
assert.equal(zoomed.zoom, 2);
assert.equal(zoomed.x, 256);
assert.equal(zoomed.y, 256);
assert.equal(zoomMinimap(zoomed, 100).zoom, 4);
assert.equal(zoomMinimap(zoomed, 0.01).zoom, 1);
assert.equal(panMinimap(zoomed, 100, 100).x, 0);
assert.equal(panMinimap(zoomed, -100, -100).x, 512);
const anchor = { x: 0.2, y: 0.7 };
const anchored = zoomMinimap(zoomed, 1.5, anchor);
assert.ok(
  Math.abs(
    zoomed.x +
      (anchor.x * 1024) / zoomed.zoom -
      anchored.x -
      (anchor.x * 1024) / anchored.zoom,
  ) < 1e-8,
);
assert.ok(
  Math.abs(
    zoomed.y +
      (anchor.y * 1024) / zoomed.zoom -
      anchored.y -
      (anchor.y * 1024) / anchored.zoom,
  ) < 1e-8,
);
let snapshots = 0;
for (const match of demoMatches) {
  const data = createReviewData(match);
  const getPlayer = (id) => data.players.find((player) => player.id === id);
  for (const round of data.rounds)
    for (const event of round.events) {
      const props = {
        mapName: match.map,
        event,
        showNames: true,
        showDirections: true,
        getPlayer,
        objectiveLocation: snapshotObjective(round, event),
      };
      const html = renderToStaticMarkup(createElement(TacticalMinimap, props));
      assert.ok(
        html.includes(`href="/assets/minimaps/${match.map.toLowerCase()}.png"`),
      );
      assert.ok(html.includes('viewBox="0 0 1024 1024"'));
      assert.equal(count(html, "player"), event.positions.length);
      assert.equal(count(html, "direction"), event.positions.length);
      assert.equal(count(html, "name"), event.positions.length);
      assert.equal(count(html, "victim"), Number(!!event.victimPosition));
      assertDeathMarkers(html, event, getPlayer);
      assert.ok(
        html.includes('aria-label="Aumentar zoom"') &&
          html.includes('aria-label="Restaurar visão do mapa"'),
      );
      const plant = round.events.find((item) => item.type === "plant");
      assert.equal(count(html, "spike"), Number(event.timeMs >= plant.timeMs));
      if (event.timeMs >= plant.timeMs)
        assert.equal(
          snapshotObjective(round, event),
          plant.positions.find(
            (position) => position.playerId === plant.actorId,
          ),
        );
      const hidden = renderToStaticMarkup(
        createElement(TacticalMinimap, {
          ...props,
          showNames: false,
          showDirections: false,
        }),
      );
      assert.equal(count(hidden, "name"), 0);
      assert.equal(count(hidden, "direction"), 0);
      assertDeathMarkers(hidden, event, getPlayer, false);
      snapshots++;
    }
}
const map = findMinimap("Ascent");
const official = JSON.parse(
  readFileSync(resolve(root, "src/data/official-match.json"), "utf8"),
);
let officialSnapshots = 0;
for (const round of official.rounds)
  for (const event of round.events) {
    const html = renderToStaticMarkup(
      createElement(TacticalMinimap, {
        mapName: official.match.mapId,
        event,
        showNames: true,
        showDirections: true,
        getPlayer: (id) => official.players.find((player) => player.id === id),
        objectiveLocation: snapshotObjective(round, event),
      }),
    );
    assert.ok(html.includes('href="/assets/minimaps/ascent.png"'));
    assert.equal(count(html, "player"), event.positions.length);
    assert.equal(
      count(html, "direction"),
      event.positions.filter((position) =>
        Number.isFinite(position.viewRadians),
      ).length,
    );
    assert.equal(count(html, "victim"), Number(!!event.victimPosition));
    assertDeathMarkers(html, event, (id) =>
      official.players.find((player) => player.id === id),
    );
    assert.equal(
      count(html, "spike"),
      Number(!!snapshotObjective(round, event)),
    );
    officialSnapshots++;
  }
assert.equal(officialSnapshots, 251);
const { mockRoundTips } = load("src/data/mock-round-tips.ts");
const { getTacticalTip, tipCategories, tacticalTips } = load(
  "src/data/tactical-catalog.ts",
);
const { tipCategoryTheme } = load("src/lib/tip-category-theme.ts");
const { TacticalTipCard, TipCategoryBadge } = load(
  "src/components/review/tactical-tip.tsx",
);
const themeCss = readFileSync(resolve(root, "src/app/globals.css"), "utf8");
assert.equal(
  new Set(tipCategories.map((category) => tipCategoryTheme(category.id).text))
    .size,
  10,
);
const luminance = (hex) => {
  const channels = hex
    .match(/\w\w/g)
    .map((channel) => parseInt(channel, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
for (const category of tipCategories) {
  const token = `tip-${category.id}`;
  const color = themeCss.match(new RegExp(`--${token}: #([0-9a-f]{6})`))?.[1];
  assert.ok(color, `Missing category token ${token}`);
  assert.ok(
    (luminance(color) + 0.05) / (luminance("111f2d") + 0.05) >= 4.5,
    `Category ${category.id} needs readable contrast`,
  );
  const badge = renderToStaticMarkup(
    createElement(TipCategoryBadge, { categoryId: category.id }),
  );
  assert.ok(
    badge.includes(category.nome) &&
      badge.includes(tipCategoryTheme(category.id).text),
  );
}
for (const tip of tacticalTips) {
  const html = renderToStaticMarkup(
    createElement(TacticalTipCard, { tip, onInfo: () => {} }),
  );
  assert.ok(html.includes(`data-tip-category="${tip.tipo}"`));
  assert.ok(
    html.includes(`bg-tip-${tip.tipo}/5`) &&
      html.includes(`text-tip-${tip.tipo}`),
  );
}
for (const round of official.rounds) {
  const collective = mockRoundTips(
    official.match.id,
    round.number,
    "collective",
  );
  assert.equal(collective.length, 2);
  assert.equal(new Set(collective.map((tip) => tip.tipId)).size, 2);
  for (const player of official.players) {
    const tips = mockRoundTips(
      official.match.id,
      round.number,
      "individual",
      player.id,
    );
    assert.equal(tips.length, 2);
    assert.deepEqual(
      tips,
      mockRoundTips(official.match.id, round.number, "individual", player.id),
    );
    for (const tip of [...collective, ...tips]) {
      assert.equal(tip.round, round.number);
      assert.equal(tip.mode, "mock");
      assert.ok(getTacticalTip(tip.tipId));
      assert.equal(
        tip.playerId,
        tip.scope === "individual" ? player.id : undefined,
      );
    }
  }
}
assert.equal(mockRoundTips(official.match.id, 1, "individual").length, 0);
assert.throws(() => mockRoundTips(official.match.id, 0, "collective"));
assert.notEqual(
  mockRoundTips(official.match.id, 1, "collective")[0].tipId,
  mockRoundTips(official.match.id, 2, "collective")[0].tipId,
);
const { RoundCoachingTips } = load(
  "src/components/review/round-coaching-tips.tsx",
);
for (const round of official.rounds) {
  const html = renderToStaticMarkup(
    createElement(RoundCoachingTips, {
      match: official.match,
      round,
      players: official.players,
    }),
  );
  assert.ok(html.includes('data-tip-mode="mock"'));
  assert.ok(html.includes('data-coaching-player="p1"'));
  assert.equal((html.match(/data-mock-scope="collective"/g) ?? []).length, 2);
  assert.equal((html.match(/data-mock-scope="individual"/g) ?? []).length, 2);
  assert.equal(
    (html.match(new RegExp(`data-mock-round="${round.number}"`, "g")) ?? [])
      .length,
    4,
  );
  assert.ok(html.includes("Exemplos de interface, sem análise automática"));
  assert.ok(html.includes("Jogador para dicas individuais"));
}
const { getRoundOutcome } = load("src/lib/round-outcome.ts");
const endings = new Map();
for (const round of official.rounds) {
  const outcome = getRoundOutcome(round);
  assert.ok(outcome, `Unknown result ${round.result}`);
  assert.ok(existsSync(resolve(root, `public${outcome.image}`)));
  endings.set(outcome.label, (endings.get(outcome.label) ?? 0) + 1);
}
assert.equal(endings.get("Tempo esgotado"), 2);
assert.equal(endings.get("Spike desarmada"), 6);
assert.equal(endings.get("Explosão da spike"), 4);
assert.equal(endings.get("Eliminação"), 20);
assert.equal(getRoundOutcome({ result: "unknown", events: [] }), undefined);
const { EventInspector } = load("src/components/review/event-inspector.tsx");
const { TooltipProvider } = load("src/components/ui/tooltip.tsx");
const { Scoreboard } = load("src/components/review/scoreboard.tsx");
const { scoreboardColumns, formatScoreboardValue, compareScoreboardPlayers } =
  load("src/lib/scoreboard.ts");
const scoreboard = renderToStaticMarkup(
  createElement(
    TooltipProvider,
    null,
    createElement(Scoreboard, {
      match: official.match,
      players: official.players,
      onPlayer: () => {},
    }),
  ),
);
const headers = [...scoreboard.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(
  (match) => match[1].replace(/<[^>]*>/g, ""),
);
assert.deepEqual(headers, [
  "Jogador",
  "ACS",
  "K",
  "D",
  "A",
  "Δ",
  "K/D",
  "ADR",
  "HS%",
  "KAST",
  "FK",
  "FD",
]);
assert.ok(scoreboard.includes('colSpan="12"'));
assert.ok(scoreboard.includes("table-fixed"),"Player column must not expand with automatic table layout");
assert.ok(scoreboard.includes("max-[650px]:w-[132px]"),"Compact fixed player column on mobile");
assert.equal((scoreboard.match(/<col\b/g) ?? []).length,12,"Explicit widths for player and all 11 statistics");
assert.ok(scoreboard.includes("shrink-0") && scoreboard.includes("min-w-0 flex-1"),"Portrait stays compact and long names truncate instead of widening the column");
assert.ok(
  scoreboard.includes("Meu time") && scoreboard.includes("Time inimigo"),
);
assert.ok(
  !scoreboard.includes("Equipe Red") && !scoreboard.includes("Equipe Blue"),
);
assert.ok(scoreboard.includes("text-success"));
const teamHeaders = [
  ...scoreboard.matchAll(/<td[^>]*colSpan="12"[^>]*>([\s\S]*?)<\/td>/g),
].map((match) => match[1].replace(/<[^>]*>/g, ""));
assert.deepEqual(teamHeaders, ["Meu timeDERROTA", "Time inimigoVITÓRIA"]);
const player = { ...official.players[0], kills: 20, deaths: 10 };
assert.equal(formatScoreboardValue(player, "delta"), "+10");
assert.equal(formatScoreboardValue(player, "ratio"), "2.00");
assert.equal(
  formatScoreboardValue({ ...player, kills: 0, deaths: 0 }, "ratio"),
  "—",
);
assert.equal(formatScoreboardValue({ ...player, deaths: 0 }, "ratio"), "∞");
assert.equal(
  formatScoreboardValue({ ...player, kastPercent: undefined }, "kastPercent"),
  "—",
);
assert.equal(
  compareScoreboardPlayers(
    { ...player, kastPercent: undefined },
    player,
    "kastPercent",
    true,
  ),
  1,
);
assert.equal(scoreboardColumns.length, 11);
for (const round of official.rounds) {
  const html = renderToStaticMarkup(
    createElement(
      TooltipProvider,
      null,
      createElement(EventInspector, {
        match: official.match,
        players: official.players,
        rounds: official.rounds,
        roundNumber: round.number,
        onRound: () => {},
      }),
    ),
  );
  assert.ok(html.includes("Eventos do JSON"));
  assert.ok(!html.includes("Eventos simulados"));
  assert.ok(html.includes("JOGADORES NESTE SNAPSHOT"));
  assert.ok(html.includes("/assets/minimaps/ascent.png"));
  assert.ok(html.includes(round.site ? `Plant no ${round.site}` : "Sem plant"));
  assert.equal(count(html, "player"), round.events[0].positions.length);
  if (round.result === "Detonate")
    assert.ok(html.includes("O JSON não registra o horário da detonação"));
}
const mock = projectInspectorPoint({ x: 25, y: 75 }, undefined, map);
assert.equal(mock.x, 0.25);
assert.equal(mock.y, 0.75);
const world = minimapToWorld({ x: 0.25, y: 0.75 }, map);
const projected = projectInspectorPoint(world, "world", map);
assert.ok(
  Math.abs(projected.x - 0.25) < 1e-10 && Math.abs(projected.y - 0.75) < 1e-10,
);
assert.ok(
  Math.abs(projectInspectorHeading(0, "world", map) + Math.PI / 2) < 1e-10,
);
assert.ok(Math.abs(projectInspectorHeading(Math.PI / 2, "world", map)) < 1e-10);
assert.equal(projectInspectorHeading(NaN, "world", map), undefined);
const base = {
  id: "test",
  type: "kill",
  label: "Teste",
  actorId: "test",
  timeMs: 1,
  positions: [],
  coordinateSpace: "world",
};
const props = {
  mapName: "Ascent",
  event: base,
  showNames: true,
  showDirections: true,
  getPlayer: () => ({ name: "Teste", agent: "Jett", team: "horizon" }),
};
const objective = renderToStaticMarkup(
  createElement(TacticalMinimap, {
    ...props,
    event: { ...base, objectiveLocation: world },
  }),
);
assert.equal(count(objective, "spike"), 1);
const invalid = renderToStaticMarkup(
  createElement(TacticalMinimap, {
    ...props,
    event: {
      ...base,
      positions: [
        { playerId: "test", x: NaN, y: 0, viewRadians: 0 },
        { playerId: "test2", x: 1e9, y: 1e9, viewRadians: 0 },
      ],
    },
  }),
);
assert.equal(count(invalid, "player"), 0);
assert.ok(invalid.includes("2 posição(ões)"));
for (const mapName of ["Desconhecido", "District"]) {
  assert.ok(
    renderToStaticMarkup(
      createElement(TacticalMinimap, { ...props, mapName }),
    ).includes("Minimapa indisponível"),
  );
}
console.log(
  `OK: ${snapshots} snapshots mockados nos seis mapas + ${officialSnapshots} snapshots reais; nomes/direções, mortes, spike, projeção world, pontos inválidos e fallback.`,
);
