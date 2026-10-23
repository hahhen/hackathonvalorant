import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ids = JSON.parse(
  readFileSync(
    new URL("../src/data/valorant-ids.json", import.meta.url),
    "utf8",
  ),
);
assert.equal(Object.keys(ids.weapons).length, 20);
assert.equal(Object.keys(ids.agents).length, 29);
for (const dictionary of [ids.weapons, ids.agents]) {
  assert.equal(
    new Set(Object.values(dictionary)).size,
    Object.keys(dictionary).length,
  );
  for (const id of Object.keys(dictionary))
    assert.match(
      id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
}
assert.equal(ids.weapons["410b2e0b-4ceb-1321-1727-20858f7f3477"], "Bandit");
assert.equal(ids.agents["add6443a-41bd-e414-f6ad-e58d267f4e95"], "Jett");
console.log("OK: 20 armas e 29 agentes, IDs normalizados e nomes únicos.");
