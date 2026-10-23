import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveKillAbility } from "./import-match.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (file) => JSON.parse(readFileSync(resolve(root, file), "utf8"));
const catalog = read("src/data/agents.json");
const ids = read("src/data/valorant-ids.json");
const weapons = read("public/assets/manifest.json").assets.filter(
  (a) => a.kind === "weapons",
);
assert.equal(Object.keys(catalog.agents).length, 29);
const agentId = (name) =>
  Object.entries(ids.agents).find(([, value]) => value === name)[0];
for (const [agent, item, expected] of [
  ["Raze", "Ability2", "Paint Shells"],
  ["Raze", "GrenadeAbility", "Boom Bot"],
  ["Raze", "Ultimate", "Showstopper"],
  ["Sova", "Ability1", "Shock Bolt"],
  ["Sova", "Ultimate", "Hunter's Fury"],
]) {
  const ability = resolveKillAbility(agentId(agent), "Ability", item);
  assert.equal(ability.name, expected);
  assert.ok(ability.sprite);
  assert.ok(existsSync(resolve(root, `public${ability.sprite}`)));
}
assert.equal(resolveKillAbility(agentId("Raze"), "Ability", ""), undefined);
assert.equal(
  resolveKillAbility(agentId("Raze"), "Ability", "UnknownSlot"),
  undefined,
);
assert.equal(
  resolveKillAbility("unknown-agent", "Ability", "Ultimate"),
  undefined,
);
assert.equal(
  resolveKillAbility(
    agentId("Neon"),
    "Weapon",
    "95336AE4-45D4-1032-CFAF-6BAD01910607",
  ),
  undefined,
);
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(resolve(dir, e.name))
      : e.name.endsWith(".json")
        ? [resolve(dir, e.name)]
        : [],
  );
const input = resolve(root, "Dados .Json");
const files = existsSync(input) ? walk(input) : [];
let kills = 0,
  abilityKills = 0,
  resolved = 0;
const weaponAbilities = {};
for (const file of files) {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const players = new Map(raw.players.map((p) => [p.puuid, p]));
  for (const round of raw.roundResults)
    for (const stats of round.playerStats)
      for (const kill of stats.kills ?? []) {
        kills++;
        const damage = kill.finishingDamage;
        if (damage.damageType === "Ability") {
          abilityKills++;
          const ability = resolveKillAbility(
            players.get(kill.killer)?.characterId,
            damage.damageType,
            damage.damageItem,
          );
          assert.ok(ability, `${file}: ${damage.damageItem}`);
          assert.ok(
            ability.sprite &&
              existsSync(resolve(root, `public${ability.sprite}`)),
          );
          resolved++;
        }
        if (damage.damageType === "Weapon") {
          const weapon = weapons.find(
            (w) => w.id === damage.damageItem.toLowerCase(),
          );
          if (
            weapon &&
            ["Overdrive", "Headhunter", "Tour De Force"].includes(weapon.name)
          )
            weaponAbilities[weapon.name] =
              (weaponAbilities[weapon.name] ?? 0) + 1;
        }
      }
}
console.log(
  JSON.stringify({
    status: "OK",
    files: files.length,
    kills,
    abilityKills,
    resolvedWithSprite: resolved,
    weaponAbilities,
  }),
);
