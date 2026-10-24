"use client";
import { teamLabel } from "@/lib/teams";

import { cn } from "@/lib/utils";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Clock3, MapPin, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agentImage } from "@/data/assets";
import { officialMatches } from "@/data/official-matches";
import type { MatchInfo, TeamId } from "@/types/match";
export function MatchLibrary() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("all");
  const matches = officialMatches;
  const filtered = matches.filter(
    (match) =>
      `${match.map} ${teamLabel("horizon")} ${teamLabel("orbit")} ${match.teams.horizon.name} ${match.teams.orbit.name}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (result === "all" ||
        match.teams.horizon.score > match.teams.orbit.score ===
          (result === "win")),
  );
  return (
    <AppShell>
      <div className="page-heading flex justify-between items-center gap-5 mb-7 min-h-[49px] [&_h1]:text-3xl [&_h1]:font-[550] [&_h1]:tracking-[-0.95px] [&_h1]:leading-[1.3] [&_p]:text-muted-foreground [&_p]:text-[14px] [&_p]:leading-[1.6] [&_p]:mt-[7px] [&_>_button]:text-sm [&_>_button]:bg-card max-[650px]:mb-5.5 max-[650px]:gap-3 max-[650px]:[&_h1]:text-[27px] max-[650px]:[&_p]:text-sm max-[650px]:[&_p]:max-w-[245px]">
        <div>
          <h1>Partidas</h1>
          <p>FURIA UTFPR · Classificatória 3 e Fase de Grupos</p>
        </div>
        <span className="match-count self-center text-sm text-muted-foreground max-[650px]:text-[12px] max-[650px]:whitespace-nowrap">
          {matches.length} partidas
        </span>
      </div>
      <div className="library-toolbar flex items-center justify-between gap-4 mt-0 mx-0 mb-6 max-[650px]:flex-wrap max-[650px]:gap-4 max-[650px]:mb-5 max-[650px]:[&_.search-field]:w-full">
        <div className="search-field relative w-72.5 [&_>_svg]:absolute [&_>_svg]:left-3 [&_>_svg]:top-[50%] [&_>_svg]:-translate-y-1/2 [&_>_svg]:text-muted-foreground [&_>_svg]:z-1 [&_input]:h-9.5 [&_input]:text-sm [&_input]:pl-9 [&_input]:bg-card [&_input]:border-border [&_input::placeholder]:text-muted-foreground">
          <Search size={16} />
          <Input
            aria-label="Buscar partidas"
            placeholder="Buscar mapa ou equipe"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div
          className="result-filters flex gap-[5px] [&_button]:h-8.5 [&_button]:text-sm [&_button]:text-muted-foreground [&_button[aria-pressed=true]]:bg-primary/10 [&_button[aria-pressed=true]]:text-primary max-[650px]:w-full max-[650px]:[&_button]:flex-1"
          role="group"
          aria-label="Filtrar por resultado"
        >
          {[
            ["all", "Todas"],
            ["win", "Vitórias"],
            ["loss", "Derrotas"],
          ].map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={id === result ? "secondary" : "ghost"}
              aria-pressed={id === result}
              onClick={() => setResult(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className="match-grid grid grid-cols-3 gap-5.5 max-[1300px]:grid-cols-2 max-[650px]:grid-cols-1 max-[650px]:gap-5">
        {filtered.map((match, index) => (
          <MatchCard key={match.id} match={match} priority={index < 3} />
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state py-[45px]! px-5! text-center text-muted-foreground text-sm [&_button]:block [&_button]:mt-2 [&_button]:mx-auto [&_button]:mb-0 [&_button]:text-[13px]">
          Nenhuma partida encontrada.
          <Button
            variant="link"
            onClick={() => {
              setQuery("");
              setResult("all");
            }}
          >
            Limpar filtros
          </Button>
        </div>
      )}
    </AppShell>
  );
}
function MatchCard({
  match,
  priority,
}: {
  match: MatchInfo;
  priority: boolean;
}) {
  const won = match.teams.horizon.score > match.teams.orbit.score;
  return (
    <Link
      href={`/partidas/${match.id}`}
      className="match-card min-w-0 border border-solid border-border rounded-[9px] overflow-hidden bg-card transition-all duration-200 motion-reduce:transition-none block outline-offset-4 [&:hover]:border-primary/55 [&:hover]:-translate-y-[3px] [&:hover]:shadow-xl [&:hover]:shadow-background/25 [&:hover_.match-card-cover_>_img]:scale-[1.035] [&:hover_.match-card-footer]:text-foreground"
      aria-label={`Abrir partida em ${match.map}, ${won ? "vitória" : "derrota"} por ${match.teams.horizon.score} a ${match.teams.orbit.score}`}
    >
      <div className="match-card-cover h-[177px] relative overflow-hidden bg-muted [&_>_img]:object-cover [&_>_img]:transition-all [&_>_img]:duration-200 [&_>_img]:motion-reduce:transition-none min-[1700px]:h-52.5 max-[650px]:h-47.5">
        <Image
          src={`/assets/maps/${match.map.toLowerCase()}.png`}
          alt={match.map}
          fill
          sizes="(max-width: 650px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={priority}
        />
        <div className="match-card-shade absolute inset-0 bg-linear-to-b from-background/30 via-background/10 to-background/95" />
        <div className="match-card-top absolute inset-[15px_15px_auto] flex items-center justify-between gap-[7px]">
          <span className="match-type text-foreground/90 text-[12px] tracking-normal font-semibold">
            Partida personalizada
          </span>
          <span
            className={cn(
              "result-badge inline-flex items-center gap-1 py-[5px] px-2 rounded-[4px] text-[12px] font-semibold bg-card/80 border border-solid border-foreground/20 backdrop-blur-sm text-foreground [&.loss]:text-primary [&.loss]:border-primary/45 [&.loss]:bg-background/90",
              won ? "win" : "loss",
            )}
          >
            {won && <Check size={12} />}
            {won ? "Vitória" : "Derrota"}
          </span>
        </div>
        <div className="match-card-title absolute inset-[auto_18px_13px] flex items-end justify-between gap-3 [&_h2]:text-[26px] [&_h2]:font-semibold [&_h2]:tracking-[-0.7px] [&_h2]:text-shadow-sm [&_h2]:text-shadow-background/50 max-[650px]:[&_h2]:text-[27px]">
          <h2>{match.map}</h2>
          <div className="card-score flex items-baseline gap-[7px] tabular-nums [&_strong]:text-[35px] [&_strong]:font-medium [&_strong]:leading-[1.2] [&_strong]:tracking-[-1.5px] [&_strong]:text-muted-foreground [&_.winner-score]:text-foreground [&_>_span]:text-[23px] [&_>_span]:text-muted-foreground [&_>_span]:font-light">
            <strong className={won ? "winner-score" : ""}>
              {match.teams.horizon.score}
            </strong>
            <span>:</span>
            <strong className={!won ? "winner-score" : ""}>
              {match.teams.orbit.score}
            </strong>
          </div>
        </div>
      </div>
      <div className="match-card-body pt-[13px] px-4.5 pb-0 max-[650px]:px-4.5">
        <div className="match-card-meta flex items-center justify-between gap-2 text-[12px] text-muted-foreground [&_>_span:last-child]:flex [&_>_span:last-child]:items-center [&_>_span:last-child]:gap-[5px] max-[650px]:text-[13px]">
          <span>{match.date}</span>
          <span>
            <Clock3 size={11} />
            {match.duration}
          </span>
        </div>
        <div className="card-lineups grid gap-2.5 py-[17px] px-0">
          {(["horizon", "orbit"] as TeamId[]).map((team) => (
            <div
              className="card-lineup flex items-center justify-between gap-2.5"
              key={team}
            >
              <span className="lineup-team flex items-center gap-2 text-[13px] font-medium text-foreground/90 max-[650px]:text-sm">
                {teamLabel(team)}
              </span>
              <div className="lineup-agents flex gap-1 [&_>_span]:block [&_>_span]:overflow-hidden [&_>_span]:w-[27px] [&_>_span]:h-7 [&_>_span]:bg-muted [&_>_span]:rounded-[4px] [&_>_span]:border [&_>_span]:border-solid [&_>_span]:border-border [&_img]:block [&_img]:w-full [&_img]:h-full [&_img]:object-cover min-[1700px]:[&_>_span]:w-[31px] min-[1700px]:[&_>_span]:h-8 max-[650px]:[&_>_span]:w-[29px] max-[650px]:[&_>_span]:h-7.5">
                {match.agents[team].map((agent, index) => (
                  <span key={`${agent}-${index}`} title={agent}>
                    <Image
                      src={agentImage(agent)}
                      alt={agent}
                      width={30}
                      height={30}
                    />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="match-card-footer border-t border-solid border-border flex items-center justify-between py-3 px-0 text-[13px] font-medium text-muted-foreground [&_svg]:text-primary max-[650px]:text-sm max-[650px]:py-3.5">
          <span>Ver análise</span>
          <ArrowUpRight size={16} />
        </div>
      </div>
    </Link>
  );
}
