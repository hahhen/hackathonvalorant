import type { CoachTip } from "./match";

export type AnalysisQuery = {
  kind: "team" | "player";
  period: "match" | "round";
  round?: number;
  playerId?: string;
};
export type AnalysisTarget = {
  kind: "team" | "player";
  teamId: string;
  playerId?: string;
};
export type AnalysisPeriod = { kind: "match" | "round"; roundNumber?: number };
export type AnalysisSample = NonNullable<CoachTip["analysis"]>["sample"];
export type AnalysisEvidence = NonNullable<
  CoachTip["analysis"]
>["evidence"][number];
export interface AnalysisCoverage {
  detectorId: string;
  tipId?: string;
  target: AnalysisTarget;
  period: AnalysisPeriod;
  status: NonNullable<CoachTip["analysis"]>["status"];
  sample: AnalysisSample;
  reasons: string[];
}
export interface EngineAnalysis {
  schemaVersion: string;
  mode: string;
  matchId: string;
  source: { sha256: string };
  engine: { version: string; catalogVersion: number };
  coverage: AnalysisCoverage[];
  occurrences: {
    id: string;
    detectorId: string;
    basis: "measured" | "inferred";
    evidence: AnalysisEvidence[];
  }[];
  recommendations: {
    id: string;
    tipId: string;
    target: AnalysisTarget;
    period: AnalysisPeriod;
    observation: string;
    roundNumbers: number[];
    occurrenceIds: string[];
    sample: AnalysisSample;
    priority: "low" | "medium" | "high";
    priorityReasons: string[];
    limitations: string[];
  }[];
}
export interface AnalysisSlice {
  matchId: string;
  engineVersion: string;
  sourceSha256: string;
  target: AnalysisTarget;
  period: AnalysisPeriod;
  tips: CoachTip[];
  coverage: AnalysisCoverage[];
}
