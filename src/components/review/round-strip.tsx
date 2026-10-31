"use client";
import { useI18n } from "@/i18n/provider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  match as defaultMatch,
  rounds as defaultRounds,
} from "@/data/mock-match";
import { teamLabel } from "@/lib/teams";
import { getRoundOutcome } from "@/lib/round-outcome";
import { cn } from "@/lib/utils";
import type { MatchInfo, Round } from "@/types/match";

export function RoundStrip({
  active,
  onRound,
  match = defaultMatch,
  rounds = defaultRounds,
}: {
  active?: number;
  onRound: (round: number) => void;
  match?: MatchInfo;
  rounds?: Round[];
}) {
  const { t } = useI18n();
  return (
    <div
      className="round-strip flex gap-[5px] pt-3 px-5 pb-5 overflow-x-auto [scrollbar-width:thin] max-[650px]:px-3.5"
      aria-label={t("Selecionar round")}
    >
      {rounds.map((round) => (
        <Tooltip key={round.number}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onRound(round.number)}
              aria-label={t("Round {0}, vitória de {1}, {2}", { "0": round.number, "1": t(teamLabel(round.winner)), "2": t(getRoundOutcome(round)?.label ?? "resultado não informado") })}
              aria-pressed={round.number === active}
              className={cn(
                "round-chip min-w-[27px] flex-1 max-w-12 h-11.5 flex flex-col items-center justify-center gap-[9px] border border-solid border-border rounded-[4px] bg-muted text-foreground/90 text-[12px] relative [&.orbit]:text-primary [&.orbit]:border-primary/30 [&.orbit]:bg-primary/5 [&:hover]:brightness-[1.3] [&.selected]:outline-1 [&.selected]:outline-primary [&.selected]:outline-offset-2 [&.orbit_.round-chip-line]:bg-primary [&.half-switch]:ml-[11px] [&.half-switch::before]:content-[''] [&.half-switch::before]:absolute [&.half-switch::before]:left-[-10px] [&.half-switch::before]:h-[35px] [&.half-switch::before]:w-px [&.half-switch::before]:bg-muted max-[650px]:min-w-7",
                round.winner,
                round.number === active && "selected",
                round.number === 13 && "half-switch",
              )}
            >
              <span>{round.number}</span>
              <RoundOutcomeIcon round={round} />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {t("R")}{round.number} · {t(teamLabel(round.winner))} ·{t(" ")}
            {t(getRoundOutcome(round)?.label ?? "Resultado não informado")}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
export function RoundOutcomeIcon({ round }: { round: Round }) {
  const { t } = useI18n();
  const outcome = getRoundOutcome(round);
  if (!outcome) return <span aria-hidden="true">—</span>;
  return (
    <span
      data-round-outcome={round.result ?? outcome.label}
      aria-hidden="true"
      className={cn(
        "inline-block size-3.5 shrink-0 bg-current mask-contain mask-center mask-no-repeat",
        outcome.mask,
        round.winner === "horizon" ? "text-team-friendly" : "text-primary",
      )}
    />
  );
}
