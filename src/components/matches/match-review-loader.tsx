"use client";
import { useI18n } from "@/i18n/provider";
import Link from "@/i18n/link";
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
  const { t } = useI18n();
  const fixture = getOfficialReview(id)?.match;
  if (!fixture)
    return (
      <AppShell>
        <div className="page-heading flex justify-between items-center gap-5 mb-7 min-h-[49px] [&_p]:text-muted-foreground [&_p]:text-[14px] [&_p]:leading-[1.6] [&_p]:mt-[7px] [&_>_button]:text-sm [&_>_button]:bg-card max-[650px]:mb-5.5 max-[650px]:gap-3 max-[650px]:[&_p]:text-sm max-[650px]:[&_p]:max-w-[245px]">
          <h1>{t("Partida não encontrada")}</h1>
        </div>
        {
          <Link
            className="back-link inline-flex items-center gap-2 text-muted-foreground text-sm [&:hover]:text-foreground"
            href="/app"
          >
            {t("Voltar para partidas")}</Link>
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
