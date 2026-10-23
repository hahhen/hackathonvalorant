"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { tipCategoryTheme } from "@/lib/tip-category-theme";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Crosshair,
  Fingerprint,
  Focus,
  Layers3,
  Map,
  Search,
  Shield,
  Swords,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  matchesTip,
  tacticalTips,
  tipCategories,
  type EvidenceFilter,
  type TacticalTip,
} from "@/data/tactical-catalog";
import { InferenceDialog, TacticalTipCard } from "./tactical-tip";
const categoryIcons: Record<string, LucideIcon> = {
  economia: Banknote,
  pistol: Crosshair,
  posicionamento: Focus,
  "trabalho-em-equipe": Users,
  objetivo: Shield,
  clutch: Swords,
  operator: Fingerprint,
  mira: Crosshair,
  habilidades: Layers3,
  ascent: Map,
};
export function TipFilters({
  query,
  level,
  onQuery,
  onLevel,
}: {
  query: string;
  level: EvidenceFilter;
  onQuery: (value: string) => void;
  onLevel: (value: EvidenceFilter) => void;
}) {
  return (
    <div className="catalog-toolbar flex items-center justify-between gap-4 mt-0 mx-0 mb-6 max-[650px]:flex-wrap max-[650px]:gap-4 max-[650px]:mb-5 max-[650px]:[&_.search-field]:w-full tactical-toolbar [&_.search-field]:w-[min(430px,_100%)] [&_.search-field_input]:h-10.5 [&_.search-field_input]:text-[14px] max-[800px]:items-start max-[800px]:flex-wrap max-[800px]:[&_.search-field]:w-full">
      <div className="search-field relative w-72.5 [&_>_svg]:absolute [&_>_svg]:left-3 [&_>_svg]:top-[50%] [&_>_svg]:-translate-y-1/2 [&_>_svg]:text-muted-foreground [&_>_svg]:z-1 [&_input]:h-9.5 [&_input]:text-sm [&_input]:pl-9 [&_input]:bg-card [&_input]:border-border [&_input::placeholder]:text-muted-foreground">
        <Search size={16} />
        <Input
          aria-label="Buscar dica"
          placeholder="Buscar por dica, descrição ou código..."
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
      </div>
      <div className="filter-pills flex gap-[5px] [&_button]:h-8.5 [&_button]:text-sm [&_button]:text-muted-foreground [&_button[aria-pressed=true]]:bg-primary/10 [&_button[aria-pressed=true]]:text-primary max-[650px]:w-full">
        {(
          [
            ["all", "Todas"],
            ["mensuravel", "Mensuráveis"],
            ["indicio", "Indícios"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            variant={level === id ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={level === id}
            onClick={() => onLevel(id)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
export function CatalogWorkspace({ categoryId }: { categoryId?: string }) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<EvidenceFilter>("all");
  const [selectedTip, setSelectedTip] = useState<TacticalTip | null>(null);
  const category = tipCategories.find((type) => type.id === categoryId);
  const searching = query.trim().length > 0 || level !== "all";
  const filtered = tacticalTips.filter(
    (tip) =>
      (!category || tip.tipo === category.id) && matchesTip(tip, query, level),
  );
  return (
    <AppShell section="catalog">
      {category && (
        <Link
          className="catalog-back inline-flex items-center gap-[7px] text-muted-foreground text-[14px] mb-4.5 [&:hover]:text-foreground"
          href="/catalogo"
        >
          <ArrowLeft size={15} />
          Todos os tipos
        </Link>
      )}
      <div className="page-heading flex justify-between items-center gap-5 mb-7 min-h-[49px] [&_h1]:text-3xl [&_h1]:font-[550] [&_h1]:tracking-[-0.95px] [&_h1]:leading-[1.3] [&_>_button]:text-sm [&_>_button]:bg-card max-[650px]:mb-5.5 max-[650px]:gap-3 max-[650px]:[&_h1]:text-[27px] max-[650px]:[&_p]:max-w-[245px] catalog-heading [&_p]:text-muted-foreground [&_p]:text-sm [&_p]:leading-[1.7] [&_p]:mt-2 max-[650px]:[&_p]:text-[14px]">
        <div>
          <h1
            className={
              category ? tipCategoryTheme(category.id).text : undefined
            }
          >
            {category?.nome ?? "Catálogo tático"}
          </h1>
          <p>
            {category
              ? `${category.total} dicas · ${category.descricao}`
              : `${tacticalTips.length} dicas organizadas por tipo. A biblioteca completa, independente de uma partida.`}
          </p>
        </div>
      </div>
      <TipFilters
        query={query}
        level={level}
        onQuery={setQuery}
        onLevel={setLevel}
      />
      {!category && !searching ? (
        <div className="category-grid grid grid-cols-3 gap-4.5 max-[1100px]:grid-cols-2 max-[650px]:grid-cols-1 max-[650px]:gap-[13px]">
          {tipCategories.map((type, index) => {
            const Icon = categoryIcons[type.id];
            return (
              <Link
                data-tip-category={type.id}
                className={cn(
                  "category-card flex flex-col p-6 border border-solid rounded-[9px] transition-all duration-200 motion-reduce:transition-none [&:hover]:-translate-y-[3px] [&:focus-visible]:outline-2 [&:focus-visible]:outline-primary [&:focus-visible]:outline-offset-4 [&_h2]:text-[19px] [&_h2]:font-[550] [&_h2]:leading-[1.35] [&_h2]:mt-[21px] [&_>_p]:text-[14px] [&_>_p]:leading-[1.7] [&_>_p]:text-muted-foreground [&_>_p]:mt-2 [&_>_p]:mb-6 max-[650px]:p-[21px]",
                  tipCategoryTheme(type.id).card,
                )}
                key={type.id}
                href={`/catalogo/${type.id}`}
              >
                <div className="category-card-top flex justify-between items-center">
                  <span
                    className={cn(
                      "category-icon grid place-items-center w-[47px] h-[47px] border border-solid rounded-[9px]",
                      tipCategoryTheme(type.id).badge,
                    )}
                  >
                    <Icon size={23} strokeWidth={1.5} />
                  </span>
                  <span className="category-number text-muted-foreground text-sm tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h2>{type.nome}</h2>
                <p>{type.descricao}</p>
                <div className="category-card-bottom mt-auto border-t border-solid border-border pt-4 flex justify-between items-center text-foreground/90 text-sm">
                  <span>{type.total} dicas</span>
                  <ArrowUpRight
                    size={18}
                    className={tipCategoryTheme(type.id).text}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <>
          <div className="catalog-results flex justify-between flex-wrap gap-2.5 text-sm text-muted-foreground mb-4.5">
            <span>
              {filtered.length} {filtered.length === 1 ? "dica" : "dicas"}
              {searching &&
                (filtered.length === 1 ? " encontrada" : " encontradas")}
            </span>
            <span>Use ⓘ para ver o método e os limites.</span>
          </div>
          <div className="tactical-grid grid grid-cols-2 gap-4.5 max-[800px]:grid-cols-1">
            {filtered.map((tip) => (
              <TacticalTipCard
                key={tip.id}
                tip={tip}
                onInfo={() => setSelectedTip(tip)}
              />
            ))}
          </div>
          {!filtered.length && (
            <div className="empty-state py-[45px]! px-5! text-center text-muted-foreground text-sm [&_button]:block [&_button]:mt-2 [&_button]:mx-auto [&_button]:mb-0 [&_button]:text-[13px]">
              Nenhuma dica encontrada com esses filtros.
            </div>
          )}
        </>
      )}
      <InferenceDialog tip={selectedTip} onClose={() => setSelectedTip(null)} />
    </AppShell>
  );
}
