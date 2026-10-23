import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root));
const manifest = JSON.parse(read("public/assets/minimaps/manifest.json"));
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.provider, "Riot Games Public Content Catalog (official)");
assert.equal(manifest.coordinateSystem.imageModified, false);
assert.equal(
  new Set(manifest.maps.map((map) => map.mapUrl)).size,
  manifest.maps.length,
);
assert.equal(
  new Set(manifest.maps.map((map) => map.image)).size,
  manifest.maps.length,
);
for (const map of manifest.maps) {
  assert.ok(/^\/assets\/minimaps\/[a-z0-9-]+\.png$/.test(map.image));
  const bytes = read(`public${map.image}`);
  assert.equal(
    bytes.subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
    map.name,
  );
  assert.equal(bytes.readUInt32BE(16), map.width, map.name);
  assert.equal(bytes.readUInt32BE(20), map.height, map.name);
  assert.equal(bytes.length, map.bytes, map.name);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    map.sha256,
    map.name,
  );
  assert.ok(map.mapUrl.startsWith("/Game/Maps/") || map.mapUrl === map.uuid);
  assert.equal(
    map.projectionSupported,
    [
      map.xMultiplier,
      map.yMultiplier,
      map.xScalarToAdd,
      map.yScalarToAdd,
    ].every(Number.isFinite) &&
      map.xMultiplier !== 0 &&
      map.yMultiplier !== 0,
  );
}

const module = { exports: {} };
const code = ts.transpileModule(read("src/lib/minimap.ts").toString("utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;
vm.runInNewContext(code, {
  module,
  exports: module.exports,
  require: (id) => {
    assert.equal(id, "../../public/assets/minimaps/manifest.json");
    return manifest;
  },
});
const { findMinimap, worldToMinimap, worldToMinimapPixels, minimapToWorld } =
  module.exports;
assert.equal(findMinimap("/Game/Maps/Ascent/Ascent").name, "Ascent");
assert.equal(findMinimap("/Game/Maps/Bonsai/Bonsai").name, "Split");
assert.equal(findMinimap("  HAVEN  ").name, "Haven");
assert.equal(findMinimap(findMinimap("Bind").uuid).name, "Bind");
assert.equal(findMinimap("unknown-map"), undefined);
for (const name of ["Ascent", "Haven", "Split", "Bind", "Lotus", "Icebox"])
  assert.equal(findMinimap(name).projectionSupported, true);

// The user's historical reference, not the provider's current callout position.
const reference = { x: 11473, y: -2897 };
const fracture = findMinimap("Fracture");
const bridge = worldToMinimap(reference, fracture);
const referenceErrorPixels = Math.hypot(
  (bridge.x - 0.3315) * fracture.width,
  (bridge.y - 0.2615) * fracture.height,
);
assert.ok(
  referenceErrorPixels / fracture.width < 0.001,
  `Fracture reference error: ${referenceErrorPixels}px`,
);
const wronglyUnswapped = {
  x: reference.x * fracture.xMultiplier + fracture.xScalarToAdd,
  y: reference.y * fracture.yMultiplier + fracture.yScalarToAdd,
};
assert.ok(
  Math.hypot(wronglyUnswapped.x - bridge.x, wronglyUnswapped.y - bridge.y) > 1,
  "The reference must catch unswapped axes",
);

for (const map of manifest.maps) {
  if (!map.projectionSupported) {
    assert.throws(() => worldToMinimap(reference, map), { name: "RangeError" });
    continue;
  }
  for (const point of [
    { x: 0, y: 0 },
    { x: 0.25, y: 0.75 },
    { x: 1, y: 1 },
    { x: -0.5, y: 1.5 },
  ]) {
    const world = minimapToWorld(point, map);
    const roundTrip = worldToMinimap(world, map);
    assert.ok(
      Math.abs(roundTrip.x - point.x) < 1e-10 &&
        Math.abs(roundTrip.y - point.y) < 1e-10,
      map.name,
    );
    const pixels = worldToMinimapPixels(world, map);
    assert.ok(
      Math.abs(pixels.x - point.x * map.width) < 1e-6 &&
        Math.abs(pixels.y - point.y * map.height) < 1e-6,
    );
  }
}
const ascent = findMinimap("Ascent");
assert.equal(worldToMinimap({ x: 1e7, y: 1e7 }, ascent).inBounds, false);
assert.ok(
  worldToMinimap({ x: 1e7, y: 1e7 }, ascent).x > 1,
  "Out-of-bounds points are not silently clamped",
);
assert.throws(() => worldToMinimap({ x: NaN, y: 0 }, ascent), {
  name: "RangeError",
});
assert.throws(() => worldToMinimapPixels(reference, ascent, 0, 1024), {
  name: "RangeError",
});

let officialSample = null;
if (process.argv[2]) {
  const match = JSON.parse(
    readFileSync(process.argv[2], "utf8").replace(/^\uFEFF/, ""),
  );
  const map = findMinimap(match.matchInfo.mapId);
  assert.ok(map?.projectionSupported, "Sample map must have calibration");
  const points = [];
  for (const round of match.roundResults) {
    for (const stats of round.playerStats)
      for (const kill of stats.kills) {
        points.push({ event: "death", location: kill.victimLocation });
        for (const player of kill.playerLocations)
          points.push({ event: "kill snapshot", location: player.location });
      }
    for (const [actor, location, players, event] of [
      [
        round.bombPlanter,
        round.plantLocation,
        round.plantPlayerLocations,
        "plant",
      ],
      [
        round.bombDefuser,
        round.defuseLocation,
        round.defusePlayerLocations,
        "defuse",
      ],
    ]) {
      if (!actor) continue;
      points.push({ event, location });
      for (const player of players)
        points.push({ event: `${event} snapshot`, location: player.location });
    }
  }
  const outOfBounds = [];
  for (const point of points) {
    const projected = worldToMinimap(point.location, map);
    assert.ok(Number.isFinite(projected.x) && Number.isFinite(projected.y));
    const restored = minimapToWorld(projected, map);
    assert.ok(
      Math.abs(restored.x - point.location.x) < 1e-6 &&
        Math.abs(restored.y - point.location.y) < 1e-6,
    );
    if (!projected.inBounds) outOfBounds.push(point);
  }
  officialSample = {
    map: map.name,
    rounds: match.roundResults.length,
    positions: points.length,
    outOfBounds: outOfBounds.length,
  };
}
console.log(
  JSON.stringify(
    {
      status: "OK",
      images: manifest.maps.length,
      calibrated: manifest.maps.filter((map) => map.projectionSupported).length,
      fractureReference: {
        normalized: bridge,
        errorPixels: referenceErrorPixels,
      },
      officialSample,
    },
    null,
    2,
  ),
);
