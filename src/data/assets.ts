/** Official Riot Public Content Catalog 08.09. See public/assets/manifest.json. */
import manifest from "../../public/assets/manifest.json";

const weaponAssets = new Set(
  manifest.assets.flatMap((asset) =>
    asset.kind === "weapons" && asset.name ? [asset.name] : [],
  ),
);
export const hasWeaponImage = (weapon: string) => weaponAssets.has(weapon);
const agentAssets = new Set(manifest.assets.flatMap(asset => asset.kind === "agents" && asset.name ? [asset.name] : []));

export const agentImage = (agent: string) =>
  agentAssets.has(agent) ? `/assets/agents/${agent.toLowerCase().replace(/[^a-z0-9]/g, "")}.png` : "/assets/agents/unknown.svg";

export const weaponImage = (weapon: string, killfeed = false) =>
  `/assets/weapons/${weapon.toLowerCase().replace(/[^a-z0-9]/g, "")}${killfeed ? "-kill" : ""}.png`;
