import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { adaptMatch } from "./import-match.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
export const stages = ["Classificatória 3", "Fase de Grupos"];
const opponents = {
  ufg_eagles_blue: "UFG Eagles Blue",
  ceub_octopus_vulgaris: "CEUB Octopus Vulgaris",
  ufpr_bbn: "UFPR BBN",
  pucgo_sistematica: "PUCGO Sistemática",
  inatel: "INATEL",
  fei_darkowls: "FEI Darkowls",
  caap_malditos: "CAAP Malditos",
  caap_hellhounds: "CAAP Hellhounds",
  totale_umc: "TOTALE UMC",
  usp_stars: "USP Stars",
};

export function discoverFuria() {
  const sources = stages.flatMap((stage) => {
    const folder = resolve(root, "Dados .Json/Univavá", stage);
    return readdirSync(folder)
      .filter((name) => name.includes("furia_utfpr"))
      .sort()
      .map((file) => {
        const path = resolve(folder, file),
          bytes = readFileSync(path),
          raw = JSON.parse(bytes);
        return { file, stage, path, bytes, raw };
      });
  });
  if (sources.length !== 12)
    throw new Error(`Expected 12 FURIA matches, got ${sources.length}`);
  // Identity is the intersection of ORIGINAL PUUIDs, not filename order, color or nickname.
  let roster = new Set(
    sources[0].raw.players.filter((p) => !p.isObserver).map((p) => p.puuid),
  );
  for (const { raw } of sources) {
    const present = new Set(
      raw.players.filter((p) => !p.isObserver).map((p) => p.puuid),
    );
    roster = new Set([...roster].filter((p) => present.has(p)));
  }
  if (roster.size !== 5)
    throw new Error("A verified five-player shared roster is required");
  return sources.map((source) => {
    const players = source.raw.players.filter((p) => roster.has(p.puuid));
    const teams = new Set(players.map((p) => p.teamId));
    if (teams.size !== 1) throw new Error("FURIA roster split across teams");
    const key = source.file
      .replace(/^UNIVAVA_(?:C3|G)_\w+_\d{2}-\d{2}-\d{2}_/, "")
      .replace(/_\d+_x_\d+_/, "_")
      .replace(/_(lotus|split|ascent|summit|sunset)\.json$/, "")
      .replace(/(?:^furia_utfpr_|_furia_utfpr$)/, "");
    if (!opponents[key]) throw new Error(`Unknown opponent: ${key}`);
    return { ...source, team: [...teams][0], opponent: opponents[key] };
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const output = resolve(root, "src/data/matches");
  mkdirSync(output, { recursive: true });
  const entries = discoverFuria().map(
    ({ file, stage, path, bytes, raw, team, opponent }) => {
      const data = adaptMatch(raw, file, { friendlyTeamId: team });
      data.source.sha256 = createHash("sha256").update(bytes).digest("hex");
      data.match.teams.horizon.name = "FURIA UTFPR";
      data.match.teams.orbit.name = opponent;
      data.match.teams.horizon.color = "var(--team-friendly)";
      data.match.teams.orbit.color = "var(--primary)";
      data.match.competition = `Univavá · ${stage}`;
      for (const metric of Object.values(data.metrics))
        metric.detail = metric.detail.replace(`· ${team}`, "· Meu time");
      writeFileSync(
        resolve(output, `${data.match.id}.json`),
        JSON.stringify(data) + "\n",
      );
      console.log(
        `${stage} · ${data.match.map} · ${data.match.teams.horizon.score}–${data.match.teams.orbit.score} · ${opponent}`,
      );
      return {
        file,
        path: relative(root, path).replaceAll("\\", "/"),
        stage,
        matchId: data.match.id,
        sha256: data.source.sha256,
        friendlyTeamId: team,
        opponent,
      };
    },
  );
  writeFileSync(
    resolve(root, "src/data/team-sources.json"),
    JSON.stringify({ team: "FURIA UTFPR", entries }, null, 2) + "\n",
  );
}
