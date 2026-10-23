import { getTacticalTip } from "./tactical-catalog";

const collective = [
  "008",
  "025",
  "039",
  "040",
  "041",
  "043",
  "049",
  "050",
  "056",
  "059",
  "062",
  "063",
  "064",
];
const individual = [
  "023",
  "024",
  "026",
  "027",
  "028",
  "030",
  "031",
  "034",
  "035",
  "037",
  "038",
  "061",
  "065",
];
export interface MockRoundTip {
  id: string;
  mode: "mock";
  scope: "collective" | "individual";
  round: number;
  playerId?: string;
  tipId: string;
}

/** Deterministic UI examples, never detector output or evidence from the JSON. */
export function mockRoundTips(
  matchId: string,
  round: number,
  scope: MockRoundTip["scope"],
  playerId?: string,
): MockRoundTip[] {
  if (!Number.isInteger(round) || round < 1)
    throw new RangeError("Invalid round");
  if (scope === "individual" && !playerId) return [];
  const pool = scope === "collective" ? collective : individual;
  const identity = `${matchId}:${scope}:${playerId ?? "team"}`;
  const seed = [...identity].reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  const start = (seed + (round - 1) * 2) % pool.length;
  return [pool[start], pool[(start + 1) % pool.length]].map((tipId) => {
    getTacticalTip(tipId);
    return {
      id: `${identity}:r${round}:${tipId}`,
      mode: "mock",
      scope,
      round,
      ...(scope === "individual" ? { playerId } : {}),
      tipId,
    };
  });
}
