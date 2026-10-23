"use client";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ReviewWorkspace } from "@/components/review/review-workspace";
import { getOfficialReview } from "@/data/official-matches";
export function MatchReviewLoader({
  id,
  initialRound,
}: {
  id: string;
  initialRound?: number;
}) {
  const fixture = getOfficialReview(id)?.match;
  if (!fixture)
    return (
      <AppShell>
        <div className="page-heading flex justify-between items-center gap-5 mb-7 min-h-[49px] [&_h1]:text-3xl [&_h1]:font-[550] [&_h1]:tracking-[-0.95px] [&_h1]:leading-[1.3] [&_p]:text-muted-foreground [&_p]:text-[14px] [&_p]:leading-[1.6] [&_p]:mt-[7px] [&_>_button]:text-sm [&_>_button]:bg-card max-[650px]:mb-5.5 max-[650px]:gap-3 max-[650px]:[&_h1]:text-[27px] max-[650px]:[&_p]:text-sm max-[650px]:[&_p]:max-w-[245px]">
          <h1>Partida não encontrada</h1>
        </div>
        {
          <Link
            className="back-link inline-flex items-center gap-2 text-muted-foreground text-sm [&:hover]:text-foreground"
            href="/"
          >
            Voltar para partidas
          </Link>
        }
      </AppShell>
    );
  return (
    <ReviewWorkspace
      key={fixture.id}
      fixture={fixture}
      initialRound={initialRound}
    />
  );
}
