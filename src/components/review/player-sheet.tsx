"use client";
import { teamLabel } from "@/lib/teams";

import { cn } from "@/lib/utils";

import Image from "next/image";
import { ArrowUpRight, Crosshair } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createMockCoachTips, match as defaultMatch } from "@/data/mock-match";
import { getTacticalTip } from "@/data/tactical-catalog";
import { agentImage } from "@/data/assets";
import type { MatchInfo, Player } from "@/types/match";
export function PlayerSheet({
  player,
  onClose,
  onRound,
  match = defaultMatch,
}: {
  player: Player | null;
  onClose: () => void;
  onRound: (round: number) => void;
  match?: MatchInfo;
}) {
  const catalogTip = getTacticalTip("023");
  const exampleRound = (
    match.dataMode === "official-json" ? [] : createMockCoachTips(match)
  ).find((tip) => tip.id === "023")?.rounds[0];
  return (
    <Sheet open={!!player} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="player-sheet w-[min(440px,_95vw)]! max-w-110! overflow-y-auto p-[25px] [&_[data-slot=sheet-header]]:pt-0 [&_[data-slot=sheet-header]]:px-0 [&_[data-slot=sheet-header]]:pb-5.5">
        <SheetHeader>
          <SheetTitle>Review individual</SheetTitle>
          <SheetDescription>Estatísticas do jogador</SheetDescription>
        </SheetHeader>
        {player && (
          <div className="player-sheet-body grid gap-[23px] [&_.section-heading]:p-0">
            <div className="profile-heading flex items-center gap-[15px] pt-2.5 [&_.agent-portrait]:h-20 [&_.agent-portrait]:w-19 [&_h2]:text-2xl [&_h2]:font-[550] [&_h2]:my-1.5 [&_h2]:mx-0 [&_h2_>_span]:text-sm [&_h2_>_span]:font-normal [&_h2_>_span]:text-muted-foreground [&_h2_>_span]:ml-[5px] [&_p]:text-[13px] [&_p]:text-muted-foreground">
              <span
                className={cn(
                  "agent-portrait block shrink-0 w-[35px] h-[37px] bg-muted border border-solid border-border rounded-[4px] overflow-hidden [&.horizon]:border-team-friendly [&.orbit]:bg-muted [&.orbit]:border-primary [&_img]:object-cover [&_img]:w-full [&_img]:h-full",
                  player.team,
                )}
              >
                <Image
                  src={agentImage(player.agent)}
                  alt={player.agent}
                  width={88}
                  height={88}
                />
              </span>
              <div>
                <span className="eyebrow block text-[12px] text-muted-foreground tracking-[0.9px]">
                  {teamLabel(player.team)}
                </span>
                <h2>
                  {player.name}
                  <span>#{player.tag}</span>
                </h2>
                <p>
                  {player.agent} · {player.role}
                </p>
              </div>
            </div>
            <div className="profile-stats grid grid-cols-2 gap-px border border-solid border-border bg-border rounded-md overflow-hidden [&_>_div]:p-[17px] [&_>_div]:bg-muted [&_span]:block [&_span]:text-[12px] [&_span]:text-muted-foreground [&_strong]:block [&_strong]:text-[22px] [&_strong]:font-medium [&_strong]:text-foreground [&_strong]:mt-[7px]">
              {[
                ["ACS", player.acs],
                [
                  "K / D / A",
                  `${player.kills} / ${player.deaths} / ${player.assists}`,
                ],
                [
                  "HS nos acertos",
                  player.headshotPercent == null
                    ? "—"
                    : `${player.headshotPercent}%`,
                ],
                ["Habilidades usadas", player.abilityCasts],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="profile-callout flex items-center gap-3 p-3.5 bg-primary/5 border border-solid border-primary/30 rounded-md text-foreground/90 [&_strong]:text-sm [&_p]:text-[12px] [&_p]:leading-[1.6] [&_p]:text-muted-foreground [&_p]:mt-1">
              <Crosshair size={20} />
              <div>
                <strong>{player.firstKills} primeiras eliminações</strong>
                <p>Um recorte para investigar a contribuição de abertura.</p>
              </div>
            </div>
            <div className="section-heading flex justify-between items-center gap-[13px] p-[21px] [&_h2]:text-sm [&_h2]:font-medium [&_h3]:text-sm [&_h3]:font-medium [&_p]:text-muted-foreground [&_p]:text-[13px] [&_p]:leading-[1.6] [&_p]:mt-1.5 max-[650px]:py-[17px] max-[650px]:px-3.5 max-[650px]:[&_h2]:text-[14px]">
              <div>
                <h3>Dica para revisão</h3>
              </div>
            </div>
            <div className="profile-tip p-4.5 border border-solid border-border rounded-[7px] [&_h3]:text-base [&_h3]:font-medium [&_h3]:my-3 [&_h3]:mx-0 [&_p]:text-[13px] [&_p]:leading-[1.7] [&_p]:text-muted-foreground [&_p]:mb-[13px] [&_.muted]:text-muted-foreground [&_button]:mt-[7px] [&_button]:text-[12px]">
              <span className="evidence inline-flex items-center gap-[5px] py-1 px-1.5 rounded-[4px] text-[12px] inference text-primary bg-primary/10">
                I · Indício
              </span>
              <h3>{catalogTip.titulo}</h3>
              <p>{catalogTip.descricao}</p>
              <p className="muted">{catalogTip.inferencia.limites}</p>
              {exampleRound && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onRound(exampleRound);
                  }}
                >
                  Abrir exemplo no round {exampleRound}
                  <ArrowUpRight size={14} />
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
