/** Offline import of an extracted Riot Public Content Catalog; no network access. */
import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.argv[2])
  throw new Error("Pass the extracted PublicContentCatalog directory.");
const sourceRoot = resolve(process.argv[2]);
const catalog = JSON.parse(
  readFileSync(resolve(sourceRoot, "PublicContentCatalog.json"), "utf8"),
);
const knownIds = JSON.parse(
  readFileSync(resolve(root, "src/data/valorant-ids.json"), "utf8"),
);
const previous = JSON.parse(
  readFileSync(resolve(root, "public/assets/minimaps/manifest.json"), "utf8"),
);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const provenance = {
  owner: "Riot Games",
  provider: "Riot Games Public Content Catalog (official)",
  source: "PublicContentCatalog-release-13.08",
  catalogVersion: catalog.version,
  catalogSha256: hash(
    readFileSync(resolve(sourceRoot, "PublicContentCatalog.json")),
  ),
};
const assets = [],
  photos = [],
  minimaps = [],
  unavailable = [];
const agentCatalog = {};
const slotAliases = {
  Ability1: "ability1",
  Ability2: "ability2",
  GrenadeAbility: "grenade",
  Ultimate: "ultimate",
  Passive: "passive",
};
const copy = (member, file, item, kind) => {
  const from = resolve(sourceRoot, member);
  if (!existsSync(from)) return null;
  const to = resolve(root, `public${file}`);
  mkdirSync(resolve(to, ".."), { recursive: true });
  const incoming = readFileSync(from);
  if (!existsSync(to)) copyFileSync(from, to);
  else if (hash(readFileSync(to)) !== hash(incoming))
    writeFileSync(to, incoming);
  const bytes = readFileSync(to);
  return {
    id: item.id.toLowerCase(),
    name: item.name.defaultText,
    kind,
    file,
    archiveMember: member,
    bytes: statSync(to).size,
    sha256: hash(bytes),
  };
};
for (const [group, folder, kind, suffix] of [
  ["characters", "Characters", "agents", "_small"],
  ["weapons", "Weapons", "weapons", ""],
  ["armors", "Armors", "armors", ""],
]) {
  const seen = new Set();
  const preferred = new Set(Object.keys(knownIds[kind] ?? {}));
  for (const item of [...catalog[group]].sort(
    (a, b) =>
      Number(preferred.has(b.id.toLowerCase())) -
      Number(preferred.has(a.id.toLowerCase())),
  )) {
    const name = item.name.defaultText;
    if (seen.has(name)) continue;
    const entry = copy(
      `${folder}/${item.id}${suffix}.png`,
      `/assets/${kind}/${slug(name)}.png`,
      item,
      kind,
    );
    if (!entry) continue;
    assets.push(entry);
    seen.add(name);
    if (kind === "weapons") {
      const kill = copy(
        `${folder}/${item.id}_killstream.png`,
        `/assets/weapons/${slug(name)}-kill.png`,
        item,
        "weapon-killfeed",
      );
      if (kill) assets.push(kill);
    }
  }
}
for (const agentAsset of assets.filter((a) => a.kind === "agents")) {
  const agent = catalog.characters.find(
    (c) => c.id.toLowerCase() === agentAsset.id,
  );
  const abilities = {};
  for (const [slot, ability] of Object.entries(agent.abilities)) {
    const sprite = copy(
      `Abilities/${ability.label}.png`,
      `/assets/abilities/${slug(agent.name.defaultText)}/${slot}.png`,
      { id: ability.label, name: ability.name },
      "abilities",
    );
    if (sprite) assets.push(sprite);
    abilities[slot] = {
      name: ability.name.defaultText,
      namePtBr:
        ability.name.localizedByCulture?.["pt-BR"] ?? ability.name.defaultText,
      catalogLabel: ability.label,
      sprite: sprite?.file ?? null,
      weaponIds: catalog.weapons
        .filter(
          (w) => slug(w.name.defaultText) === slug(ability.name.defaultText),
        )
        .map((w) => w.id.toLowerCase()),
    };
  }
  agentCatalog[agentAsset.id] = {
    name: agent.name.defaultText,
    portrait: agentAsset.file,
    abilities,
  };
}
for (const item of catalog.maps) {
  const name = item.name.defaultText;
  const previousMap = previous.maps.find(
    (m) => m.uuid === item.id.toLowerCase(),
  );
  const mapSlug =
    previousMap?.slug ?? `${slug(name)}-${item.id.slice(0, 8).toLowerCase()}`;
  const photo = copy(
    `Maps/${item.id}_splash.png`,
    `/assets/maps/${previousMap?.slug ?? mapSlug}.png`,
    item,
    "maps",
  );
  if (photo) photos.push(photo);
  const image = copy(
    `Maps/${item.id}.png`,
    `/assets/minimaps/${mapSlug}.png`,
    item,
    "minimaps",
  );
  if (!image) {
    unavailable.push({
      uuid: item.id.toLowerCase(),
      name,
      reason: "No minimap PNG in supplied official catalog",
    });
    continue;
  }
  const bytes = readFileSync(resolve(root, `public${image.file}`));
  const calibration = Object.fromEntries(
    ["xMultiplier", "yMultiplier", "xScalarToAdd", "yScalarToAdd"].map((k) => [
      k,
      item[k],
    ]),
  );
  const supported =
    Object.values(calibration).every(Number.isFinite) &&
    item.xMultiplier !== 0 &&
    item.yMultiplier !== 0;
  minimaps.push({
    uuid: image.id,
    name,
    slug: mapSlug,
    mapUrl: previousMap?.mapUrl ?? image.id,
    identitySource: previousMap
      ? "Retained mapUrl identity alias; not calibration or geometry"
      : "Catalog UUID (catalog has no mapUrl)",
    image: image.file,
    archiveMember: image.archiveMember,
    bytes: image.bytes,
    sha256: image.sha256,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    ...calibration,
    projectionSupported: supported,
    projectionStatus: supported
      ? "official-catalog-coefficients"
      : "no-calibration-in-catalog",
  });
}
const save = (file, data) =>
  writeFileSync(resolve(root, file), JSON.stringify(data, null, 2) + "\n");
save("src/data/agents.json", {
  ...provenance,
  slotAliases,
  agents: agentCatalog,
});
save("public/assets/manifest.json", { ...provenance, assets });
save("public/assets/maps-manifest.json", { ...provenance, assets: photos });
save("public/assets/minimaps/manifest.json", {
  schemaVersion: 1,
  ...provenance,
  coordinateSystem: {
    input: "Riot match JSON world location {x,y}",
    output: "Normalized image coordinates, top-left origin",
    formula: {
      x: "world.y * xMultiplier + xScalarToAdd",
      y: "world.x * yMultiplier + yScalarToAdd",
    },
    pixels: { x: "normalized.x * imageWidth", y: "normalized.y * imageHeight" },
    imageModified: false,
    outOfBoundsPolicy: "Preserve coordinates, expose inBounds; never clamp",
  },
  notes: [
    "Images and coefficients copied from supplied official 13.08 catalog without crop, rotation or resampling.",
    "No community callouts, calibration or geometry are used.",
    "mapUrl aliases retained solely to match organization JSON map IDs.",
    "Catalog patch may differ from match patch; calibration presence is not proof of historical geometric accuracy.",
  ],
  maps: minimaps,
  unavailable,
});
console.log(
  JSON.stringify({
    version: catalog.version,
    agents: assets.filter((a) => a.kind === "agents").length,
    weapons: assets.filter((a) => a.kind === "weapons").length,
    armor: assets.filter((a) => a.kind === "armors").length,
    abilitySprites: assets.filter((a) => a.kind === "abilities").length,
    mapPhotos: photos.length,
    minimaps: minimaps.length,
  }),
);
