/** Download static minimaps and calibration metadata, never match/player data. */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const endpoint = "https://valorant-api.com/v1/maps?language=en-US";
const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.resolve(root, "public/assets/minimaps");
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const calibrationKeys = [
  "xMultiplier",
  "yMultiplier",
  "xScalarToAdd",
  "yScalarToAdd",
];

async function fetchPublic(url, hostname) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== hostname) {
    throw new Error(`Unexpected public asset URL: ${url}`);
  }
  const response = await fetch(parsed, {
    redirect: "error",
    signal: AbortSignal.timeout(30000),
    headers: { "User-Agent": "Afterplant-static-minimap-downloader/1.0" },
  });
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  return response;
}

function parseMap(map) {
  if (
    !/^[a-f\d-]{36}$/i.test(map.uuid) ||
    typeof map.mapUrl !== "string" ||
    !map.mapUrl.startsWith("/Game/Maps/")
  ) {
    throw new Error("Invalid map identity in public catalog");
  }
  const slug = map.displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) throw new Error("Map name cannot produce a safe filename");
  const calibrated =
    calibrationKeys.every((key) => Number.isFinite(map[key])) &&
    map.xMultiplier !== 0 &&
    map.yMultiplier !== 0;
  return {
    uuid: map.uuid.toLowerCase(),
    name: map.displayName,
    slug,
    // Same identifier format as matchInfo.mapId from Riot's official match JSON.
    mapUrl: map.mapUrl,
    tacticalDescription: map.tacticalDescription ?? null,
    sourceImageUrl: map.displayIcon,
    projectionSupported: calibrated,
    projectionStatus: calibrated
      ? "coefficients-present-not-patch-verified"
      : "missing-or-zero-coefficients",
    ...Object.fromEntries(
      calibrationKeys.map((key) => [key, map[key] ?? null]),
    ),
    callouts: map.callouts ?? [],
  };
}

const response = await fetchPublic(endpoint, "valorant-api.com");
const payload = await response.json();
if (payload.status !== 200 || !Array.isArray(payload.data))
  throw new Error("Unexpected maps API response");
const available = payload.data.filter((map) => map.displayIcon).map(parseMap);
if (new Set(available.map((map) => map.slug)).size !== available.length)
  throw new Error("Duplicate minimap filenames");
await mkdir(destination, { recursive: true });

const maps = [];
for (let index = 0; index < available.length; index += 3) {
  const batch = await Promise.all(
    available.slice(index, index + 3).map(async (map) => {
      const response = await fetchPublic(
        map.sourceImageUrl,
        "media.valorant-api.com",
      );
      const bytes = Buffer.from(await response.arrayBuffer());
      if (
        !bytes.subarray(0, 8).equals(pngSignature) ||
        bytes.toString("ascii", 12, 16) !== "IHDR"
      ) {
        throw new Error(`${map.name}: asset is not a PNG`);
      }
      const width = bytes.readUInt32BE(16),
        height = bytes.readUInt32BE(20);
      if (width <= 0 || height <= 0 || width > 8192 || height > 8192)
        throw new Error(`${map.name}: invalid dimensions`);
      const target = path.resolve(destination, `${map.slug}.png`);
      if (path.dirname(target) !== destination)
        throw new Error("Asset path escaped minimap folder");
      await writeFile(target, bytes);
      const result = {
        ...map,
        image: `/assets/minimaps/${map.slug}.png`,
        width,
        height,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
      console.log(
        `${map.name}: ${width}x${height}, ${bytes.length} bytes, ${map.projectionSupported ? "calibration available" : "NO calibration"}`,
      );
      return result;
    }),
  );
  maps.push(...batch);
}

const manifest = {
  schemaVersion: 1,
  retrievedAt: new Date().toISOString(),
  provider: "Valorant-API (community service, not Riot's official API)",
  source: endpoint,
  sourceDocumentation: "https://dash.valorant-api.com/endpoints/maps",
  assetOrigin:
    "Game minimap images distributed by media.valorant-api.com; not downloaded directly from Riot's official API.",
  sourcePatchVersion: null,
  coordinateSystem: {
    input: "Riot official match JSON location: { x, y } in game world units",
    output:
      "Normalized image coordinates; origin top-left, x rightward, y downward",
    formula: {
      x: "world.y * xMultiplier + xScalarToAdd",
      y: "world.x * yMultiplier + yScalarToAdd",
    },
    pixels: { x: "normalized.x * imageWidth", y: "normalized.y * imageHeight" },
    imageModified: false,
    outOfBoundsPolicy:
      "Preserve coordinates and expose an inBounds flag; do not silently clamp.",
  },
  notes: [
    "Images are kept at original dimensions, without crop, rotation or resampling.",
    "projectionSupported means finite, non-zero scaling coefficients exist; it is not a guarantee of geometric accuracy for every patch.",
    "The provider does not identify the exact game patch of each image/calibration pair.",
    "Callouts are named points, not region polygons or line-of-sight geometry.",
    "Only static assets and metadata were requested. No match, account or player API was used.",
  ],
  maps,
  unavailable: payload.data
    .filter((map) => !map.displayIcon)
    .map((map) => ({
      uuid: map.uuid,
      name: map.displayName,
      mapUrl: map.mapUrl,
      reason: "No minimap image supplied by provider",
    })),
};
await writeFile(
  path.join(destination, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `Saved ${maps.length} minimaps; ${maps.filter((map) => map.projectionSupported).length} have conversion factors. ${manifest.unavailable.length} catalog entries have no image.`,
);
