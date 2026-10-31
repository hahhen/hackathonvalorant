import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
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
  if (!existsSync(filename)) filename = [".ts", ".tsx", ".json"].map((ext) => filename + ext).find(existsSync);
  assert.ok(filename, `Missing module: ${path}`);
  if (filename.endsWith(".json")) return JSON.parse(readFileSync(filename, "utf8"));
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: (id) => id.startsWith("@/") ? load(`src/${id.slice(2)}`) : id.startsWith(".") ? load(resolve(dirname(filename), id)) : nativeRequire(id),
  });
  return module.exports;
}

const en = load("src/i18n/messages/en.json");
const pt = load("src/i18n/messages/pt-BR.json");
assert.deepEqual(Object.keys(en).sort(), Object.keys(pt).sort(), "Locales must have matching keys");
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
for (const key of Object.keys(en)) {
  assert.ok(en[key] && pt[key], `Empty message: ${key}`);
  assert.deepEqual(placeholders(en[key]), placeholders(pt[key]), `Placeholder mismatch: ${key}`);
}

const { createTranslator, formatMatchDate, formatMetricDetail, formatEventLabel } = load("src/i18n/translate.ts");
const english = createTranslator("en"), portuguese = createTranslator("pt-BR");
assert.equal(english("Partidas"), "Matches");
assert.equal(portuguese("Privacy"), "Privacidade");
assert.equal(english("matchCount", { count: 1 }), "1 match");
assert.equal(english("matchCount", { count: 0 }), "0 matches");
assert.equal(portuguese("tipsFound", { count: 2 }), "2 dicas encontradas");
assert.equal(english("Unknown source content"), "Unknown source content");
assert.equal(english("toString"), "toString");
assert.equal(english("Abrir perfil de {0}", { 0: "<player>{0}" }), "Open profile for <player>{0}", "Interpolation must not reprocess player content");
assert.equal(formatMatchDate("invalid", "en"), "invalid");
assert.notEqual(formatMatchDate("2026-09-19T00:00:00Z", "en"), formatMatchDate("2026-09-19T00:00:00Z", "pt-BR"));
assert.equal(formatMetricDetail("24 de 115 mortes · Meu time", "en"), "24 of 115 deaths · My team");
assert.equal(formatEventLabel("Spike plantada no A", "en"), "Spike planted at A");
assert.equal(formatEventLabel("Retaliação em 1,6 s", "en"), "Trade after 1.6 s");

const { localizedHref, isLocale } = load("src/i18n/config.ts");
assert.equal(isLocale("en"), true);
assert.equal(isLocale("fr"), false);
for (const [href, locale, expected] of [
  ["/", "en", "/en"], ["/app", "pt-BR", "/pt-BR/app"],
  ["/en/app/partidas/abc?round=3#events", "pt-BR", "/pt-BR/app/matches/abc?round=3#events"],
  ["/pt-BR/app", "pt-BR", "/pt-BR/app"], ["/enough", "en", "/en/enough"],
  ["#events", "en", "#events"], ["https://example.org/app", "en", "https://example.org/app"],
  ["//example.org", "en", "//example.org"], ["/api/analyses/abc", "en", "/api/analyses/abc"],
  ["/assets/maps/ascent.png", "en", "/assets/maps/ascent.png"], ["/icon.svg", "en", "/icon.svg"],
]) assert.equal(localizedHref(href, locale), expected);

const { proxy } = load("src/proxy.ts");
const { NextRequest } = nativeRequire("next/server");
for (const [pathname, cookie, expected] of [
  ["/app?round=3", "", "/en/app?round=3"],
  ["/privacy", "afterplant-locale=pt-BR", "/pt-BR/privacy"],
  ["/app", "afterplant-locale=invalid", "/en/app"],
]) {
  const response = proxy(new NextRequest(`http://localhost${pathname}`, { headers: { cookie } }));
  assert.equal(response.headers.get("location"), `http://localhost${expected}`);
}
assert.equal(proxy(new NextRequest("http://localhost/en/app", { headers: { cookie: "afterplant-locale=pt-BR" } })).headers.get("location"), null, "Explicit URLs override saved preference");

const { tacticalTips, tipCategories, matchesTip } = load("src/data/tactical-catalog.ts");
for (const tip of tacticalTips) {
  for (const source of [tip.titulo, tip.descricao, tip.inferencia.metodo, tip.inferencia.limites]) {
    assert.ok(en[source], `Missing catalog translation: ${tip.id}`);
    assert.equal(pt[source], source, `Portuguese source changed: ${tip.id}`);
  }
}
assert.ok(matchesTip(tacticalTips[0], "economy", "all", english));
assert.ok(matchesTip(tacticalTips[0], "economia", "all", portuguese));
assert.equal(matchesTip(tacticalTips[0], "economy", "all", portuguese), false);

const { I18nProvider } = load("src/i18n/provider.tsx");
const { default: LocalizedLink } = load("src/i18n/link.tsx");
for (const [href, expected] of [
  [{ pathname: "/app", query: { round: 3 }, hash: "events" }, "/pt-BR/app?round=3#events"],
  [{ protocol: "https:", hostname: "example.org", pathname: "/app" }, "https://example.org/app"],
]) {
  const html = renderToStaticMarkup(createElement(I18nProvider, { locale: "pt-BR" }, createElement(LocalizedLink, { href }, "Link")));
  assert.ok(html.includes(`href="${expected}"`));
}
const { TipCategoryBadge, TacticalTipCard } = load("src/components/review/tactical-tip.tsx");
for (const locale of ["en", "pt-BR"]) {
  const render = (element) => renderToStaticMarkup(createElement(I18nProvider, { locale }, element));
  const badge = render(createElement(TipCategoryBadge, { categoryId: tipCategories[0].id }));
  assert.ok(badge.includes(locale === "en" ? "Economy" : "Economia"));
  const card = render(createElement(TacticalTipCard, { tip: tacticalTips[0], onInfo: () => {} }));
  assert.ok(card.includes(locale === "en" ? "Plan next round" : "Planejar a economia"));
  assert.ok(card.includes(locale === "en" ? "How tip 001 is inferred" : "Como a dica 001 é inferida"));
}

const base = process.argv[2];
if (base) {
  const response = await fetch(`${base}/app?round=3`, { redirect: "manual" });
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location")).pathname, "/en/app");
  const saved = await fetch(`${base}/app`, { redirect: "manual", headers: { cookie: "afterplant-locale=pt-BR" } });
  assert.equal(new URL(saved.headers.get("location")).pathname, "/pt-BR/app");
  for (const locale of ["en", "pt-BR"]) {
    for (const path of ["", "/app", "/privacy", "/app/catalogue", "/app/catalogue/economia"]) {
      const page = await fetch(`${base}/${locale}${path}`);
      assert.equal(page.status, 200, `${locale}${path}`);
      const html = await page.text();
      assert.ok(html.includes(`<html lang="${locale}"`));
      assert.ok(html.includes(`href="/${locale}/app"`));
    }
    const matchPage = await fetch(`${base}/${locale}/app/matches/07b0fd61-deff-4d9c-be6c-02ce94f2d96c?round=3`);
    assert.equal(matchPage.status, 200);
    const reviewHtml = await matchPage.text();
    assert.ok(reviewHtml.includes(locale === "en" ? "Round inspector" : "Inspetor de rounds"));
  }
  assert.equal((await fetch(`${base}/en/app/catalogue/invalid`)).status, 404);
  const api = await fetch(`${base}/api/analyses/invalid`, { redirect: "manual" });
  assert.equal(api.status, 404);
  assert.ok(api.headers.get("content-type").includes("application/json"));
  const analysis = await fetch(`${base}/api/analyses/07b0fd61-deff-4d9c-be6c-02ce94f2d96c?kind=team&period=round&round=3`);
  assert.equal(analysis.status, 200);
  assert.equal((await analysis.json()).matchId, "07b0fd61-deff-4d9c-be6c-02ce94f2d96c");
  assert.equal((await fetch(`${base}/icon.svg`, { redirect: "manual" })).status, 200);
}
console.log(`OK: ${Object.keys(en).length} bilingual messages, 100 complete catalog entries, interpolation, plurals, routing, search and server rendering${base ? ", plus HTTP smoke checks" : ""}.`);
