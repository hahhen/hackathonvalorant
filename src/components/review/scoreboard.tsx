"use client";
import { teamLabel } from "@/lib/teams";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { agentImage } from "@/data/assets";
import {
  match as defaultMatch,
  players as defaultPlayers,
} from "@/data/mock-match";
import {
  scoreboardColumns,
  scoreboardValue,
  formatScoreboardValue,
  compareScoreboardPlayers,
  type ScoreboardKey,
} from "@/lib/scoreboard";
import type { MatchInfo, Player, TeamId } from "@/types/match";

export function Scoreboard({
  onPlayer,
  match = defaultMatch,
  players = defaultPlayers,
}: {
  onPlayer: (player: Player) => void;
  match?: MatchInfo;
  players?: Player[];
}) {
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("all");
  const [sort, setSort] = useState<ScoreboardKey>("acs");
  const [ascending, setAscending] = useState(false);
  const filtered = useMemo(
    () =>
      players
        .filter(
          (player) =>
            (team === "all" || player.team === team) &&
            `${player.name} ${player.agent}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) => compareScoreboardPlayers(a, b, sort, ascending)),
    [query, team, sort, ascending, players],
  );
  function changeSort(key: ScoreboardKey) {
    setAscending(sort === key ? !ascending : false);
    setSort(key);
  }
  return (
    <section
      className="scoreboard-panel min-w-0 overflow-hidden rounded-lg border border-border bg-card"
      aria-labelledby="scoreboard-title"
    >
      <div className="flex items-center justify-between gap-3 p-5 max-[650px]:p-3.5">
        <h2 id="scoreboard-title" className="text-sm font-medium">
          Scoreboard
        </h2>
        <Badge
          variant="outline"
          className="text-[12px] font-normal text-muted-foreground"
        >
          {match.teams.horizon.score + match.teams.orbit.score} rounds
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-3 px-5 pb-4 max-[650px]:px-3.5">
        <div className="relative min-w-0 max-w-64 flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="h-9 bg-card pl-9 text-sm"
            aria-label="Buscar jogador ou agente"
            placeholder="Buscar jogador ou agente..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Select value={team} onValueChange={setTeam}>
          <SelectTrigger
            aria-label="Filtrar equipe"
            className="h-9! min-w-32 bg-muted text-[13px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Ambas as equipes</SelectItem>
            <SelectItem value="horizon">{teamLabel("horizon")}</SelectItem>
            <SelectItem value="orbit">{teamLabel("orbit")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Table className="scoreboard-table w-[752px] min-w-full table-fixed text-sm [&_th]:h-10 [&_th]:bg-background [&_th]:px-1 [&_th]:text-[12px] [&_th]:text-muted-foreground [&_th:last-child]:pr-8 [&_td]:px-1 [&_td]:py-3 [&_td:last-child]:pr-8 max-[650px]:w-[688px]">
        <colgroup>
          <col className="w-[196px] max-[650px]:w-[132px]" />
          {scoreboardColumns.map(({ key }) => (
            <col
              key={key}
              className={key === "openingDelta" ? "w-18" : "w-11"}
            />
          ))}
        </colgroup>
        <caption className="sr-only">
          Estatísticas dos jogadores. ADR e HS% são calculados pelos danos
          registrados. KAST usa janela de troca de 3 segundos. Valores
          indisponíveis aparecem como traço.
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 border-r border-border pl-5! max-[650px]:pl-3!">
              Jogador
            </TableHead>
            {scoreboardColumns.map(({ key, label, description }) => (
              <TableHead
                key={key}
                className="text-right tabular-nums whitespace-nowrap"
                aria-sort={
                  sort === key
                    ? ascending
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => changeSort(key)}
                      aria-label={`Ordenar por ${label}`}
                      className={cn(
                        "inline-flex w-full items-center justify-end gap-1 rounded-sm py-2 outline-offset-2 hover:text-foreground",
                        sort === key && "text-foreground",
                      )}
                    >
                      {label}
                      {sort === key && (
                        <ArrowDown
                          size={11}
                          className={ascending ? "rotate-180" : ""}
                        />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-72">
                    {description}
                  </TooltipContent>
                </Tooltip>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(["horizon", "orbit"] as TeamId[]).map((id) => {
            const members = filtered.filter((player) => player.team === id);
            if (!members.length) return null;
            return (
              <TeamRows
                key={id}
                team={id}
                match={match}
                members={members}
                onPlayer={onPlayer}
              />
            );
          })}
          {!filtered.length && (
            <TableRow>
              <TableCell
                colSpan={scoreboardColumns.length + 1}
                className="py-10! text-center text-muted-foreground"
              >
                Nenhum jogador encontrado. Tente outro nome ou agente.
                <Button
                  variant="link"
                  className="mx-auto mt-2 block text-sm"
                  onClick={() => {
                    setQuery("");
                    setTeam("all");
                  }}
                >
                  Limpar filtros
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex flex-wrap justify-between gap-2 border-t border-border px-5 py-3 text-[12px] leading-relaxed text-muted-foreground">
        <span>
          Clique no jogador para abrir o perfil. Role a tabela para ver todas as
          colunas.
        </span>
        <span>
          HS% por acertos · KAST: janela de troca de 3 s · — = indisponível
        </span>
      </div>
    </section>
  );
}

function TeamRows({
  team,
  match,
  members,
  onPlayer,
}: {
  team: TeamId;
  match: MatchInfo;
  members: Player[];
  onPlayer: (player: Player) => void;
}) {
  const winner =
    match.teams[team].score >
    match.teams[team === "horizon" ? "orbit" : "horizon"].score;
  return (
    <>
      <TableRow
        className={cn(
          "border-border bg-muted hover:bg-muted",
          team === "orbit" && "bg-primary/5 hover:bg-primary/5",
        )}
      >
        <TableCell colSpan={scoreboardColumns.length + 1}>
          <div className="flex items-center gap-2 py-0.5 text-[13px]">
            <strong
              className={cn(
                "font-medium",
                team === "orbit" ? "text-primary" : "text-team-friendly",
              )}
            >
              {teamLabel(team)}
            </strong>
            <span className="text-[12px] tracking-wide text-muted-foreground">
              {winner ? "VITÓRIA" : "DERROTA"}
            </span>
          </div>
        </TableCell>
      </TableRow>
      {members.map((player) => (
        <TableRow
          key={player.id}
          className="group border-border hover:bg-muted"
        >
          <TableCell className="sticky left-0 z-10 overflow-hidden border-r border-border bg-card pl-5! group-hover:bg-muted max-[650px]:pl-3!">
            <button
              onClick={() => onPlayer(player)}
              aria-label={`Abrir perfil de ${player.name}`}
              className="flex w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-sm text-left outline-offset-4 max-[650px]:gap-2"
              title={`${player.name}#${player.tag} · ${player.agent}`}
            >
              <Image
                src={agentImage(player.agent)}
                alt={player.agent}
                width={34}
                height={36}
                className="h-9 w-8.5 shrink-0 rounded bg-muted object-cover max-[650px]:size-7"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {player.name}
                </span>
                <span className="mt-1 block truncate text-[12px] text-muted-foreground">
                  {player.agent}
                </span>
              </span>
            </button>
          </TableCell>
          {scoreboardColumns.map(({ key }) => (
            <TableCell
              key={key}
              className={cn(
                "text-right text-[14px] whitespace-nowrap tabular-nums text-foreground",
                key === "acs" && "font-medium",
                (key === "delta" || key === "openingDelta") &&
                  (scoreboardValue(player, key) ?? 0) > 0 &&
                  "text-success",
                (key === "delta" || key === "openingDelta") &&
                  (scoreboardValue(player, key) ?? 0) < 0 &&
                  "text-primary",
              )}
            >
              {formatScoreboardValue(player, key)}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
