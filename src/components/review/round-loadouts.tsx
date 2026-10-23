import Image from "next/image";
import {
  agentImage,
  armorAsset,
  hasWeaponImage,
  weaponImage,
} from "@/data/assets";
import { teamLabel } from "@/lib/teams";
import { cn } from "@/lib/utils";
import type { Player, Round } from "@/types/match";

const number = (value: number | null | undefined) =>
  value == null ? "—" : value.toLocaleString("pt-BR");
const armorNames: Record<string, string> = {
  "Light Armor": "Escudo leve",
  "Heavy Armor": "Escudo pesado",
  "Regen Shield": "Escudo regenerativo",
};

export function RoundLoadouts({
  round,
  players,
}: {
  round: Round;
  players: Player[];
}) {
  return (
    <section
      aria-label={`Equipamento do round ${round.number}`}
      className="border-b border-border p-3"
    >
      {!round.loadouts?.length ? (
        <p className="text-sm text-muted-foreground">
          Equipamento não informado nesta partida.
        </p>
      ) : (
        <div className="grid min-w-0 grid-cols-2 gap-3 max-[1100px]:grid-cols-1">
          {(["horizon", "orbit"] as const).map((team) => (
            <div
              key={team}
              className="min-w-0 overflow-hidden rounded-md border border-border"
            >
              <h4
                className={cn(
                  "px-3 py-1.5 text-sm font-medium",
                  team === "horizon"
                    ? "bg-team-friendly/10 text-team-friendly"
                    : "bg-primary/10 text-primary",
                )}
              >
                {teamLabel(team)}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] table-fixed text-sm leading-tight [&_th]:py-1.5 [&_td]:py-1.5">
                  <caption className="sr-only">
                    Jogadores, pontuação, eliminações, assistências, economia e
                    equipamento do round
                  </caption>
                  <colgroup>
                    <col className="w-[29%]" />
                    <col className="w-[10%]" />
                    <col className="w-[6%]" />
                    <col className="w-[6%]" />
                    <col className="w-[23%]" />
                    <col className="w-[26%]" />
                  </colgroup>
                  <thead className="border-b border-border bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-left font-normal">
                        Jogador
                      </th>
                      <th
                        title="Pontuação no round"
                        className="px-1 py-2 text-right font-normal"
                      >
                        Score
                      </th>
                      <th className="px-1 py-2 text-right font-normal">K</th>
                      <th className="px-1 py-2 text-right font-normal">A</th>
                      <th className="px-2 py-2 text-right font-normal">
                        Economia
                      </th>
                      <th className="px-2 py-2 text-center font-normal">
                        Equip.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {players
                      .filter((p) => p.team === team)
                      .map((player) => {
                        const summary = round.loadouts?.find(
                          (s) => s.playerId === player.id,
                        );
                        const economy = summary?.economy;
                        const armor = economy?.armorId
                          ? armorAsset(economy.armorId)
                          : undefined;
                        const armorName = !economy
                          ? "Não informado"
                          : !economy.armorId
                            ? "Sem escudo"
                            : armor
                              ? (armorNames[armor.name] ?? armor.name)
                              : "Escudo desconhecido";
                        return (
                          <tr
                            key={player.id}
                            data-loadout-player={player.id}
                            className="border-b border-border last:border-0"
                          >
                            <td className="px-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <Image
                                  src={agentImage(player.agent)}
                                  alt={player.agent}
                                  width={28}
                                  height={28}
                                  className="size-7 shrink-0 rounded bg-muted object-cover"
                                />
                                <span
                                  className="truncate"
                                  title={`${player.name}#${player.tag}`}
                                >
                                  {player.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-1 text-right tabular-nums">
                              {number(summary?.score)}
                            </td>
                            <td className="px-1 text-right tabular-nums">
                              {number(summary?.kills)}
                            </td>
                            <td className="px-1 text-right tabular-nums">
                              {number(summary?.assists)}
                            </td>
                            <td
                              className="px-2 text-right tabular-nums"
                              title={`Gasto no round: ${number(economy?.spent)}`}
                            >
                              <span
                                className="block"
                                title="Valor do equipamento"
                              >
                                {number(economy?.loadoutValue)}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                Saldo {number(economy?.remaining)}
                              </span>
                              <span className="sr-only">
                                Gasto {number(economy?.spent)}
                              </span>
                            </td>
                            <td className="px-2">
                              <div className="flex min-w-0 flex-col items-center gap-0.5">
                                {economy?.weapon &&
                                hasWeaponImage(economy.weapon) ? (
                                  <Image
                                    src={weaponImage(economy.weapon)}
                                    alt={economy.weapon}
                                    title={economy.weapon}
                                    width={72}
                                    height={20}
                                    className="h-5 w-18 max-w-full object-contain"
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {economy?.weapon ?? "Não informado"}
                                  </span>
                                )}
                                <span
                                  className="flex max-w-full min-w-0 items-center justify-center gap-1 text-xs text-muted-foreground"
                                  title={armorName}
                                >
                                  {armor && (
                                    <Image
                                      src={armor.file}
                                      alt=""
                                      width={14}
                                      height={14}
                                      className="size-3.5 shrink-0 object-contain"
                                    />
                                  )}
                                  <span className="truncate">{armorName}</span>
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
