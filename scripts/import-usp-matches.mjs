import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { adaptMatch } from "./import-match.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
export const uspSources = [
  {file: "UNIVAVA_C4_041_12-09-26_usp_stars_13_x_2_liga_vulkanica_lotus.json", team: "Red", opponent: "Liga Vulkanica"},
  {file: "UNIVAVA_C4_053_12-09-26_usp_stars_13_x_7_macklogic_white_haven.json", team: "Red", opponent: "Macklogic White"},
  {file: "UNIVAVA_C4_059_12-09-26_usp_stars_13_x_6_brutal_esports_lotus.json", team: "Red", opponent: "Brutal Esports"},
  {file: "UNIVAVA_C4_062_12-09-26_usp_stars_13_x_5_ceub_octopus_vulgaris_haven.json", team: "Blue", opponent: "CEUB Octopus Vulgaris"},
];
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(root,"src/data/matches");
  mkdirSync(output,{recursive:true});
  for (const source of uspSources) {
    const bytes = readFileSync(resolve(root,"Dados .Json/Univavá/Classificatória 4",source.file));
    const data = adaptMatch(JSON.parse(bytes),source.file,{friendlyTeamId:source.team});
    data.source.sha256 = createHash("sha256").update(bytes).digest("hex");
    data.source.friendlyTeamId = source.team;
    data.match.teams.horizon.name = "USP Stars";
    data.match.teams.orbit.name = source.opponent;
    data.match.teams.horizon.color = "var(--team-friendly)";
    data.match.teams.orbit.color = "var(--primary)";
    data.match.competition = "Univavá · Classificatória 4";
    for (const metric of Object.values(data.metrics)) metric.detail = metric.detail.replace(`· ${source.team}`,"· Meu time");
    writeFileSync(resolve(output,`${data.match.id}.json`),JSON.stringify(data)+"\n");
    console.log(JSON.stringify({id:data.match.id,map:data.match.map,score:`${data.match.teams.horizon.score} × ${data.match.teams.orbit.score}`,opponent:source.opponent,rounds:data.rounds.length}));
  }
}
