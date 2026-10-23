"use client";
import { teamLabel, teamShort } from "@/lib/teams";
import { getRoundOutcome } from "@/lib/round-outcome";

import { cn } from "@/lib/utils";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Eye,
  Flag,
  LocateFixed,
  Navigation,
  ShieldCheck,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { agentImage, weaponImage, hasWeaponImage } from "@/data/assets";
import { TacticalMinimap } from "./tactical-minimap";
import { snapshotObjective } from "@/lib/inspector-projection";
import {
  getPlayer as defaultGetPlayer,
  match as defaultMatch,
  rounds as defaultRounds,
  players as defaultPlayers,
  timeLabel,
} from "@/data/mock-match";
import type { MatchEvent, MatchInfo, Player, Round } from "@/types/match";
const eventIcon = {
  kill: Crosshair,
  plant: Flag,
  defuse: ShieldCheck,
  detonate: Zap,
};
export function EventInspector({
  roundNumber,
  onRound,
  match = defaultMatch,
  rounds = defaultRounds,
  players = defaultPlayers,
}: {
  roundNumber: number;
  onRound: (round: number) => void;
  match?: MatchInfo;
  rounds?: Round[];
  players?: Player[];
}) {
  const getPlayer = (id: string) => players.find((player) => player.id === id)!;
  const round = rounds[roundNumber - 1];
  // Reset the event when changing round by keying this component in its parent.
  const isReal = match.dataMode === "official-json";
  const [eventIndex, setEventIndex] = useState(isReal ? 0 : 2);
  const [showNames, setShowNames] = useState(true);
  const [showDirections, setShowDirections] = useState(true);
  const event = round?.events[Math.min(eventIndex, round.events.length - 1)];
  if (!round || !event)
    return (
      <section className="rounded-lg border border-border bg-card p-5">
        <h2>Inspetor de rounds</h2>
        <RoundStrip
          match={match}
          rounds={rounds}
          active={roundNumber}
          onRound={onRound}
        />
        <p className="text-sm text-muted-foreground">
          Nenhum evento com snapshot neste round.
        </p>
      </section>
    );
  const objectiveLocation = snapshotObjective(round, event);
  return (
    <section
      className="panel border border-solid border-border rounded-[8px] overflow-hidden bg-card inspector-panel [&_>_.section-heading]:pb-[7px]"
      aria-labelledby="inspector-title"
    >
      <div className="section-heading flex justify-between items-center gap-[13px] p-[21px] [&_h2]:text-sm [&_h2]:font-medium [&_h3]:text-sm [&_h3]:font-medium [&_p]:text-muted-foreground [&_p]:text-[13px] [&_p]:leading-[1.6] [&_p]:mt-1.5 max-[650px]:py-[17px] max-[650px]:px-3.5 max-[650px]:[&_h2]:text-[14px]">
        <div>
          <h2 id="inspector-title">Inspetor de rounds</h2>
        </div>
        <Badge
          variant="outline"
          className="muted-badge text-[12px] font-normal text-muted-foreground border-border py-1 px-[7px]"
        >
          {isReal ? "Eventos do JSON" : "Eventos simulados"}
        </Badge>
      </div>
      <RoundStrip
        match={match}
        rounds={rounds}
        active={roundNumber}
        onRound={onRound}
      />
      <div className="round-summary flex justify-between items-center py-3 px-5 border-y border-solid border-border gap-2.5 bg-muted max-[650px]:items-start max-[650px]:flex-col max-[650px]:p-3 max-[650px]:gap-3">
        <div className="round-heading flex flex-wrap items-center gap-2 [&_button]:h-6.5 [&_button]:w-6.5 [&_button]:text-muted-foreground [&_>_strong]:text-sm [&_>_strong]:font-medium [&_>_strong]:whitespace-nowrap max-[650px]:gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Round anterior"
            disabled={roundNumber === 1}
            onClick={() => onRound(roundNumber - 1)}
          >
            <ChevronLeft size={17} />
          </Button>
          <strong>Round {roundNumber.toString().padStart(2, "0")}</strong>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Próximo round"
            disabled={roundNumber === rounds.length}
            onClick={() => onRound(roundNumber + 1)}
          >
            <ChevronRight size={17} />
          </Button>
          <span
            className={cn(
              "round-winner text-[12px] bg-team-friendly/10 text-team-friendly rounded-[3px] py-[5px] px-[7px] ml-2 [&.orbit]:text-primary [&.orbit]:bg-primary/10",
              round.winner,
            )}
          >
            {teamLabel(round.winner)} venceu
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <RoundOutcomeIcon round={round} />
            {getRoundOutcome(round)?.label ?? "Resultado não informado"}
          </span>
        </div>
        <span className="round-side text-[13px] text-muted-foreground [&_>_span]:text-muted-foreground [&_>_span]:my-0 [&_>_span]:mx-2 max-[650px]:text-[12px]">
          {teamLabel(round.attackTeam)} no ataque <span>·</span>
          {round.site ? `Plant no ${round.site}` : "Sem plant"}
        </span>
      </div>
      {isReal && round.result === "Detonate" && (
        <p className="border-b border-border bg-muted px-5 py-3 text-sm text-muted-foreground">
          Resultado: spike detonada. O JSON não registra o horário da detonação;
          a linha do tempo mostra apenas eventos com horário informado.
        </p>
      )}
      <div className="inspector-grid grid grid-cols-[minmax(0,_1fr)_280px] max-[1300px]:grid-cols-[minmax(0,_1fr)_250px] max-[650px]:grid-cols-1">
        <div className="map-section min-w-0">
          <div className="map-toolbar flex justify-between items-center py-2 px-[17px] bg-card [&_>_span]:flex [&_>_span]:items-center [&_>_span]:gap-[7px] [&_>_span]:text-[12px] [&_>_span]:tracking-[1px] [&_>_span]:text-muted-foreground [&_>_div]:flex [&_>_div]:gap-1 [&_button]:h-7 [&_button]:w-7 [&_button]:text-muted-foreground [&_button.active-tool]:text-foreground [&_button.active-tool]:bg-muted">
            <span>
              <LocateFixed size={13} /> {match.map.toUpperCase()} · MINIMAPA
            </span>
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Mostrar nomes no minimapa"
                    aria-pressed={showNames}
                    className={showNames ? "active-tool" : ""}
                    onClick={() => setShowNames(!showNames)}
                  >
                    <Users size={15} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mostrar nomes</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Mostrar direções no minimapa"
                    aria-pressed={showDirections}
                    className={showDirections ? "active-tool" : ""}
                    onClick={() => setShowDirections(!showDirections)}
                  >
                    <Navigation size={15} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mostrar orientação horizontal</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <TacticalMinimap
            mapName={match.mapId ?? match.map}
            objectiveLocation={objectiveLocation}
            getPlayer={getPlayer}
            event={event}
            showNames={showNames}
            showDirections={showDirections}
          />
          <div className="map-legend flex flex-wrap items-center justify-center gap-[17px] pt-3 px-2 pb-4.5 bg-background text-[12px] text-muted-foreground [&_>_span]:flex [&_>_span]:items-center [&_>_span]:gap-[5px] [&_i]:inline-block [&_i]:w-[5px] [&_i]:h-[5px] [&_i]:rounded-full max-[650px]:gap-2.5 max-[650px]:text-[12px]">
            <span>
              <i className="horizon-dot bg-team-friendly" />{" "}
              {teamLabel("horizon")}
            </span>
            <span>
              <i className="orbit-dot bg-primary" /> {teamLabel("orbit")}
            </span>
            <span>
              <Crosshair size={11} /> Local da morte
            </span>
            <span>
              <Eye size={11} /> Orientação
            </span>
          </div>
          <div className="snapshot-controls flex justify-between items-center gap-2 py-3 px-[17px] border-t border-solid border-border bg-muted [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-2 [&_strong]:text-[15px] [&_strong]:font-medium [&_strong]:tabular-nums [&_>_div:first-child_>_span]:text-muted-foreground [&_>_div:first-child_>_span]:text-[12px] [&_>_span]:text-muted-foreground [&_>_span]:text-[12px] [&_svg]:text-muted-foreground [&_button]:w-7.5 [&_button]:h-7 max-[1300px]:[&_>_div:first-child_>_span]:hidden">
            <div>
              <Timer size={16} />
              <strong>{timeLabel(event.timeMs)}</strong>
              <span>tempo do round</span>
            </div>
            <span>
              Evento {eventIndex + 1} de {round.events.length}
            </span>
            <div>
              <Button
                aria-label="Evento anterior"
                variant="outline"
                size="icon"
                disabled={eventIndex === 0}
                onClick={() => setEventIndex(eventIndex - 1)}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                aria-label="Próximo evento"
                variant="outline"
                size="icon"
                disabled={eventIndex === round.events.length - 1}
                onClick={() => setEventIndex(eventIndex + 1)}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
        <div className="event-sidebar border-l border-solid border-border bg-card py-4.5 px-[13px] max-[650px]:border-l-0 max-[650px]:border-t max-[650px]:border-solid max-[650px]:border-border">
          <div className="events-heading flex justify-between items-center pt-0 px-1.5 pb-[15px] [&_.eyebrow]:text-[12px] [&_>_span:last-child]:text-[12px] [&_>_span:last-child]:text-muted-foreground">
            <span className="eyebrow block text-[12px] text-muted-foreground tracking-[0.9px]">
              LINHA DO TEMPO
            </span>
            <span>{round.events.length} eventos</span>
          </div>
          <div
            className="event-list grid gap-[5px]"
            role="group"
            aria-label="Eventos do round"
          >
            {round.events.map((item, index) => (
              <EventItem
                getPlayer={getPlayer}
                key={item.id}
                event={item}
                selected={index === eventIndex}
                onSelect={() => setEventIndex(index)}
              />
            ))}
          </div>
          <div className="snapshot-note flex gap-2 pt-[15px] px-[5px] pb-0 mt-[15px] border-t border-solid border-border text-muted-foreground text-[12px] leading-[1.6] [&_svg]:shrink-0 [&_svg]:mt-0.5">
            <Eye size={15} />
            <p>
              {isReal
                ? "Posições e orientações do snapshot deste evento no JSON. Sem interpolação ou reaproveitamento de posições de outro evento. A vítima só tem posição de morte, sem orientação inferida."
                : "Minimapa do jogo; posições e orientações simuladas, sem validação de paredes. Cada evento é um snapshot, sem movimento interpolado."}
            </p>
          </div>
          <div className="alive-panel border-t border-solid border-border pt-4.5 px-[5px] pb-0 mt-[15px] [&_>_.eyebrow]:text-[12px] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-2.5 [&_>_div]:mt-3 [&_>_div_>_span]:text-[12px] [&_>_div_>_span]:min-w-[25px] [&_>_div_>_div]:flex [&_>_div_>_div]:gap-1 [&_img]:w-[25px] [&_img]:h-[25px] [&_img]:object-cover [&_img]:bg-muted [&_img]:rounded-[3px] [&_strong]:text-sm [&_strong]:text-muted-foreground [&_strong]:ml-auto">
            <span className="eyebrow block text-[12px] text-muted-foreground tracking-[0.9px]">
              {isReal ? "JOGADORES NESTE SNAPSHOT" : "VIVOS NESTE EVENTO"}
            </span>
            {(["horizon", "orbit"] as const).map((team) => (
              <div key={team}>
                <span
                  className={cn(
                    "team-text [&.horizon]:text-team-friendly [&.orbit]:text-primary",
                    team,
                  )}
                >
                  {teamShort(team)}
                </span>
                <div>
                  {event.positions
                    .filter((pos) => getPlayer(pos.playerId).team === team)
                    .map((pos) => (
                      <Image
                        key={pos.playerId}
                        src={agentImage(getPlayer(pos.playerId).agent)}
                        alt={getPlayer(pos.playerId).name}
                        width={25}
                        height={25}
                      />
                    ))}
                </div>
                <strong>
                  {
                    event.positions.filter(
                      (pos) => getPlayer(pos.playerId).team === team,
                    ).length
                  }
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
export function RoundStrip({
  active,
  onRound,
  match = defaultMatch,
  rounds = defaultRounds,
}: {
  active?: number;
  onRound: (round: number) => void;
  match?: MatchInfo;
  rounds?: Round[];
}) {
  return (
    <div
      className="round-strip flex gap-[5px] pt-3 px-5 pb-5 overflow-x-auto [scrollbar-width:thin] max-[650px]:px-3.5"
      aria-label="Selecionar round"
    >
      {rounds.map((round) => (
        <Tooltip key={round.number}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onRound(round.number)}
              aria-label={`Round ${round.number}, vitória de ${teamLabel(round.winner)}, ${getRoundOutcome(round)?.label ?? "resultado não informado"}`}
              aria-pressed={round.number === active}
              className={cn(
                "round-chip min-w-[27px] flex-1 max-w-12 h-11.5 flex flex-col items-center justify-center gap-[9px] border border-solid border-border rounded-[4px] bg-muted text-foreground/90 text-[12px] relative [&.orbit]:text-primary [&.orbit]:border-primary/30 [&.orbit]:bg-primary/5 [&:hover]:brightness-[1.3] [&.selected]:outline-1 [&.selected]:outline-primary [&.selected]:outline-offset-2 [&.orbit_.round-chip-line]:bg-primary [&.half-switch]:ml-[11px] [&.half-switch::before]:content-[''] [&.half-switch::before]:absolute [&.half-switch::before]:left-[-10px] [&.half-switch::before]:h-[35px] [&.half-switch::before]:w-px [&.half-switch::before]:bg-muted max-[650px]:min-w-7",
                round.winner,
                round.number === active && "selected",
                round.number === 13 && "half-switch",
              )}
            >
              <span>{round.number}</span>
              <RoundOutcomeIcon round={round} />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            R{round.number} · {teamLabel(round.winner)} ·{" "}
            {getRoundOutcome(round)?.label ?? "Resultado não informado"}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
function RoundOutcomeIcon({ round }: { round: Round }) {
  const outcome = getRoundOutcome(round);
  if (!outcome) return <span aria-hidden="true">—</span>;
  return (
    <span
      data-round-outcome={round.result ?? outcome.label}
      aria-hidden="true"
      className={cn(
        "inline-block size-3.5 shrink-0 bg-current mask-contain mask-center mask-no-repeat",
        outcome.mask,
        round.winner === "horizon" ? "text-team-friendly" : "text-primary",
      )}
    />
  );
}
function EventItem({
  event,
  selected,
  onSelect,
  getPlayer = defaultGetPlayer,
}: {
  event: MatchEvent;
  selected: boolean;
  onSelect: () => void;
  getPlayer?: typeof defaultGetPlayer;
}) {
  const Icon = eventIcon[event.type];
  const actor = getPlayer(event.actorId);
  const victim = event.victimId ? getPlayer(event.victimId) : null;
  return (
    <button
      className={cn(
        "event-item flex items-center gap-[9px] w-full text-left border border-solid border-transparent rounded-[5px] py-[11px] px-2 text-muted-foreground [&:hover]:bg-muted [&.selected]:border-primary/45 [&.selected]:bg-primary/5 [&.selected_.event-node]:text-primary [&.selected_.event-node]:border-primary/40 [&.selected_.event-node]:bg-primary/10 max-[650px]:py-[13px]",
        selected && "selected",
      )}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="event-node shrink-0 w-6.5 h-6.5 grid place-items-center rounded-[5px] border border-solid border-border bg-muted">
        <Icon size={13} />
      </span>
      <span className="event-content min-w-0 flex-1">
        <span className="event-time flex justify-between items-center text-[12px] text-muted-foreground tabular-nums [&_>_span]:text-[12px] [&_>_span]:tracking-[0.6px] [&_>_span]:text-muted-foreground max-[650px]:text-[12px] max-[650px]:[&_>_span]:text-[12px]">
          {timeLabel(event.timeMs)}
          <span>{event.type === "kill" ? "ELIMINAÇÃO" : "OBJETIVO"}</span>
        </span>
        <span className="event-actors flex flex-wrap items-center gap-1.5 mt-[5px] text-[13px] [&_img]:h-3 [&_img]:w-9 [&_img]:object-contain [&_img]:opacity-80 [&_b]:font-medium [&_>_span:last-child]:text-muted-foreground max-[650px]:text-sm">
          <b
            className={cn(
              "team-text [&.horizon]:text-team-friendly [&.orbit]:text-primary",
              actor.team,
            )}
          >
            {event.damageType === "Bomb" ? "Spike" : actor.name}
          </b>
          {event.weapon && hasWeaponImage(event.weapon) && (
            <Image
              src={weaponImage(event.weapon, true)}
              alt={event.weapon}
              width={44}
              height={16}
            />
          )}
          {event.weapon && !hasWeaponImage(event.weapon) && (
            <span className="text-[12px] text-muted-foreground">
              {event.weapon}
            </span>
          )}
          {victim && <span>{victim.name}</span>}
          {!victim && (
            <span>
              {event.type === "plant"
                ? "plantou"
                : event.type === "defuse"
                  ? "desarmou"
                  : "detonou"}
            </span>
          )}
        </span>
        <span className="event-label block text-muted-foreground text-[12px] mt-1.5 max-[650px]:text-[12px]">
          {event.label}
        </span>
      </span>
      {selected && <ChevronRight size={13} />}
    </button>
  );
}
