"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { teamLabel } from "@/lib/teams";
import { getRoundOutcome } from "@/lib/round-outcome";
import { cn } from "@/lib/utils";
import type { MatchInfo, Round } from "@/types/match";
import { RoundStrip, RoundOutcomeIcon } from "./round-strip";

export function RoundSelector({
  match,
  rounds,
  roundNumber,
  onRound,
}: {
  match: MatchInfo;
  rounds: Round[];
  roundNumber: number;
  onRound: (round: number) => void;
}) {
  const round = rounds[roundNumber - 1];
  const isReal = match.dataMode === "official-json";
  if (!round) return null;
  return (
    <section
      aria-labelledby="round-selector-title"
      className="mb-5 overflow-hidden rounded-lg border border-border bg-card"
    >
      <div className="section-heading flex justify-between items-center gap-[13px] p-[21px] [&_h2]:text-sm [&_h2]:font-medium [&_h3]:text-sm [&_h3]:font-medium [&_p]:text-muted-foreground [&_p]:text-[13px] [&_p]:leading-[1.6] [&_p]:mt-1.5 max-[650px]:py-[17px] max-[650px]:px-3.5 max-[650px]:[&_h2]:text-[14px]">
        <div>
          <h2 id="round-selector-title">Inspetor de rounds</h2>
        </div>
        <Badge
          variant="outline"
          className="muted-badge text-[12px] font-normal text-muted-foreground border-border py-1 px-[7px]"
        >
          {isReal ? "Eventos do JSON" : "Eventos simulados"}
        </Badge>
      </div>
      <RoundStrip
        match={match}
        rounds={rounds}
        active={roundNumber}
        onRound={onRound}
      />
      <div className="round-summary flex justify-between items-center py-3 px-5 border-t border-solid border-border gap-2.5 bg-muted max-[650px]:items-start max-[650px]:flex-col max-[650px]:p-3 max-[650px]:gap-3">
        <div className="round-heading flex flex-wrap items-center gap-2 [&_button]:h-6.5 [&_button]:w-6.5 [&_button]:text-muted-foreground [&_>_strong]:text-sm [&_>_strong]:font-medium [&_>_strong]:whitespace-nowrap max-[650px]:gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Round anterior"
            disabled={roundNumber === 1}
            onClick={() => onRound(roundNumber - 1)}
          >
            <ChevronLeft size={17} />
          </Button>
          <strong>Round {roundNumber.toString().padStart(2, "0")}</strong>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Próximo round"
            disabled={roundNumber === rounds.length}
            onClick={() => onRound(roundNumber + 1)}
          >
            <ChevronRight size={17} />
          </Button>
          <span
            className={cn(
              "round-winner text-[12px] bg-team-friendly/10 text-team-friendly rounded-[3px] py-[5px] px-[7px] ml-2 [&.orbit]:text-primary [&.orbit]:bg-primary/10",
              round.winner,
            )}
          >
            {teamLabel(round.winner)} venceu
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <RoundOutcomeIcon round={round} />
            {getRoundOutcome(round)?.label ?? "Resultado não informado"}
          </span>
        </div>
        <span className="round-side text-[13px] text-muted-foreground [&_>_span]:text-muted-foreground [&_>_span]:my-0 [&_>_span]:mx-2 max-[650px]:text-[12px]">
          {teamLabel(round.attackTeam)} no ataque <span>·</span>
          {round.site ? `Plant no ${round.site}` : "Sem plant"}
        </span>
      </div>
    </section>
  );
}
