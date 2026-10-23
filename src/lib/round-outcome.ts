import type { Round } from "@/types/match";

const outcomes = {
  explosion: {
    label: "Explosão da spike",
    image: "/assets/round-results/boom.webp",
    mask: "mask-[url(/assets/round-results/boom.webp)]",
  },
  time: {
    label: "Tempo esgotado",
    image: "/assets/round-results/time.webp",
    mask: "mask-[url(/assets/round-results/time.webp)]",
  },
  elimination: {
    label: "Eliminação",
    image: "/assets/round-results/elim.webp",
    mask: "mask-[url(/assets/round-results/elim.webp)]",
  },
  defuse: {
    label: "Spike desarmada",
    image: "/assets/round-results/defuse.webp",
    mask: "mask-[url(/assets/round-results/defuse.webp)]",
  },
};
export function getRoundOutcome(round: Round) {
  const result = round.result?.trim().toLowerCase();
  if (result === "detonate" || result === "bomb detonated")
    return outcomes.explosion;
  if (result === "defuse" || result === "bomb defused") return outcomes.defuse;
  if (result === "elimination" || result === "eliminated")
    return outcomes.elimination;
  if (result === "round timer expired") return outcomes.time;
  // Legacy mock fixtures have explicit objective events but no result field.
  if (!result && round.events.some((event) => event.type === "defuse"))
    return outcomes.defuse;
  if (!result && round.events.some((event) => event.type === "detonate"))
    return outcomes.explosion;
  return undefined;
}
