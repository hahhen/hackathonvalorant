import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const catalog = JSON.parse(read("src/data/tactical-tips.json"));
const clean = (value) => value.replace(/\*\*/g, "").replace(/`/g, "").trim();
const hasResearchSource = existsSync(new URL(catalog.fonteDocumento, root));
const rows = hasResearchSource
  ? read(catalog.fonteDocumento)
      .split(/\r?\n/)
      .filter(
        (line) =>
          /^\| \*\*\d{3}\*\*/.test(line) &&
          Number(line.match(/\d{3}/)[0]) <= 100,
      )
      .map((line) => {
        const cells = line
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim());
        return {
          id: clean(cells[0]),
          title: clean(cells[1].match(/^\*\*(.+?)\*\*/)[1]).replace(/\.$/, ""),
          method: clean(cells[2]),
          limits: clean(cells[3]),
        };
      })
  : catalog.dicas.map((tip) => ({
      id: tip.id,
      title: tip.titulo,
      method: tip.inferencia.metodo,
      limits: tip.inferencia.limites,
    }));
if (!hasResearchSource)
  console.log(
    "MD interno ausente: verificando o catálogo canônico; comparação com o MD disponível apenas no ambiente de pesquisa.",
  );
assert.equal(rows.length, 100);
assert.equal(catalog.totalDicas, rows.length);
assert.deepEqual(
  catalog.dicas.map((tip) => tip.id),
  rows.map((row) => row.id),
  "Cobertura e ordem de todos os IDs do MD",
);
assert.equal(new Set(catalog.dicas.map((tip) => tip.id)).size, 100);
assert.equal(catalog.tipos.length, 9);
assert.ok(!catalog.tipos.some((category) => category.id === "ascent"));
assert.ok(!catalog.dicas.some((tip) => Number(tip.id) > 100));
assert.equal(
  catalog.tipos.reduce((sum, category) => sum + category.total, 0),
  100,
);
for (const category of catalog.tipos) {
  assert.equal(
    catalog.dicas.filter((tip) => tip.tipo === category.id).length,
    category.total,
    category.id,
  );
}
for (const [index, tip] of catalog.dicas.entries()) {
  assert.equal(tip.titulo, rows[index].title, tip.id);
  assert.equal(tip.inferencia.metodo, rows[index].method, tip.id);
  assert.equal(tip.inferencia.limites, rows[index].limits, tip.id);
  for (const key of ["tipo", "titulo", "descricao", "origem"])
    assert.ok(tip[key]?.trim(), `${tip.id}: ${key}`);
  assert.ok(!("problema" in tip) && !("solucao" in tip));
  assert.ok(catalog.tipos.some((category) => category.id === tip.tipo));
  assert.ok(["mensuravel", "indicio", "misto"].includes(tip.classificacao));
  assert.equal(typeof tip.inferencia.requerGeometria, "boolean");
  assert.equal(typeof tip.inferencia.indicioFraco, "boolean");
  assert.ok(tip.inferencia.campos.length);
  for (const field of tip.inferencia.campos)
    assert.ok(
      catalog.campos[field]?.caminhos.length,
      `${tip.id}: campo ${field}`,
    );
}
assert.equal(
  catalog.dicas.find((tip) => tip.id === "094").classificacao,
  "indicio",
);

// Exercise the UI's real filtering and fixture adapters without a test framework.
const nativeRequire = createRequire(import.meta.url);
const cache = new Map();
function loadModule(path) {
  if (cache.has(path)) return cache.get(path);
  const module = { exports: {} };
  cache.set(path, module.exports);
  const code = ts.transpileModule(read(path), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      console,
      require: (id) => {
        if (id === "./tactical-tips.json") return catalog;
        if (id.startsWith("@/")) return loadModule(`src/${id.slice(2)}.ts`);
        return nativeRequire(id);
      },
    },
    { filename: path },
  );
  return module.exports;
}
const { matchesTip, normalizeSearch } = loadModule(
  "src/data/tactical-catalog.ts",
);
assert.equal(normalizeSearch("  POSIÇÃO  "), "posicao");
assert.equal(
  catalog.dicas.filter((tip) => matchesTip(tip, "", "all")).length,
  100,
);
assert.equal(
  catalog.dicas.filter((tip) => matchesTip(tip, "100", "all"))[0].id,
  "100",
);
assert.equal(
  catalog.dicas.filter((tip) =>
    matchesTip(tip, "sem-nenhum-resultado-xyz", "all"),
  ).length,
  0,
);
const mixed = catalog.dicas.find((tip) => tip.classificacao === "misto");
assert.ok(
  matchesTip(mixed, "", "mensuravel") && matchesTip(mixed, "", "indicio"),
);

const { createMockCoachTips } = loadModule("src/data/mock-match.ts");
const { demoMatches } = loadModule("src/data/mock-library.ts");
for (const match of demoMatches) {
  const tips = createMockCoachTips(match);
  assert.ok(tips.length > 0);
  assert.equal(new Set(tips.map((tip) => tip.id)).size, tips.length);
  for (const finding of tips) {
    const tip = catalog.dicas.find((tip) => tip.id === finding.id);
    assert.ok(tip);
    assert.equal(finding.title, tip.titulo);
    assert.ok(finding.rounds.length);
    for (const round of finding.rounds)
      assert.ok(
        round >= 1 &&
          round <= match.teams.horizon.score + match.teams.orbit.score,
      );
  }
}
const shortMatch = {
  ...demoMatches[0],
  teams: {
    horizon: { ...demoMatches[0].teams.horizon, score: 1 },
    orbit: { ...demoMatches[0].teams.orbit, score: 0 },
  },
};
assert.equal(
  createMockCoachTips(shortMatch).length,
  0,
  "Sem links para rounds inexistentes",
);
console.log(
  `OK: ${hasResearchSource ? "100 dicas gerais comparadas com o MD histórico" : "100 dicas do catálogo canônico"}; 9 tipos; categoria Ascent removida; campos, filtros e achados válidos.`,
);
