"use client";
import { useI18n } from "@/i18n/provider";
import { useId } from "react";
import Image from "next/image";
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
import { teamLabel } from "@/lib/teams";
import type { Player } from "@/types/match";

export function CoachingPlayerSelect({
  players,
  playerId,
  onPlayer,
}: {
  players: Player[];
  playerId?: string;
  onPlayer: (id: string) => void;
}) {
  const { t } = useI18n();
  const id = useId(),
    selected = players.find((p) => p.id === playerId);
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {t("Jogador para dicas individuais")}</label>
      <Select value={playerId} onValueChange={onPlayer}>
        <SelectTrigger
          id={id}
          data-coaching-player={playerId}
          className="h-16! w-full min-w-0 max-w-80 bg-muted text-left text-sm max-[500px]:max-w-none"
        >
          <SelectValue
            placeholder={t("Selecionar jogador")}
            className="min-w-0 flex-1"
          >
            {selected && (
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
                    {selected.agent} · {t(teamLabel(selected.team))}
                  </span>
                </span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" align="end">
          {(["horizon", "orbit"] as const).map((team) => (
            <SelectGroup key={team}>
              <SelectLabel>{t(teamLabel(team))}</SelectLabel>
              {players
                .filter((p) => p.team === team)
                .map((p) => (
                  <SelectItem
                    key={p.id}
                    value={p.id}
                    textValue={`${p.name} ${p.tag} ${p.agent}`}
                  >
                    <Image
                      src={agentImage(p.agent)}
                      alt=""
                      width={32}
                      height={32}
                      className="size-8 shrink-0 rounded bg-muted object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {p.name}#{p.tag}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {p.agent}
                      </span>
                    </span>
                  </SelectItem>
                ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
