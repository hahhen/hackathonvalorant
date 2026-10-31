import type { Player } from "@/types/match";

export const scoreboardColumns = [
  { key: "acs", label: "ACS", description: "Pontuação média por round." },
  { key: "kills", label: "K", description: "Eliminações." },
  { key: "deaths", label: "D", description: "Mortes." },
  { key: "assists", label: "A", description: "Assistências." },
  {
    key: "delta",
    label: "Δ",
    description: "Saldo de eliminações e mortes: K − D.",
  },
  {
    key: "ratio",
    label: "K/D",
    description:
      "Eliminações divididas pelas mortes. ∞ indica eliminações sem mortes; — indica 0/0.",
  },
  {
    key: "adr",
    label: "ADR",
    description:
      "Dano registrado contra adversários dividido pelos rounds jogados.",
  },
  {
    key: "headshotPercent",
    label: "HS%",
    description:
      "Acertos na cabeça / acertos totais registrados contra adversários. Não é percentual de eliminações.",
  },
  {
    key: "kastPercent",
    label: "KAST",
    description:
      "% de rounds com kill, assistência, nenhuma morte registrada ou morte trocada por um companheiro em até 3 s. Sobrevivência aqui não reconstitui ressurreições.",
  },
  {
    key: "firstKills",
    label: "FK",
    description:
      "Rounds com a primeira eliminação de um adversário. Empates no milissegundo contam para todos os envolvidos.",
  },
  {
    key: "firstDeaths",
    label: "FD",
    description:
      "Rounds em que foi o primeiro a morrer. Inclui mortes ambientais e empates no milissegundo.",
  },
  {
    key: "openingDelta",
    label: "Δ",
    description: "Saldo de primeiros duelos: FK − FD.",
  },
] as const;
export type ScoreboardKey = (typeof scoreboardColumns)[number]["key"];
export function scoreboardValue(
  player: Player,
  key: ScoreboardKey,
): number | null {
  if (key === "delta") return player.kills - player.deaths;
  if (key === "openingDelta")
    return player.firstKills != null && player.firstDeaths != null
      ? player.firstKills - player.firstDeaths
      : null;
  if (key === "ratio")
    return player.deaths
      ? player.kills / player.deaths
      : player.kills
        ? Infinity
        : null;
  return player[key] ?? null;
}
export function formatScoreboardValue(player: Player, key: ScoreboardKey, locale = "en") {
  const value = scoreboardValue(player, key);
  if (value == null) return "—";
  if (key === "delta" || key === "openingDelta")
    return value > 0 ? `+${value}` : String(value);
  if (key === "ratio") return value === Infinity ? "∞" : new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  if (key === "headshotPercent" || key === "kastPercent") return `${new Intl.NumberFormat(locale).format(value)}%`;
  return new Intl.NumberFormat(locale).format(value);
}
export function compareScoreboardPlayers(
  a: Player,
  b: Player,
  key: ScoreboardKey,
  ascending: boolean,
) {
  const left = scoreboardValue(a, key),
    right = scoreboardValue(b, key);
  if (left == null) return right == null ? 0 : 1;
  if (right == null) return -1;
  if (left === right) return 0;
  return (left < right ? -1 : 1) * (ascending ? 1 : -1);
}
