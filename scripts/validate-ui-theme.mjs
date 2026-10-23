import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const css = read("src/app/globals.css");
const outsideTheme = css.replace(/:root\s*\{[^}]*\}/g, "");
assert.ok(
  !/#[\da-f]{3,8}\b/i.test(outsideTheme),
  "Cores literais ficam apenas nas variáveis do tema",
);
assert.ok(
  !/^\.[\w-]+/m.test(css),
  "Sem classes de layout ou componentes no CSS global",
);
assert.ok(
  css.includes("--primary: #ff4655") && css.includes("--background: #0c1824"),
);
function* files(path) {
  for (const entry of readdirSync(new URL(path, root), {
    withFileTypes: true,
  })) {
    const fullPath = `${path}/${entry.name}`;
    if (entry.isDirectory()) yield* files(fullPath);
    else if (entry.name.endsWith(".tsx")) yield fullPath;
  }
}
let checked = 0;
for (const path of files("src/components")) {
  const source = read(path);
  assert.ok(
    !/#[\da-f]{3,8}\b/i.test(source),
    `${path}: sem hexadecimais nos componentes`,
  );
  assert.ok(
    !/\b(?:bg|text|border|fill|stroke)-(?:black|white|gray|slate|red|blue)(?:\b|-)/.test(
      source,
    ),
    `${path}: usar tokens shadcn`,
  );
  assert.ok(
    !/style=/.test(source),
    `${path}: estilos da UI devem usar Tailwind`,
  );
  checked++;
}
const review = read("src/components/review/review-workspace.tsx");
assert.ok(
  review.includes("before:from-primary/30") && review.includes("after:hidden"),
);
assert.ok(
  !review.includes("focus-visible:underline"),
  "As abas têm só o holofote, sem linha inferior",
);
console.log(
  `OK: ${checked} componentes com Tailwind e cores semânticas; tema centralizado; abas sem barras vermelhas.`,
);
