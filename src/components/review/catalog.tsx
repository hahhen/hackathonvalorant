"use client";

import { cn } from "@/lib/utils";
import { tipCategoryTheme } from "@/lib/tip-category-theme";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCheck, Eye } from "lucide-react";
import {
  getTacticalTip,
  matchesTip,
  tipCategories,
  type EvidenceFilter,
} from "@/data/tactical-catalog";
import type { CoachTip } from "@/types/match";
import { TipFilters } from "./catalog-workspace";
import {
  InferenceDialog,
  TacticalTipCard,
  TipCategoryBadge,
} from "./tactical-tip";
export function TipCard({
  tip,
  onClick,
  compact = false,
}: {
  tip: CoachTip;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      className={cn(
        "tip-card w-full text-left border border-solid border-border rounded-[7px] bg-card p-5 transition-all duration-200 motion-reduce:transition-none [&_h3]:flex [&_h3]:items-start [&_h3]:justify-between [&_h3]:gap-2 [&_h3_svg]:shrink-0 [&_h3_svg]:mt-[3px] [&_h3_svg]:text-muted-foreground [&_p]:text-muted-foreground [&_p]:text-[13px] [&_p]:leading-[1.7] [&_p]:mt-[9px] [&.compact]:mb-3 [&.compact]:p-4 [&.compact_p]:text-[12px] max-[1000px]:[&.compact]:m-0 max-[650px]:[&.compact]:p-[17px] max-[650px]:[&.compact_p]:text-[13px]",
        compact && "compact",
        tipCategoryTheme(getTacticalTip(tip.id).tipo).card,
      )}
      onClick={onClick}
    >
      <div className="tip-meta flex items-center justify-between gap-[7px] text-[12px] text-muted-foreground">
        <span
          className={cn(
            "evidence inline-flex items-center gap-[5px] py-1 px-1.5 rounded-[4px] text-[12px]",
            tip.level === "M"
              ? "measured text-foreground/90 bg-foreground/5"
              : "inference text-primary bg-primary/10",
          )}
        >
          {tip.level === "M" ? <CheckCheck size={11} /> : <Eye size={11} />}
          {tip.level === "M" ? "Mensurável" : "Indício"}
        </span>
        <span>#{tip.id}</span>
      </div>
      <h3>
        {tip.title}
        <ArrowUpRight size={15} />
      </h3>
      <p>{compact ? tip.description : tip.observation}</p>
      <div className="tip-bottom flex justify-between gap-2 mt-4.5 pt-3 border-t border-solid border-border text-muted-foreground text-[12px]">
        <TipCategoryBadge categoryId={getTacticalTip(tip.id).tipo} />
        <span>
          {tip.rounds.length} {tip.rounds.length === 1 ? "round" : "rounds"}
        </span>
      </div>
    </button>
  );
}
export function TipDialog({
  tip,
  onClose,
  onRound,
}: {
  tip: CoachTip | null;
  onClose: () => void;
  onRound: (round: number) => void;
}) {
  return (
    <InferenceDialog
      tip={tip ? getTacticalTip(tip.id) : null}
      finding={tip ?? undefined}
      onClose={onClose}
      onRound={onRound}
    />
  );
}
export function MatchCatalog({
  tips,
  onTip,
  onRound,
}: {
  tips: CoachTip[];
  onTip: (tip: CoachTip) => void;
  onRound: (round: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<EvidenceFilter>("all");
  const filtered = tips.filter((tip) =>
    matchesTip(getTacticalTip(tip.id), query, level),
  );
  const groups = tipCategories
    .map((category) => ({
      ...category,
      tips: filtered.filter(
        (tip) => getTacticalTip(tip.id).tipo === category.id,
      ),
    }))
    .filter((category) => category.tips.length);
  return (
    <section className="catalog-section p-0 match-catalog">
      <div className="match-catalog-summary flex items-start justify-between gap-5 mt-2 mx-0 mb-6 [&_p]:text-[14px] [&_p]:text-muted-foreground [&_p]:mt-[7px] [&_p]:leading-[1.7] [&_>_a]:flex [&_>_a]:items-center [&_>_a]:gap-1.5 [&_>_a]:text-primary [&_>_a]:text-[14px] [&_>_a]:shrink-0 [&_>_a]:pt-1.5 max-[800px]:flex-col max-[800px]:gap-2.5">
        <div>
          <h2>Pontos para revisar</h2>
          <p>
            {tips.length} pontos identificados neste recorte, agrupados por tipo.
          </p>
        </div>
        <Link href="/app/catalogo">
          Ver as 100 dicas
          <ArrowUpRight size={15} />
        </Link>
      </div>
      <TipFilters
        query={query}
        level={level}
        onQuery={setQuery}
        onLevel={setLevel}
      />
      {!!groups.length && (
        <nav
          className="category-jump-links mb-7 flex flex-wrap gap-2 border-b border-border pb-6"
          aria-label="Tipos de dica nesta partida"
        >
          {groups.map((group) => (
            <a
              key={group.id}
              href={`#dicas-${group.id}`}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4",
                tipCategoryTheme(group.id).badge,
              )}
            >
              {group.nome}
              <span>{group.tips.length}</span>
            </a>
          ))}
        </nav>
      )}
      <div className="match-tip-groups grid gap-8.5">
        {groups.map((group) => (
          <section
            className="match-tip-group [&_.tactical-grid]:grid-cols-1 scroll-mt-7"
            key={group.id}
            id={`dicas-${group.id}`}
          >
            <div className="match-tip-group-heading flex items-center gap-3 mb-[15px] [&_>_span]:text-muted-foreground [&_>_span]:text-sm [&_>_a]:flex [&_>_a]:items-center [&_>_a]:gap-[5px] [&_>_a]:ml-auto [&_>_a]:text-muted-foreground [&_>_a]:text-[13px] max-[650px]:flex-wrap max-[650px]:gap-2">
              <h3 className={tipCategoryTheme(group.id).text}>{group.nome}</h3>
              <span>
                {group.tips.length} {group.tips.length === 1 ? "ponto" : "pontos"}
              </span>
              <Link href={`/app/catalogo/${group.id}`}>
                Ver tipo completo
                <ArrowUpRight size={13} />
              </Link>
            </div>
            <div className="tactical-grid grid grid-cols-2 gap-4.5 max-[800px]:grid-cols-1">
              {group.tips.map((tip) => (
                <TacticalTipCard
                  key={tip.id}
                  tip={getTacticalTip(tip.id)}
                  finding={tip}
                  onInfo={() => onTip(tip)}
                  onRound={onRound}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state py-[45px]! px-5! text-center text-muted-foreground text-sm [&_button]:block [&_button]:mt-2 [&_button]:mx-auto [&_button]:mb-0 [&_button]:text-[13px]">
          Nenhum ponto para revisar com os filtros selecionados.
        </div>
      )}
    </section>
  );
}
