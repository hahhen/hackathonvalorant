"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { Info, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { agentImage } from "@/data/assets";
import { mockRoundTips, type MockRoundTip } from "@/data/mock-round-tips";
import { getTacticalTip, type TacticalTip } from "@/data/tactical-catalog";
import { teamLabel } from "@/lib/teams";
import { cn } from "@/lib/utils";
import { tipCategoryTheme } from "@/lib/tip-category-theme";
import type { MatchInfo, Player, Round } from "@/types/match";
import { InferenceDialog, TipCategoryBadge } from "./tactical-tip";

export function RoundCoachingTips({
  match,
  round,
  players,
}: {
  match: MatchInfo;
  round: Round;
  players: Player[];
}) {
  const selectorId = useId();
  const [playerId, setPlayerId] = useState(
    () =>
      players.find((player) => player.team === "horizon")?.id ?? players[0]?.id,
  );
  const [detail, setDetail] = useState<TacticalTip | null>(null);
  const selected =
    players.find((player) => player.id === playerId) ?? players[0];
  const collective = mockRoundTips(match.id, round.number, "collective");
  const individual = mockRoundTips(
    match.id,
    round.number,
    "individual",
    selected?.id,
  );
  const roundLabel = `Round ${String(round.number).padStart(2, "0")}`;
  return (
    <section
      data-tip-mode="mock"
      className="mb-5 rounded-lg border border-border bg-card p-5 max-[650px]:p-3.5"
      aria-label={`Dicas do round ${round.number}`}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-medium">
          Dicas do {roundLabel.toLowerCase()}
        </h2>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-5 max-[800px]:grid-cols-1">
        <section
          aria-label={`Dicas coletivas do round ${round.number}`}
          className="min-w-0"
        >
          <div className="mb-4 flex min-h-16 items-center gap-2">
            <Users className="size-4 text-team-friendly" />
            <h3 className="text-sm font-medium">Dicas coletivas · Meu time</h3>
          </div>
          <div className="grid gap-3">
            {collective.map((finding) => (
              <RoundTip key={finding.id} finding={finding} onInfo={setDetail} />
            ))}
          </div>
        </section>
        <section
          aria-label={`Dicas individuais do round ${round.number}`}
          className="min-w-0"
        >
          <div className="mb-4 flex min-h-16 items-center justify-between gap-3 max-[500px]:flex-wrap">
            <h3 className="flex shrink-0 items-center gap-2 text-sm font-medium">
              <UserRound className="size-4 text-muted-foreground" />
              Dicas individuais
            </h3>
            <label htmlFor={selectorId} className="sr-only">
              Jogador para dicas individuais
            </label>
            <Select value={selected?.id} onValueChange={setPlayerId}>
              <SelectTrigger
                id={selectorId}
                data-coaching-player={selected?.id}
                className="h-16! w-full min-w-0 max-w-80 bg-muted text-left text-sm max-[500px]:max-w-none"
              >
                <SelectValue
                  placeholder="Selecionar jogador"
                  className="min-w-0 flex-1"
                >
                  {selected ? (
                    <span className="flex min-w-0 items-center gap-3">
                      <Image
                        src={agentImage(selected.agent)}
                        alt=""
                        width={36}
                        height={36}
                        className="size-9 shrink-0 rounded bg-card object-cover"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">
                          {selected.name}#{selected.tag}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {selected.agent} · {teamLabel(selected.team)}
                        </span>
                      </span>
                    </span>
                  ) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                {(["horizon", "orbit"] as const).map((team) => (
                  <SelectGroup key={team}>
                    <SelectLabel>{teamLabel(team)}</SelectLabel>
                    {players
                      .filter((player) => player.team === team)
                      .map((player) => (
                        <SelectItem
                          key={player.id}
                          value={player.id}
                          textValue={`${player.name} ${player.tag} ${player.agent}`}
                        >
                          <Image
                            src={agentImage(player.agent)}
                            alt=""
                            width={32}
                            height={32}
                            className="size-8 shrink-0 rounded bg-muted object-cover"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {player.name}#{player.tag}
                            </span>
                            <span className="block text-sm text-muted-foreground">
                              {player.agent}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selected ? (
            <>
              <div className="grid gap-3">
                {individual.map((finding) => (
                  <RoundTip
                    key={finding.id}
                    finding={finding}
                    onInfo={setDetail}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum jogador disponível neste round.
            </p>
          )}
        </section>
      </div>
      <InferenceDialog tip={detail} onClose={() => setDetail(null)} />
    </section>
  );
}

function RoundTip({
  finding,
  onInfo,
}: {
  finding: MockRoundTip;
  onInfo: (tip: TacticalTip) => void;
}) {
  const tip = getTacticalTip(finding.tipId);
  return (
    <article
      data-mock-round={finding.round}
      data-mock-scope={finding.scope}
      data-mock-player={finding.playerId}
      data-tip-category={tip.tipo}
      className={cn("rounded-md border p-4", tipCategoryTheme(tip.tipo).card)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <TipCategoryBadge categoryId={tip.tipo} />
          <span className="text-[12px] text-muted-foreground">#{tip.id}</span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Como é inferida a dica ${tip.id}`}
          onClick={() => onInfo(tip)}
        >
          <Info />
        </Button>
      </div>
      <h4 className="mb-2 text-sm font-medium leading-relaxed">{tip.titulo}</h4>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {tip.descricao}
      </p>
    </article>
  );
}
