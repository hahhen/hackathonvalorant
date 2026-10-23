"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { teamColor } from "@/lib/teams";
import {
  initialMinimapCamera,
  panMinimap,
  zoomMinimap,
} from "@/lib/minimap-camera";
import { agentImage } from "@/data/assets";
import { findMinimap } from "@/lib/minimap";
import {
  projectInspectorHeading,
  projectInspectorPoint,
} from "@/lib/inspector-projection";
import type { MatchEvent, Player } from "@/types/match";

export function TacticalMinimap({
  mapName,
  event,
  showNames,
  showDirections,
  getPlayer,
  objectiveLocation,
}: {
  mapName: string;
  event: MatchEvent;
  showNames: boolean;
  showDirections: boolean;
  getPlayer: (id: string) => Player;
  objectiveLocation?: { x: number; y: number };
}) {
  const id = useId().replace(/:/g, "");
  const [failedImage, setFailedImage] = useState<string>();
  const [camera, setCamera] = useState(initialMinimapCamera);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      setCamera((current) =>
        zoomMinimap(
          current,
          Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * 0.003),
          {
            x: (event.clientX - rect.left) / rect.width,
            y: (event.clientY - rect.top) / rect.height,
          },
        ),
      );
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => svg.removeEventListener("wheel", wheel);
  }, [mapName, failedImage]);
  const map = findMinimap(mapName);
  if (
    !map ||
    failedImage === map.image ||
    (event.coordinateSpace === "world" && !map.projectionSupported)
  ) {
    return (
      <div
        role="status"
        className="grid aspect-square place-content-center gap-2 bg-background p-8 text-center text-sm text-muted-foreground"
      >
        <p>Minimapa indisponível para {mapName}.</p>
        <p className="text-sm">
          Os eventos continuam disponíveis na linha do tempo.
        </p>
      </div>
    );
  }
  const project = (location: { x: number; y: number } | undefined) => {
    if (!location) return undefined;
    try {
      const point = projectInspectorPoint(location, event.coordinateSpace, map);
      return point.inBounds
        ? { x: point.x * 1024, y: point.y * 1024 }
        : undefined;
    } catch {
      return undefined;
    }
  };
  const positions = event.positions.map((position) => ({
    position,
    point: project(position),
  }));
  const victim = project(event.victimPosition);
  const victimPlayer = event.victimPosition
    ? getPlayer(event.victimPosition.playerId)
    : undefined;
  const victimColor = victimPlayer
    ? teamColor(victimPlayer.team)
    : "var(--muted-foreground)";
  const killer =
    event.type === "kill" &&
    event.actorId !== event.victimId &&
    event.damageType !== "Bomb"
      ? positions.find(({ position }) => position.playerId === event.actorId)
          ?.point
      : undefined;
  const killerPlayer = killer ? getPlayer(event.actorId) : undefined;
  const spike = project(event.objectiveLocation ?? objectiveLocation);
  const omitted =
    positions.filter(({ point }) => !point).length +
    Number(!!event.victimPosition && !victim) +
    Number(!!(event.objectiveLocation ?? objectiveLocation) && !spike);
  return (
    <div className="bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 text-[12px] text-muted-foreground">
        <span>Role para ampliar · arraste para mover</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Diminuir zoom"
            disabled={camera.zoom <= 1}
            onClick={() =>
              setCamera((current) => zoomMinimap(current, 1 / 1.4))
            }
          >
            <Minus />
          </Button>
          <output
            aria-label="Nível de zoom"
            className="min-w-10 text-center tabular-nums"
          >
            {Math.round(camera.zoom * 100)}%
          </output>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Aumentar zoom"
            disabled={camera.zoom >= 4}
            onClick={() => setCamera((current) => zoomMinimap(current, 1.4))}
          >
            <Plus />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Restaurar visão do mapa"
            onClick={() => setCamera(initialMinimapCamera)}
          >
            <RotateCcw />
          </Button>
        </div>
      </div>
      <svg
        ref={svgRef}
        className={cn(
          "tactical-minimap mx-auto block aspect-square w-full max-w-[720px] select-none font-sans",
          camera.zoom > 1 && "touch-none cursor-grab active:cursor-grabbing",
        )}
        viewBox={`${camera.x} ${camera.y} ${1024 / camera.zoom} ${1024 / camera.zoom}`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (
            [
              "+",
              "=",
              "-",
              "0",
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
            ].includes(event.key)
          ) {
            event.preventDefault();
            if (event.key === "0") setCamera(initialMinimapCamera);
            else if (["+", "=", "-"].includes(event.key))
              setCamera((current) =>
                zoomMinimap(current, event.key === "-" ? 1 / 1.4 : 1.4),
              );
            else
              setCamera((current) =>
                panMinimap(
                  current,
                  event.key === "ArrowLeft"
                    ? 0.1
                    : event.key === "ArrowRight"
                      ? -0.1
                      : 0,
                  event.key === "ArrowUp"
                    ? 0.1
                    : event.key === "ArrowDown"
                      ? -0.1
                      : 0,
                ),
              );
          }
        }}
        onPointerDown={(event) => {
          if (camera.zoom <= 1 || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
          };
        }}
        onPointerMove={(event) => {
          const previous = drag.current;
          if (!previous || previous.id !== event.pointerId) return;
          const rect = event.currentTarget.getBoundingClientRect();
          setCamera((current) =>
            panMinimap(
              current,
              (event.clientX - previous.x) / rect.width,
              (event.clientY - previous.y) / rect.height,
            ),
          );
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
          };
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        role="img"
        aria-label={`Minimapa de ${map.name}: ${event.label}. ${event.coordinateSpace === "world" ? "Coordenadas do jogo" : "Posições simuladas"}.`}
      >
        <defs>
          {victim && (
            <clipPath id={`${id}-victim`}>
              <circle r="19" />
            </clipPath>
          )}
          {positions.map(
            ({ position, point }) =>
              point && (
                <clipPath
                  id={`${id}-${position.playerId}`}
                  key={position.playerId}
                >
                  <circle cx={point.x} cy={point.y} r="19" />
                </clipPath>
              ),
          )}
        </defs>
        <image
          href={map.image}
          x="0"
          y="0"
          width="1024"
          height="1024"
          onError={() => setFailedImage(map.image)}
        />
        {spike && (
          <g data-marker="spike" transform={`translate(${spike.x} ${spike.y})`}>
            <title>Local da spike</title>
            <rect
              x="-13"
              y="-13"
              width="26"
              height="26"
              rx="3"
              transform="rotate(45)"
              fill="var(--foreground)"
              stroke="var(--background)"
              strokeWidth="3"
            />
            <text
              textAnchor="middle"
              y="6"
              fontSize="17"
              fontWeight="bold"
              fill="var(--background)"
            >
              S
            </text>
          </g>
        )}
        {positions.map(({ position, point }) => {
          if (!point) return null;
          const player = getPlayer(position.playerId);
          const color = teamColor(player.team);
          const { x, y } = point;
          const heading = projectInspectorHeading(
            position.viewRadians,
            event.coordinateSpace,
            map,
          );
          return (
            <g key={position.playerId} data-marker="player">
              <title>{`${player.name} · ${player.agent}`}</title>
              {showDirections && heading !== undefined && (
                <g data-marker="direction">
                  <path
                    d={`M${x} ${y} L${x + Math.cos(heading - 0.28) * 66} ${y + Math.sin(heading - 0.28) * 66} L${x + Math.cos(heading + 0.28) * 66} ${y + Math.sin(heading + 0.28) * 66} Z`}
                    fill={color}
                    opacity="0.25"
                  />
                </g>
              )}
              <circle
                cx={x}
                cy={y}
                r="22"
                fill="var(--muted)"
                stroke={color}
                strokeWidth="3"
              />
              <image
                href={agentImage(player.agent)}
                x={x - 19}
                y={y - 19}
                width="38"
                height="38"
                clipPath={`url(#${id}-${position.playerId})`}
              />
              {showNames && (
                <g data-marker="name">
                  <rect
                    x={x - 40}
                    y={y + 27}
                    width="80"
                    height="24"
                    rx="4"
                    fill="var(--background)"
                    opacity=".95"
                  />
                  <text
                    x={x}
                    y={y + 44}
                    textAnchor="middle"
                    fontSize="15"
                    fill={color}
                  >
                    {player.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {victim && victimPlayer && (
          <g
            data-marker="victim"
            transform={`translate(${victim.x} ${victim.y})`}
          >
            <title>{`${victimPlayer.name} · ${victimPlayer.agent} · morto neste evento`}</title>
            <circle
              r="23"
              fill="var(--card)"
              stroke={victimColor}
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <image
              data-marker="victim-portrait"
              href={agentImage(victimPlayer.agent)}
              x="-19"
              y="-19"
              width="38"
              height="38"
              clipPath={`url(#${id}-victim)`}
              opacity=".3"
            />
            <path
              d="m-8-8 16 16m0-16L-8 8"
              stroke="var(--background)"
              strokeWidth="6"
            />
            <path
              data-marker="death-cross"
              d="m-8-8 16 16m0-16L-8 8"
              stroke={victimColor}
              strokeWidth="3"
            />
            {showNames && (
              <g data-marker="victim-name">
                <rect
                  x={-Math.max(80, victimPlayer.name.length * 9 + 16) / 2}
                  y="27"
                  width={Math.max(80, victimPlayer.name.length * 9 + 16)}
                  height="24"
                  rx="4"
                  fill="var(--background)"
                  opacity=".95"
                />
                <text
                  y="44"
                  textAnchor="middle"
                  fontSize="15"
                  fill={victimColor}
                >
                  {victimPlayer.name}
                </text>
              </g>
            )}
          </g>
        )}
        {killer && victim && killerPlayer && (
          <line
            data-marker="kill-line"
            x1={killer.x}
            y1={killer.y}
            x2={victim.x}
            y2={victim.y}
            stroke="var(--event-elimination)"
            strokeWidth="2.5"
            strokeDasharray="2 6"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity=".8"
          >
            <title>
              Ligação entre autor e vítima neste evento; não representa
              trajetória ou visibilidade.
            </title>
          </line>
        )}
      </svg>
      {omitted > 0 && (
        <p
          role="status"
          className="px-4 pb-3 text-center text-sm text-muted-foreground"
        >
          {omitted} posição(ões) inválida(s) ou fora da imagem; não exibida(s).
        </p>
      )}
    </div>
  );
}
