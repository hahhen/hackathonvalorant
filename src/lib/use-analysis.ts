"use client";
import { useEffect, useState } from "react";
import type { AnalysisQuery, AnalysisSlice } from "@/types/analysis";

export type AnalysisState = {
  status: "loading" | "ready" | "error";
  data?: AnalysisSlice;
  error?: string;
};
export function useAnalysis(
  matchId: string,
  query: AnalysisQuery,
  enabled = true,
): AnalysisState {
  const params = new URLSearchParams({
    kind: query.kind,
    period: query.period,
  });
  if (query.round !== undefined) params.set("round", String(query.round));
  if (query.playerId) params.set("player", query.playerId);
  const key = `/api/analyses/${encodeURIComponent(matchId)}?${params}`;
  const [state, setState] = useState<{ key: string; result: AnalysisState }>();
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch(key, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "Não foi possível carregar a análise.");
        setState({ key, result: { status: "ready", data } });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            key,
            result: { status: "error", error: String(error.message) },
          });
      });
    return () => controller.abort();
  }, [key, enabled]);
  return enabled && state?.key === key ? state.result : { status: "loading" };
}
