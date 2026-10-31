"use client";
import { formatEventLabel } from "@/i18n/translate";
import { useI18n } from "@/i18n/provider";
import { teamLabel, teamShort } from "@/lib/teams";

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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { agentImage, weaponImage, hasWeaponImage } from "@/data/assets";
import { resolveAgentAbility } from "@/data/agent-abilities";
import { TacticalMinimap } from "./tactical-minimap";
import { RoundLoadouts } from "./round-loadouts";
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
  match = defaultMatch,
  rounds = defaultRounds,
  players = defaultPlayers,
}: {
  roundNumber: number;
  match?: MatchInfo;
  rounds?: Round[];
  players?: Player[];
}) {
  const { t, locale } = useI18n();
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
        <h2>{t("Replay 2D")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("Nenhum evento com snapshot neste round.")}</p>
      </section>
    );
  const objectiveLocation = snapshotObjective(round, event);
  return (
    <section
      className="panel border border-solid border-border rounded-[8px] overflow-hidden bg-card inspector-panel [&_>_.section-heading]:pb-[7px]"
      aria-label={t("Replay 2D")}
    >
      <h2 className="sr-only">{t("Replay 2D")}</h2>
      {isReal && round.result === "Detonate" && (
        <p className="border-b border-border bg-muted px-5 py-3 text-sm text-muted-foreground">
          {t("Resultado: spike detonada. O JSON não registra o horário da detonação; a linha do tempo mostra apenas eventos com horário informado.")}</p>
      )}
      <div className="inspector-grid grid grid-cols-[minmax(0,_1fr)_280px] max-[1300px]:grid-cols-[minmax(0,_1fr)_250px] max-[650px]:grid-cols-1">
        <div className="map-section min-w-0">
          <RoundLoadouts round={round} players={players} />
          <div className="map-toolbar flex justify-between items-center py-2 px-[17px] bg-card [&_>_span]:flex [&_>_span]:items-center [&_>_span]:gap-[7px] [&_>_span]:text-[12px] [&_>_span]:tracking-[1px] [&_>_span]:text-muted-foreground [&_>_div]:flex [&_>_div]:gap-1 [&_button]:h-7 [&_button]:w-7 [&_button]:text-muted-foreground [&_button.active-tool]:text-foreground [&_button.active-tool]:bg-muted">
            <span>
              <LocateFixed size={13} /> {t(match.map.toUpperCase())}{t(" · MINIMAPA")}</span>
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("Mostrar nomes no minimapa")}
                    aria-pressed={showNames}
                    className={showNames ? "active-tool" : ""}
                    onClick={() => setShowNames(!showNames)}
                  >
                    <Users size={15} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("Mostrar nomes")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("Mostrar direções no minimapa")}
                    aria-pressed={showDirections}
                    className={showDirections ? "active-tool" : ""}
                    onClick={() => setShowDirections(!showDirections)}
                  >
                    <Navigation size={15} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("Mostrar orientação horizontal")}</TooltipContent>
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
              <i className="horizon-dot bg-team-friendly" />{t(" ")}
              {t(teamLabel("horizon"))}
            </span>
            <span>
              <i className="orbit-dot bg-primary" /> {t(teamLabel("orbit"))}
            </span>
            <span>
              <Crosshair size={11} /> {t(" Local da morte")}</span>
            <span>
              <Eye size={11} /> {t(" Orientação")}</span>
          </div>
          <div className="snapshot-controls flex justify-between items-center gap-2 py-3 px-[17px] border-t border-solid border-border bg-muted [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-2 [&_strong]:text-[15px] [&_strong]:font-medium [&_strong]:tabular-nums [&_>_div:first-child_>_span]:text-muted-foreground [&_>_div:first-child_>_span]:text-[12px] [&_>_span]:text-muted-foreground [&_>_span]:text-[12px] [&_svg]:text-muted-foreground [&_button]:w-7.5 [&_button]:h-7 max-[1300px]:[&_>_div:first-child_>_span]:hidden">
            <div>
              <Timer size={16} />
              <strong>{t(timeLabel(event.timeMs))}</strong>
              <span>{t("tempo do round")}</span>
            </div>
            <span>
              {t("Evento ")}{eventIndex + 1}{t(" de ")}{round.events.length}
            </span>
            <div>
              <Button
                aria-label={t("Evento anterior")}
                variant="outline"
                size="icon"
                disabled={eventIndex === 0}
                onClick={() => setEventIndex(eventIndex - 1)}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                aria-label={t("Próximo evento")}
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
              {t("LINHA DO TEMPO")}</span>
            <span>{round.events.length}{t(" eventos")}</span>
          </div>
          <div
            className="event-list grid gap-[5px]"
            role="group"
            aria-label={t("Eventos do round")}
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
          <div className="alive-panel border-t border-solid border-border pt-4.5 px-[5px] pb-0 mt-[15px] [&_>_.eyebrow]:text-[12px] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-2.5 [&_>_div]:mt-3 [&_>_div_>_span]:text-[12px] [&_>_div_>_span]:min-w-[25px] [&_>_div_>_div]:flex [&_>_div_>_div]:gap-1 [&_img]:w-[25px] [&_img]:h-[25px] [&_img]:object-cover [&_img]:bg-muted [&_img]:rounded-[3px] [&_strong]:text-sm [&_strong]:text-muted-foreground [&_strong]:ml-auto">
            <span className="eyebrow block text-[12px] text-muted-foreground tracking-[0.9px]">
              {t(isReal ? "JOGADORES NESTE SNAPSHOT" : "VIVOS NESTE EVENTO")}
            </span>
            {(["horizon", "orbit"] as const).map((team) => (
              <div key={team}>
                <span
                  className={cn(
                    "team-text [&.horizon]:text-team-friendly [&.orbit]:text-primary",
                    team,
                  )}
                >
                  {t(teamShort(team))}
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
  const { t, locale } = useI18n();
  const Icon = eventIcon[event.type];
  const actor = getPlayer(event.actorId);
  const ability =
    event.damageType === "Ability"
      ? (event.ability ??
        resolveAgentAbility(actor.agent, event.damageItem ?? ""))
      : undefined;
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
          {t(timeLabel(event.timeMs))}
          <span>{t(event.type === "kill" ? "ELIMINAÇÃO" : "OBJETIVO")}</span>
        </span>
        <span className="event-actors flex flex-wrap items-center gap-1.5 mt-[5px] text-[13px] [&_img]:object-contain [&_img]:opacity-80 [&_b]:font-medium [&_>_span:last-child]:text-muted-foreground max-[650px]:text-sm">
          <b
            className={cn(
              "team-text [&.horizon]:text-team-friendly [&.orbit]:text-primary",
              actor.team,
            )}
          >
            {event.damageType === "Bomb" ? "Spike" : actor.name}
          </b>
          {ability?.sprite && (
            <Image
              src={ability.sprite}
              alt={locale === "en" ? ability.name : ability.namePtBr}
              title={locale === "en" ? ability.name : ability.namePtBr}
              width={20}
              height={20}
              className="size-5 shrink-0"
            />
          )}
          {ability && !ability.sprite && (
            <span className="text-[12px] text-muted-foreground">
              {locale === "en" ? ability.name : ability.namePtBr}
            </span>
          )}
          {event.weapon && hasWeaponImage(event.weapon) && (
            <Image
              src={weaponImage(event.weapon, true)}
              alt={event.weapon}
              width={44}
              height={16}
              className="h-3 w-9"
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
              {t(event.type === "plant"
                ? "plantou"
                : event.type === "defuse"
                  ? "desarmou"
                  : "detonou")}
            </span>
          )}
        </span>
        <span className="event-label block text-muted-foreground text-[12px] mt-1.5 max-[650px]:text-[12px]">
          {formatEventLabel(event.label, locale)}
        </span>
      </span>
      {selected && <ChevronRight size={13} />}
    </button>
  );
}
