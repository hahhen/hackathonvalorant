"use client";
import { AnalysisText } from "@/i18n/analysis-text";
import { useI18n } from "@/i18n/provider";
import { useState } from "react";
import { Info, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTacticalTip } from "@/data/tactical-catalog";
import { useAnalysis } from "@/lib/use-analysis";
import { cn } from "@/lib/utils";
import { tipCategoryTheme } from "@/lib/tip-category-theme";
import type { CoachTip, MatchInfo, Player, Round } from "@/types/match";
import { InferenceDialog, TipCategoryBadge } from "./tactical-tip";
import { CoachingPlayerSelect } from "./coaching-player-select";
import { AnalysisFeedback, FindingSample } from "./analysis-feedback";

export function RoundCoachingTips({
  match,
  round,
  players,
}: {
  match: MatchInfo;
  round: Round;
  players: Player[];
}) {
  const { t } = useI18n();
  const [playerId, setPlayerId] = useState(
    () => players.find((p) => p.team === "horizon")?.id ?? players[0]?.id,
  );
  const collective = useAnalysis(match.id, {
    kind: "team",
    period: "round",
    round: round.number,
  });
  const individual = useAnalysis(
    match.id,
    { kind: "player", period: "round", round: round.number, playerId },
    !!playerId,
  );
  return (
    <section
      data-tip-mode="computed"
      className="mb-5 rounded-lg border border-border bg-card p-5 max-[650px]:p-3.5"
      aria-label={t("Pontos para revisar do round {0}", { "0": round.number })}
    >
      <h2 className="mb-5 text-base font-medium">
        {t("Pontos para revisar · Round ")}{t(String(round.number).padStart(2, "0"))}
      </h2>
      <div className="grid min-w-0 grid-cols-2 gap-5 max-[800px]:grid-cols-1">
        <section
          className="min-w-0"
          aria-label={t("Pontos coletivos do round {0}", { "0": round.number })}
        >
          <div className="mb-4 flex min-h-16 items-center gap-2">
            <Users className="size-4 text-team-friendly" />
            <h3 className="text-sm font-medium">{t("Coletivos · Meu time")}</h3>
          </div>
          <AnalysisFeedback state={collective} />
          <AnalysisTipList
            key={`team:${round.number}`}
            tips={collective.data?.tips ?? []}
          />
        </section>
        <section
          className="min-w-0"
          aria-label={t("Pontos individuais do round {0}", { "0": round.number })}
        >
          <div className="mb-4 flex min-h-16 items-center justify-between gap-3 max-[500px]:flex-wrap">
            <h3 className="flex shrink-0 items-center gap-2 text-sm font-medium">
              <UserRound className="size-4 text-muted-foreground" />
              {t("Individuais")}</h3>
            <CoachingPlayerSelect
              players={players}
              playerId={playerId}
              onPlayer={setPlayerId}
            />
          </div>
          <AnalysisFeedback state={individual} />
          <AnalysisTipList
            key={`${playerId}:${round.number}`}
            tips={individual.data?.tips ?? []}
          />
        </section>
      </div>
    </section>
  );
}

export function AnalysisTipList({
  tips,
  onRound,
}: {
  tips: CoachTip[];
  onRound?: (round: number) => void;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<CoachTip | null>(null);
  return (
    <div className="grid gap-3">
      {(expanded ? tips : tips.slice(0, 3)).map((finding) => {
        const tip = getTacticalTip(finding.id);
        return (
          <article
            key={finding.analysis?.recommendationId ?? finding.id}
            data-tip-category={tip.tipo}
            data-recommendation-id={finding.analysis?.recommendationId}
            className={cn(
              "rounded-md border p-4",
              tipCategoryTheme(tip.tipo).card,
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <TipCategoryBadge categoryId={tip.tipo} />
                <span className="text-sm text-muted-foreground">#{tip.id}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t("Como é inferida a dica {0}", { "0": tip.id })}
                onClick={() => setDetail(finding)}
              >
                <Info />
              </Button>
            </div>
            <h4 className="mb-2 text-sm font-medium leading-relaxed">
              {t(tip.titulo)}
            </h4>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t(tip.descricao)}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              <AnalysisText text={finding.observation} />
            </p>
            <FindingSample finding={finding} />
          </article>
        );
      })}
      {tips.length > 3 && (
        <Button variant="outline" onClick={() => setExpanded(!expanded)}>
          {t(expanded ? "Mostrar menos" : t("Ver os {0} pontos para revisar", { "0": tips.length }))}
        </Button>
      )}
      <InferenceDialog
        tip={detail ? getTacticalTip(detail.id) : null}
        finding={detail ?? undefined}
        onClose={() => setDetail(null)}
        onRound={onRound}
      />
    </div>
  );
}
