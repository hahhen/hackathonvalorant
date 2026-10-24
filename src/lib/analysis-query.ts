import type { OfficialReview } from "@/data/official-match";
import { getTacticalTip, tipCategories } from "@/data/tactical-catalog";
import detectors from "@/data/engine-detectors.json";
import type {
  AnalysisQuery,
  AnalysisPeriod,
  AnalysisSlice,
  AnalysisTarget,
  EngineAnalysis,
} from "@/types/analysis";

/** Exact source identities only. Nicknames and array order never resolve a target. */
export function selectAnalysis(
  raw: EngineAnalysis,
  review: OfficialReview,
  query: AnalysisQuery,
): AnalysisSlice {
  if (
    raw.mode !== "computed" ||
    raw.schemaVersion !== "1.1.0" ||
    raw.engine.catalogVersion !== 3 ||
    raw.engine.version !== "0.4.0" ||
    raw.matchId !== review.match.id ||
    raw.source.sha256 !== review.source.sha256
  )
    throw new Error("Análise incompatível com a partida importada.");
  const identity = review.source.localPlayerToPuuid;
  if (!identity || !review.source.friendlyTeamId)
    throw new Error("Mapa explícito de identidades ausente.");
  const selected =
    query.kind === "player"
      ? review.players.find((p) => p.id === query.playerId)
      : undefined;
  if (query.kind === "player" && (!selected || !identity[selected.id]))
    throw new RangeError("Jogador não pertence à partida.");
  const teamId =
    !selected || selected.team === "horizon"
      ? review.source.friendlyTeamId
      : review.source.friendlyTeamId === "Blue"
        ? "Red"
        : "Blue";
  const target: AnalysisTarget = selected
    ? { kind: "player", teamId, playerId: identity[selected.id] }
    : { kind: "team", teamId };
  if (
    query.period === "round" &&
    !review.rounds.some((r) => r.number === query.round)
  )
    throw new RangeError("Round inválido.");
  const period: AnalysisPeriod =
    query.period === "round"
      ? { kind: "round" as const, roundNumber: query.round }
      : { kind: "match" as const };
  const matches = (row: { target: AnalysisTarget; period: AnalysisPeriod }) =>
    row.target.kind === target.kind &&
    row.target.teamId === target.teamId &&
    row.target.playerId === target.playerId &&
    row.period.kind === period.kind &&
    row.period.roundNumber === period.roundNumber;
  const coverage = raw.coverage.filter(matches).map((c) => ({
    ...c,
    tipId: Object.entries(detectors).find(([, id]) => id === c.detectorId)?.[0],
  }));
  const occurrences = new Map(raw.occurrences.map((o) => [o.id, o]));
  const names = Object.entries(identity).map(
    ([local, puuid]) =>
      [puuid, review.players.find((p) => p.id === local)] as const,
  );
  const readable = (text: string) =>
    names.reduce(
      (value, [puuid, player]) =>
        player
          ? value.replaceAll(puuid, `${player.name}#${player.tag}`)
          : value,
      text,
    );
  const tips = raw.recommendations.filter(matches).map((rec) => {
    const tip = getTacticalTip(rec.tipId);
    const refs = rec.occurrenceIds.map((id) => occurrences.get(id));
    if (!refs.length || refs.some((o) => !o))
      throw new Error("Referência de evidência ausente.");
    const evidence = refs.flatMap((o) => o!.evidence);
    const detectorId = refs[0]!.detectorId;
    const cov = coverage.find((c) => c.detectorId === detectorId);
    if (!cov) throw new Error("Cobertura da recomendação ausente.");
    return {
      id: tip.id,
      title: tip.titulo,
      category: tipCategories.find((c) => c.id === tip.tipo)?.nome ?? tip.tipo,
      level: refs.every((o) => o!.basis === "measured")
        ? ("M" as const)
        : ("I" as const),
      description: tip.descricao,
      observation: readable(rec.observation),
      limitation: rec.limitations.map(readable).join(" "),
      source: tip.origem,
      rounds: rec.roundNumbers,
      analysis: {
        recommendationId: rec.id,
        detectorId,
        status: cov.status,
        sample: rec.sample,
        priority: rec.priority,
        priorityReasons: rec.priorityReasons,
        evidence,
      },
    };
  });
  return {
    matchId: raw.matchId,
    engineVersion: raw.engine.version,
    sourceSha256: raw.source.sha256,
    target,
    period,
    tips,
    coverage,
  };
}
