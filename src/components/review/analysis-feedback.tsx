"use client";
import { getTacticalTip } from "@/data/tactical-catalog";
import type { AnalysisState } from "@/lib/use-analysis";
import type { CoachTip } from "@/types/match";

export function AnalysisFeedback({ state }: { state: AnalysisState }) {
  if (state.status === "loading")
    return (
      <p role="status" className="mb-4 text-sm text-muted-foreground">
        Carregando análise…
      </p>
    );
  if (state.status === "error")
    return (
      <p
        role="alert"
        className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground"
      >
        {state.error}
      </p>
    );
  const coverage = state.data?.coverage ?? [];
  const unavailable = coverage.filter(
    (c) => c.status === "not_evaluable" || c.status === "not_implemented",
  );
  return (
    <div
      className="mb-4 text-sm leading-relaxed text-muted-foreground"
      data-analysis-state="ready"
    >
      {state.data?.tips.length === 0 && (
        <p>
          Nenhum ponto para revisar identificado neste recorte. Isso não garante
          ausência de problemas.
        </p>
      )}
      {unavailable.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer">
            {unavailable.length} regras sem dados suficientes neste recorte
          </summary>
          <ul className="mt-3 grid gap-2 border-l border-border pl-4">
            {unavailable.map((c) => (
              <li key={c.detectorId}>
                <span className="text-foreground">
                  {c.tipId
                    ? `#${c.tipId} · ${getTacticalTip(c.tipId).titulo}`
                    : c.detectorId}
                </span>
                <p>{c.reasons.join(" ")}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function FindingSample({ finding }: { finding: CoachTip }) {
  const data = finding.analysis;
  if (!data) return null;
  const units: Record<string, string> = {
    round: "rounds",
    death: "mortes",
    opening: "aberturas",
    plant: "plants",
    match: "partida",
  };
  return (
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
      {data.sample.flagged} de {data.sample.evaluated}{" "}
      {units[data.sample.unit] ?? "oportunidades"} avaliados
      {data.status === "partial" && " · Recorte parcial"}
    </p>
  );
}
