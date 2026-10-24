"""057–072: completed objectives and bounded snapshot context, never attempts."""
from ..context import evidence, point, distance, snapshot_position
from .middle_facts import (facts, targets, emit, blocked, ally_distance, positions, spread,
                           outcome, STATE_LIMIT, SPATIAL_LIMIT)


def evaluate(ctx, report, cfg):
    for r in ctx.rounds:
        f = facts(ctx, r)
        at_plant = f.at(r.plant_time) if r.plant_time is not None else None
        for target, members in targets(ctx):
            team = target["teamId"]
            attack = f.plant_team == team
            # Contextual team round facts are not duplicated as individual blame.
            involved = attack and (target["kind"] == "team" or f.planter in members)
            plant_eligible = bool(f.planter) if not f.planter or r.plant_time is not None else None
            own_points = {p: xy for p, xy in f.plant_positions.items() if ctx.team(p) == team}
            enemy_points = {p: xy for p, xy in f.plant_positions.items() if ctx.team(p) != team}
            location = r.raw.get("plantLocation")
            nearest = min((distance(location, xy) for xy in enemy_points.values()), default=None) if point(location) else None
            emit(report, "057", target, r, eligible=involved if plant_eligible is not None else None,
                 usable=r.plant_time is not None and nearest is not None,
                 values={"plantTimeMs": r.plant_time, "nearestSampledEnemyToSpikeUnits": nearest, "sampledEnemies": len(enemy_points)},
                 observation="Tempo do plant concluído e distância bruta aos inimigos amostrados. Não identifica a primeira janela segura para plantar.", reason=SPATIAL_LIMIT)
            emit(report, "058", target, r, eligible=involved if plant_eligible is not None else None,
                 usable=at_plant is not None and f.valid_state,
                 values={"alliesAliveAtPlant": len(at_plant[team]) if at_plant else None,
                         "enemiesAliveAtPlant": sum(len(ids) for t, ids in at_plant.items() if t != team) if at_plant else None,
                         "deathsWithinWindow": sum(k.victim in ctx.roster(team) and 0 < k.time-r.plant_time <= cfg.afterplant_death_window_ms for k in f.combat) if r.plant_time is not None else None},
                 observation="Estado numérico inferido no plant e mortes seguintes; não prova limpeza do site ou tentativas fracassadas.", reason=STATE_LIMIT)
            emit(report, "059", target, r, eligible=involved, usable=point(location),
                 values={"site": r.raw.get("plantSite"), "spikeX": location["x"] if point(location) else None,
                         "spikeY": location["y"] if point(location) else None, "sampledAllies": len(own_points), "roundWon": r.raw.get("winningTeam") == team},
                 observation="Coordenada do plant concluído e resultado; sem classificar plant aberto, seguro ou defensável.", reason=SPATIAL_LIMIT)
            blocked(report, "060", target, r, involved)

            start = snapshot_position(r.raw.get("plantPlayerLocations"), f.planter)
            later = next(((time, sample, path) for time, entries, path in r.snapshots
                          if r.plant_time is not None and time > r.plant_time and (r.defuse_time is None or time < r.defuse_time)
                          and (sample := snapshot_position(entries, f.planter))), None)
            usable = bool(start and later and not any(k.victim == f.planter and r.plant_time <= k.time <= later[0] for k in r.kills))
            emit(report, "061", target, r, eligible=involved if plant_eligible is not None else None, usable=usable,
                 ev=([evidence(r, r.path + "/plantPlayerLocations", {"planterId": f.planter, "plantTimeMs": r.plant_time}),
                      evidence(r, later[2], {"nextTimeMs": later[0], "elapsedMs": later[0]-r.plant_time,
                                           "displacementUnits": distance(start["location"], later[1]["location"])})] if usable else []),
                 observation="Deslocamento do planter até a próxima amostra estritamente posterior, sem morte intermediária. Não mede planejamento nem instante da saída.", reason=SPATIAL_LIMIT)
            deaths = [k for k in f.combat if k.victim in members and r.plant_time is not None and
                      0 < k.time-r.plant_time <= cfg.afterplant_death_window_ms]
            emit(report, "062", target, r, eligible=attack if plant_eligible is not None else None, usable=r.kills_complete and r.plant_time is not None,
                 ev=[evidence(r, k.path, {"victimId": k.victim, "elapsedSincePlantMs": k.time-r.plant_time}, k) for k in deaths], flag=bool(deaths),
                 observation="Morte atacante pouco após o plant; contexto para revisar, não prova duelo gratuito.",
                 parameters={"afterplantDeathWindowMs": cfg.afterplant_death_window_ms},
                 reason="Janela analítica, não regra da aula. Exclui mortes no/após defuse concluído conhecido; detonação não recebe timer inventado.")

            valid_interval = r.plant_time is not None and r.defuse_time is not None and r.defuse_time >= r.plant_time
            result = outcome(r)
            emit(report, "063", target, r, eligible=plant_eligible,
                 usable=result is not None and (not r.raw.get("bombDefuser") or valid_interval),
                 values={"outcome": result, "plantTimeMs": r.plant_time, "defuseTimeMs": r.defuse_time,
                         "plantToDefuseMs": r.defuse_time-r.plant_time if valid_interval else None, "roundWon": r.raw.get("winningTeam") == team},
                 observation="Desfecho registrado do afterplant e intervalo plant–defuse quando disponível. Não representa início, fake, metade ou tempo restante.", partial=False)

            # Stronger positive case requires an actual boundary before bomb deaths.
            before_bomb = f.at(f.bomb_time) if f.bomb_time is not None else None
            enemy_count = sum(len(ids) for t, ids in before_bomb.items() if t != team) if before_bomb else None
            emit(report, "064", target, r, eligible=attack and result == "detonation", usable=f.valid_state and before_bomb is not None,
                 values={"defendersInferredAliveBeforeBombEvents": enemy_count}, flag=enemy_count is not None and enemy_count > 0,
                 observation="Vitória por detonação com defensores ainda não eliminados antes dos eventos de bomba. Não atribui a vitória a uma decisão específica.", reason=STATE_LIMIT)
            entries = [entry for entry in f.clutches(team) if entry[2] == 2 and (target["kind"] == "team" or entry[0] in members)
                       and r.plant_time is not None and entry[1] >= r.plant_time]
            emit(report, "065", target, r, eligible=bool(entries) if f.valid_state else None,
                 usable=f.valid_state and valid_interval,
                 ev=[evidence(r, r.path, {"soloPlayerId": uid, "entryTimeMs": t, "defuserId": r.raw.get("bombDefuser"),
                     "lastSoloKillToDefuseMs": r.defuse_time-max(k.time for k in f.combat if k.killer == uid and t < k.time < r.defuse_time)
                        if any(k.killer == uid and t < k.time < r.defuse_time for k in f.combat) and r.defuse_time is not None else None}) for uid, t, _, _ in entries] if valid_interval else [],
                 observation="Sequência de 1v2 pós-plant e intervalo até defuse concluído; não identifica quem dava cobertura ou início do desarme.", reason=STATE_LIMIT)
            post_picks = [k for k in f.combat if k.killer in members and r.plant_time is not None and k.time > r.plant_time]
            sampled = [(k, ally_distance(ctx, k, k.killer)) for k in post_picks]
            sampled = [(k, d) for k, d in sampled if d is not None]
            emit(report, "066", target, r, eligible=bool(post_picks) if r.kills_complete else None, usable=bool(sampled),
                 ev=[evidence(r, k.path, {"nearestSampledAllyDistanceUnits": d}, k) for k, d in sampled],
                 observation="Proximidade aliada amostrada no pick pós-plant; não comprova cobertura de outros lados.", reason=SPATIAL_LIMIT)
            emit(report, "067", target, r, eligible=bool(f.planter) and attack, usable=len(own_points) >= 2,
                 values={"sampledAlliesAtPlant": len(own_points), "diameterUnits": spread(own_points)},
                 observation="Dispersão aliada no snapshot do plant. Maior distância não significa melhor afterplant ou mais regiões controladas.", reason=SPATIAL_LIMIT)
            for tip in ("068", "069"): blocked(report, tip, target, r, attack)

            defense = r.side(team) == "Defender" if r.side(team) else None
            emit(report, "070", target, r, eligible=defense, usable=r.raw.get("winningTeam") in ctx.teams,
                 values={"plantCompleted": bool(f.planter), "site": r.raw.get("plantSite"),
                         "defuseCompleted": bool(r.raw.get("bombDefuser")), "roundWon": r.raw.get("winningTeam") == team},
                 observation="Resultado defensivo condicionado à existência de plant. Plant não equivale a tentativa de retake.", partial=False)
            emit(report, "071", target, r, eligible=plant_eligible, usable=at_plant is not None and f.valid_state,
                 values={"alliedSurvivorIds": ";".join(sorted(at_plant[team])) if at_plant else None,
                         "enemySurvivorIds": ";".join(sorted(p for t, ids in at_plant.items() if t != team for p in ids)) if at_plant else None,
                         "survivingAgents": ";".join(f"{p}:{ctx.agent(p).get('nome', 'desconhecido')}" for ids in at_plant.values() for p in sorted(ids)) if at_plant else None},
                 observation="Agentes sobreviventes inferidos na conclusão do plant; não informa cargas, cooldowns ou ultimate disponível.", reason=STATE_LIMIT)
            attacker = r.side(team) == "Attacker" if r.side(team) else None
            emit(report, "072", target, r, eligible=attacker, usable=result is not None and r.raw.get("winningTeam") in ctx.teams,
                 values={"outcome": result, "plantCompleted": bool(f.planter), "winningTeam": r.raw.get("winningTeam")},
                 flag=result == "timeout" and not f.planter and r.raw.get("winningTeam") != team,
                 observation="Ataque perdeu por expiração do relógio sem plant registrado. O resultado não prova indecisão ou oportunidade segura de plantar.", partial=False)
