import { MatchReviewLoader } from "@/components/matches/match-review-loader";

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ round?: string }>;
}) {
  const { id } = await params;
  const { round } = await searchParams;
  const requestedRound =
    round && /^\d+$/.test(round) ? Number(round) : undefined;
  return <MatchReviewLoader id={id} initialRound={requestedRound} />;
}
