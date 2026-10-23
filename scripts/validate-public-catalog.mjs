import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifests = [
  "public/assets/manifest.json",
  "public/assets/maps-manifest.json",
  "public/assets/minimaps/manifest.json",
].map(read);
const ids = read("src/data/valorant-ids.json");
const assets = manifests[0].assets;
const agentCatalog = read("src/data/agents.json");
assert.equal(Object.keys(agentCatalog.agents).length, 29);
for (const [group, kind] of [
  ["agents", "agents"],
  ["weapons", "weapons"],
])
  for (const [id, name] of Object.entries(ids[group]))
    assert.ok(
      assets.some((a) => a.id === id && a.name === name && a.kind === kind),
      `${name}: canonical ID and image`,
    );
let checked = 0;
const catalog = process.argv[2]
  ? JSON.parse(
      readFileSync(
        resolve(process.argv[2], "PublicContentCatalog.json"),
        "utf8",
      ),
    )
  : null;
for (const [id, agent] of Object.entries(agentCatalog.agents)) {
  const original = catalog?.characters.find((c) => c.id.toLowerCase() === id);
  for (const [slot, ability] of Object.entries(agent.abilities)) {
    if (catalog) {
      assert.equal(ability.catalogLabel, original.abilities[slot].label);
      assert.equal(ability.name, original.abilities[slot].name.defaultText);
      assert.equal(
        ability.namePtBr,
        original.abilities[slot].name.localizedByCulture["pt-BR"],
      );
    }
    if (ability.sprite)
      assert.ok(
        assets.some(
          (a) =>
            a.kind === "abilities" &&
            a.file === ability.sprite &&
            a.archiveMember === `Abilities/${ability.catalogLabel}.png`,
        ),
      );
  }
}
for (const manifest of manifests) {
  assert.equal(
    manifest.provider,
    "Riot Games Public Content Catalog (official)",
  );
  assert.equal(manifest.catalogVersion, "13.08.00.5627607");
  if (catalog)
    assert.equal(
      manifest.catalogSha256,
      hash(readFileSync(resolve(process.argv[2], "PublicContentCatalog.json"))),
    );
  for (const asset of manifest.assets ?? manifest.maps) {
    const bytes = readFileSync(
      resolve(root, `public${asset.file ?? asset.image}`),
    );
    assert.equal(hash(bytes), asset.sha256);
    assert.equal(bytes.length, asset.bytes);
    if (catalog)
      assert.equal(
        hash(readFileSync(resolve(process.argv[2], asset.archiveMember))),
        asset.sha256,
      );
    checked++;
  }
}
if (catalog)
  for (const map of manifests[2].maps) {
    const official = catalog.maps.find((m) => m.id.toLowerCase() === map.uuid);
    for (const key of [
      "xMultiplier",
      "yMultiplier",
      "xScalarToAdd",
      "yScalarToAdd",
    ])
      assert.equal(map[key], official[key]);
    assert.equal(map.callouts, undefined);
  }
console.log(
  JSON.stringify({
    status: "OK",
    assets: checked,
    canonicalAgents: 29,
    canonicalWeapons: 20,
    comparedToSource: !!catalog,
  }),
);
