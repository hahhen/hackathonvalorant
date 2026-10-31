"use client";
import { useI18n } from "@/i18n/provider";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAnalysis, type AnalysisState } from "@/lib/use-analysis";
import type { CoachTip, Player } from "@/types/match";
import { CoachingPlayerSelect } from "./coaching-player-select";
import { AnalysisFeedback } from "./analysis-feedback";
import { MatchCatalog } from "./catalog";

export function AnalysisCatalog({
  matchId,
  players,
  collective,
  onTip,
  onRound,
}: {
  matchId: string;
  players: Player[];
  collective: AnalysisState;
  onTip: (tip: CoachTip) => void;
  onRound: (round: number) => void;
}) {
  const { t } = useI18n();
  const [scope, setScope] = useState<"team" | "player">("team");
  const [playerId, setPlayerId] = useState(
    () => players.find((p) => p.team === "horizon")?.id ?? players[0]?.id,
  );
  const individual = useAnalysis(
    matchId,
    { kind: "player", period: "match", playerId },
    scope === "player" && !!playerId,
  );
  const state = scope === "team" ? collective : individual;
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="group" aria-label={t("Escopo das dicas")}>
          <Button
            variant={scope === "team" ? "secondary" : "outline"}
            aria-pressed={scope === "team"}
            onClick={() => setScope("team")}
          >
            {t("Coletivas · Meu time")}</Button>
          <Button
            variant={scope === "player" ? "secondary" : "outline"}
            aria-pressed={scope === "player"}
            onClick={() => setScope("player")}
          >
            {t("Individuais")}</Button>
        </div>
        {scope === "player" && (
          <CoachingPlayerSelect
            players={players}
            playerId={playerId}
            onPlayer={setPlayerId}
          />
        )}
      </div>
      <AnalysisFeedback state={state} />
      <MatchCatalog
        tips={state.data?.tips ?? []}
        onTip={onTip}
        onRound={onRound}
      />
    </>
  );
}
