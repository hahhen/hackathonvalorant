"use client";
import { AnalysisText } from "@/i18n/analysis-text";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { FindingSample } from "./analysis-feedback";
import { tipCategoryTheme } from "@/lib/tip-category-theme";

import {
  ArrowUpRight,
  BookOpen,
  CheckCheck,
  Eye,
  Info,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dataFields,
  tipCategories,
  type TacticalTip,
} from "@/data/tactical-catalog";
import type { CoachTip } from "@/types/match";
export function TipCategoryBadge({ categoryId }: { categoryId: string }) {
  const { t } = useI18n();
  return (
    <span
      data-tip-category={categoryId}
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-[12px] font-medium leading-normal",
        tipCategoryTheme(categoryId).badge,
      )}
    >
      {t(tipCategories.find((category) => category.id === categoryId)?.nome ??
        categoryId)}
    </span>
  );
}
export function EvidenceBadge({ tip }: { tip: TacticalTip }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "evidence inline-flex items-center gap-[5px] py-1 px-1.5 rounded-[4px] text-[12px]",
        tip.classificacao === "mensuravel"
          ? "measured text-foreground/90 bg-foreground/5"
          : "inference text-primary bg-primary/10",
      )}
    >
      {tip.classificacao === "mensuravel" ? (
        <CheckCheck size={12} />
      ) : (
        <Eye size={12} />
      )}
      {t(tip.classificacao === "mensuravel"
        ? "Mensurável"
        : tip.classificacao === "misto"
          ? "Mensurável + indício"
          : "Indício")}
      {t(tip.inferencia.indicioFraco && " · fraco")}
    </span>
  );
}
export function TipRoundLinks({
  rounds,
  onRound,
}: {
  rounds: number[];
  onRound: (round: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="round-links flex flex-wrap gap-[7px]">
      {rounds.map((round) => (
        <Button
          key={round}
          variant="outline"
          size="sm"
          aria-label={t("Ver round {0}", { "0": round })}
          onClick={() => onRound(round)}
        >
          {t("R")}{round}
          <ArrowUpRight size={12} />
        </Button>
      ))}
    </div>
  );
}
export function TacticalTipCard({
  tip,
  finding,
  onInfo,
  onRound,
}: {
  tip: TacticalTip;
  finding?: CoachTip;
  onInfo: () => void;
  onRound?: (round: number) => void;
}) {
  const { t } = useI18n();
  return (
    <article
      data-tip-category={tip.tipo}
      className={cn(
        "tactical-tip min-w-0 p-5.5 border border-solid border-border rounded-[8px] bg-card [&_.evidence]:text-[13px] [&_.evidence]:py-[5px] [&_.evidence]:px-[7px] max-[650px]:p-4.5",
        tipCategoryTheme(tip.tipo).card,
        finding &&
          "match-tactical-tip [&_.tip-guidance]:grid-cols-2 [&_.tip-guidance]:gap-7 max-[800px]:[&_.tip-guidance]:grid-cols-1 max-[800px]:[&_.tip-guidance]:gap-[17px]",
      )}
    >
      <div className="tactical-tip-top flex gap-3 items-start justify-between mb-[13px]">
        <div className="tip-badges flex items-center gap-2 flex-wrap">
          <TipCategoryBadge categoryId={tip.tipo} />
          <span className="tip-code text-sm text-muted-foreground tabular-nums">
            #{tip.id}
          </span>
          <EvidenceBadge tip={tip} />
          {tip.inferencia.requerGeometria && (
            <span className="geometry-tag inline-flex items-center gap-[5px] text-muted-foreground text-[13px]">
              <Map size={12} />
              {t("Requer mapa")}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="inference-button shrink-0 w-7.5 h-7.5 text-muted-foreground mt-[-4px] mr-[-5px] mb-0 ml-0 [&:hover]:text-primary [&:hover]:bg-primary/10"
          onClick={onInfo}
          aria-label={t("Como a dica {0} é inferida", { "0": tip.id })}
          title={t("Como é inferida pelos dados")}
        >
          <Info size={18} />
        </Button>
      </div>
      <h3>{t(tip.titulo)}</h3>
      {finding && (
        <div className="finding-observation border-l-2 border-solid border-primary pt-0 pr-0 pb-0 pl-3 mb-5 [&_>_span]:block [&_>_span]:text-[13px] [&_>_span]:text-muted-foreground [&_>_span]:mb-[7px] [&_p]:text-foreground/90 [&_p]:text-[14px] [&_p]:leading-[1.7]">
          <span>{t("Observado neste recorte")}</span>
          <p><AnalysisText text={finding.observation} /></p>
          <FindingSample finding={finding} />
        </div>
      )}
      <p className="tip-description text-sm leading-relaxed text-muted-foreground">
        {t(tip.descricao)}
      </p>
      {finding && onRound && (
        <div className="finding-rounds [&_>_span]:block [&_>_span]:text-[13px] [&_>_span]:text-muted-foreground [&_>_span]:mb-[7px] border-t border-solid border-border mt-5 pt-[15px] [&_.round-links_button]:text-sm [&_.round-links_button]:text-primary [&_.round-links_button]:border-primary/20 [&_.round-links_button]:bg-primary/5">
          <span>{t("Rounds relacionados")}</span>
          <TipRoundLinks rounds={finding.rounds} onRound={onRound} />
        </div>
      )}
    </article>
  );
}
export function InferenceDialog({
  tip,
  finding,
  onClose,
  onRound,
}: {
  tip: TacticalTip | null;
  finding?: CoachTip;
  onClose: () => void;
  onRound?: (round: number) => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={!!tip} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="tip-dialog max-w-135 inference-dialog [&_.evidence]:text-[13px] [&_.evidence]:py-[5px] [&_.evidence]:px-[7px] w-[min(680px,_calc(100vw_-_32px))] max-w-170! max-h-[calc(100dvh_-_48px)] overflow-y-auto p-7 [&_[data-slot=dialog-title]]:text-xl [&_[data-slot=dialog-title]]:leading-[1.5] [&_[data-slot=dialog-title]]:font-[550] [&_[data-slot=dialog-title]]:pr-5 [&_[data-slot=dialog-header]]:text-left [&_.tip-detail]:text-[14px] [&_.tip-detail]:gap-[23px] [&_h4]:text-[14px] [&_h4]:text-foreground/90 max-[650px]:p-5.5 max-[650px]:max-h-[calc(100dvh_-_30px)]">
        <DialogHeader>
          <DialogTitle>{t(tip?.titulo)}</DialogTitle>
          <DialogDescription>
            {t("Dica #")}{tip?.id} ·{t(" ")}
            {t(tipCategories.find((type) => type.id === tip?.tipo)?.nome)}
          </DialogDescription>
        </DialogHeader>
        {tip && (
          <div className="tip-detail grid gap-5.5 text-sm text-muted-foreground leading-[1.75] pt-1.5 [&_h4]:text-sm [&_h4]:font-medium [&_h4]:text-foreground/90 [&_h4]:mb-[7px]">
            <TipCategoryBadge categoryId={tip.tipo} />
            <div className="tip-badges flex items-center gap-2 flex-wrap">
              <EvidenceBadge tip={tip} />
              {tip.inferencia.requerGeometria && (
                <span className="geometry-tag inline-flex items-center gap-[5px] text-muted-foreground text-[13px]">
                  <Map size={13} />
                  {t("Requer geometria complementar")}</span>
              )}
            </div>
            <p className="tip-description text-sm leading-relaxed text-muted-foreground">
              {t(tip.descricao)}
            </p>
            {finding && (
              <div className="evidence-block p-[17px] border border-solid border-border rounded-[7px] bg-muted [&_p]:mt-[9px] [&_p]:mx-0 [&_p]:mb-3 [&_p]:text-foreground/90 [&_[data-slot=badge]]:text-muted-foreground [&_[data-slot=badge]]:text-[12px]">
                <h4>{t("Observado nesta partida")}</h4>
                <p><AnalysisText text={finding.observation} /></p>
                <FindingSample finding={finding} />
                {onRound && (
                  <TipRoundLinks
                    rounds={finding.rounds}
                    onRound={(round) => {
                      onClose();
                      onRound(round);
                    }}
                  />
                )}
              </div>
            )}
            <section>
              <h4>{t("Como é inferida pelos dados")}</h4>
              <p>{t(tip.inferencia.metodo)}</p>
            </section>
            {finding?.analysis && (
              <>
                <section className="rounded-md border border-border bg-muted p-4">
                  <h4>{t("Limites do recorte calculado")}</h4>
                  <p><AnalysisText text={finding.limitation} /></p>
                  <p className="mt-2">
                    {finding.analysis.priorityReasons.map((reason, index) => <span key={index}><AnalysisText text={reason} />{" "}</span>)}
                  </p>
                </section>
                <details className="rounded-md border border-border p-4">
                  <summary className="cursor-pointer text-foreground">
                    {t("Evidências · ")}{finding.analysis.evidence.length}{t(" registros")}</summary>
                  <div className="mt-3 grid gap-3">
                    {finding.analysis.evidence.map((ev, index) => (
                      <div
                        key={`${ev.sourcePath}:${index}`}
                        className="min-w-0 rounded border border-border bg-muted p-3 text-sm"
                      >
                        <p className="text-foreground">
                          {t("Round ")}{ev.roundNumber}
                          {t(ev.eventId ? ` · ${ev.eventId}` : "")}
                        </p>
                        <code className="block wrap-anywhere text-muted-foreground">
                          {ev.sourcePath}
                        </code>
                        <dl className="mt-2 grid gap-1">
                          {Object.entries(ev.values).map(([key, value]) => (
                            <div key={key} className="wrap-anywhere">
                              <dt className="inline font-medium text-foreground">
                                {key}:{t(" ")}
                              </dt>
                              <dd className="inline">
                                {value == null
                                  ? t("Não informado")
                                  : String(value)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                </details>
              </>
            )}
            <section>
              <h4>{t("Campos utilizados")}</h4>
              <div className="inference-fields grid gap-1.5 mt-[11px] [&_details]:border [&_details]:border-solid [&_details]:border-border [&_details]:rounded-[5px] [&_details]:overflow-hidden [&_summary]:p-2.5 [&_summary]:cursor-pointer [&_summary]:text-muted-foreground [&_summary_>_span]:text-primary [&_summary_>_span]:pt-0 [&_summary_>_span]:pr-2.5 [&_summary_>_span]:pb-0 [&_summary_>_span]:pl-[3px] [&_summary_>_span]:font-mono [&_ul]:border-t [&_ul]:border-solid [&_ul]:border-border [&_ul]:py-2.5 [&_ul]:px-3.5 [&_ul]:grid [&_ul]:gap-2 [&_ul]:text-muted-foreground [&_ul]:text-[13px] [&_ul]:wrap-anywhere">
                {tip.inferencia.campos.map((code) => {
                  const field = dataFields[code as keyof typeof dataFields];
                  return (
                    <details key={code}>
                      <summary>
                        <span>{code}</span>
                        {t(field.nome)}
                      </summary>
                      <ul>
                        {field.caminhos.map((path) => (
                          <li key={path}>
                            <code>{path}</code>
                          </li>
                        ))}
                      </ul>
                    </details>
                  );
                })}
              </div>
            </section>
            <section className="inference-limit p-[15px] border-l-2 border-solid border-primary/50 bg-primary/5">
              <h4>{t("O que isso não permite concluir")}</h4>
              <p>{t(tip.inferencia.limites)}</p>
            </section>
            <p className="inference-note text-[13px] text-muted-foreground">
              {t("Métodos e limiares são propostas de análise. Mensurável não significa erro confirmado; indícios precisam de contexto. A presença no catálogo não significa que a dica seja avaliável nesta partida.")}</p>
            <div className="source-line flex items-center gap-[7px] text-[12px] border-t border-solid border-border pt-[15px]">
              <BookOpen size={14} />
              <span>{t("Referência no documento · ")}{tip.origem}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
