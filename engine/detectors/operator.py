from ..context import distance, point, evidence, player_target, snapshot_position


SPATIAL_LIMIT = "Comparação de pontos amostrados em unidades brutas; sem regiões, rota, linha de visão ou prova de imobilidade."


def first_sample(r, uid):
    for time, entries, path in r.snapshots:
        if r.defuse_time is not None and time >= r.defuse_time: continue
        pos = snapshot_position(entries, uid)
        if pos:
            index = next(i for i, p in enumerate(entries) if p is pos)
            return time, pos["location"], f"{path}/{index}"
    return None


def evaluate(ctx, report, cfg):
    for uid in ctx.players:
        target = player_target(ctx, uid)
        op_rounds = []
        for r in ctx.rounds:
            stat = r.stats.get(uid)
            eco = (stat or {}).get("economy")
            registered = ctx.weapon(eco.get("weapon")) if isinstance(eco, dict) else None
            if registered == "Operator": op_rounds.append(r)
            known = r.kills_complete
            kills = [k for k in ctx.combat(r) if k.killer == uid and ctx.weapon(k.item) == "Operator" and k.damage_type == "Weapon"]
            params = {"repeatDistanceUnits": cfg.operator_repeat_distance_units}
            # 081: first available pick and strictly later snapshot, never an interpolated route.
            if not known or not kills:
                report.record("081", target, r, eligible=False if known else None, evaluated=False,
                              reason=None if known else "Histórico de mortes incompleto.")
            else:
                first = kills[0]
                origin = first.position(uid)
                later = None
                for time, entries, path in r.snapshots:
                    if time <= first.time or (r.defuse_time is not None and time >= r.defuse_time): continue
                    if any(k.victim == uid and first.time <= k.time <= time for k in r.kills): break
                    pos = snapshot_position(entries, uid)
                    if pos:
                        index = next(i for i, p in enumerate(entries) if p is pos)
                        later = (time, pos["location"], f"{path}/{index}")
                        break
                usable = bool(origin and later)
                delta = distance(origin["location"], later[1]) if usable else None
                report.record("081", target, r, evaluated=usable,
                              flagged=usable and delta <= cfg.operator_repeat_distance_units,
                              observation=f"Após um pick de Operator, duas posições disponíveis diferem {delta:.1f} unidades; revisar variação sem concluir que ficou parado." if usable else "",
                              evidence=[evidence(r, first.path, {"pickTimeMs": first.time, "x": origin["location"]["x"], "y": origin["location"]["y"]}, first),
                                        evidence(r, later[2], {"sampleTimeMs": later[0], "sampledDisplacementUnits": delta})] if usable else [],
                              participants=[uid], parameters=params, partial=True, reason=SPATIAL_LIMIT if usable else "Sem duas amostras válidas do jogador vivo após o pick.", basis="inferred")

            # 083 is explicitly blocked, not guessed from the minimap raster.
            report.record("083", target, r, eligible=(None if not known or (len(kills) >= 2 and r.side(ctx.team(uid)) is None) else len(kills) >= 2 and r.side(ctx.team(uid)) == "Defender"),
                          evaluated=False, reason="Recuo em relação ao site exige geometria versionada e direção de referência; minimapa não fornece essa geometria.")
            # 084: limited positive evidence of approach and a quick death after a second pick.
            applicable = known and len(kills) >= 2
            first, second = (kills[:2] if applicable else (None, None))
            a, b = (first.position(uid), second.position(uid)) if applicable else (None, None)
            death = next((k for k in r.kills if r.active(k) and k.victim == uid and second and k.time > second.time), None)
            end_sample = max((k.time for k in r.kills if r.active(k)), default=0)
            observed = applicable and (bool(death and death.time - second.time <= cfg.followup_window_ms) or end_sample >= second.time + cfg.followup_window_ms)
            usable = bool(observed and a and b and point(second.victim_position) and second.time > first.time and not ctx.repeated_death(r, uid)
                          and not any(k.victim == uid and first.time <= k.time <= second.time for k in r.kills))
            approach = distance(a["location"], second.victim_position) - distance(b["location"], second.victim_position) if usable else None
            flag = usable and approach > cfg.operator_min_approach_units and death is not None and 0 < death.time - second.time <= cfg.followup_window_ms
            report.record("084", target, r, eligible=applicable if known else None, evaluated=usable, flagged=bool(flag),
                          observation=f"Depois do segundo pick de Operator, o jogador morreu em {death.time-second.time:.0f} ms. As posições amostradas se aproximaram {approach:.1f} unidades do ponto da segunda vítima." if flag else "",
                          evidence=[evidence(r, first.path, {"timeMs": first.time, "x": a["location"]["x"], "y": a["location"]["y"]}, first),
                                    evidence(r, second.path, {"timeMs": second.time, "x": b["location"]["x"], "y": b["location"]["y"], "sampledApproachUnits": approach}, second),
                                    evidence(r, death.path, {"deathTimeMs": death.time}, death)] if flag else [],
                          participants=[uid], parameters={"followupWindowMs": cfg.followup_window_ms, "minSampledApproachUnits": cfg.operator_min_approach_units},
                          basis="inferred", partial=True, reason="Não mede agressividade, intenção, rota, disponibilidade de escape ou tempo de equipar. Janelas sem observação suficiente não são avaliadas.")

            side = r.side(ctx.team(uid))
            applicable = registered == "Operator" and side == "Attacker"
            unknown = not isinstance(eco, dict) or not eco.get("weapon") or (registered == "Operator" and side is None)
            contribution = ctx.contribution(r, uid, cfg.followup_window_ms)
            flag = bool(applicable and contribution and contribution["deaths"] and not contribution["kills"] and not contribution["assists"])
            first_contact = next((k.time for k in ctx.combat(r) if k.killer == uid or k.victim == uid), None)
            report.record("085", target, r, eligible=None if unknown else applicable, evaluated=bool(contribution), flagged=flag,
                          observation="Operator registrada em round de ataque: morte registrada sem kill ou assistência; revisar o contexto, não concluir compra errada.",
                          evidence=[evidence(r, r.stat_paths.get(uid, r.path), {**(contribution or {}), "weapon": registered, "firstContactTimeMs": first_contact,
                                                                                 "plantTimeMs": r.plant_time, "side": side, "roundWon": r.raw.get("winningTeam") == ctx.team(uid)})] if flag else [],
                          participants=[uid], partial=True, reason="Equipamento registrado não prova compra ou arma em cada duelo; não há intenção de rush.")
            # 086/087: actual lethal weapon, not economy.weapon, and same-event shooter position.
            if not known or not kills:
                for tip in ("086", "087"):
                    report.record(tip, target, r, eligible=False if known else None, evaluated=False, unit="death",
                                  reason=None if known else "Histórico de mortes incompleto.")
            else:
                for kill in kills:
                    pos = kill.position(uid)
                    usable = bool(pos and point(kill.victim_position))
                    length = distance(pos["location"], kill.victim_position) if usable else None
                    for tip in ("086", "087"):
                        flag = usable and (tip == "086" or length <= cfg.operator_close_distance_units)
                        report.record(tip, target, r, key=kill.event_id or kill.path, unit="death", evaluated=usable, flagged=flag,
                                      observation=f"Finalização de Operator a {length:.1f} unidades brutas; não identifica scope, distância navegável nem tiros errados." if flag else "",
                                      evidence=[evidence(r, kill.path, {"distanceUnits": length, "timeMs": kill.time, "weapon": "Operator"}, kill)] if usable else [],
                                      participants=[uid, kill.victim], parameters={"closeDistanceUnits": cfg.operator_close_distance_units} if tip == "087" else {},
                                      partial=True, reason="Somente distâncias de finalizações com posição contemporânea; sem atribuir todos os duelos à arma ou medir visibilidade.")
            hits = ctx.damage(r, uid)
            applicable = registered in ("Operator", "Marshal", "Outlaw", "Tour de Force")
            usable = hits is not None and hits["hits"] > 0
            report.record("088", target, r, eligible=None if not isinstance(eco, dict) or not eco.get("weapon") else applicable,
                          evaluated=usable, flagged=applicable and usable,
                          observation=f"Sniper registrada no round; acertos gerais do jogador: {hits['headshots']} cabeça, {hits['bodyshots']} corpo e {hits['legshots']} perna. Não são acertos atribuídos à sniper." if usable else "",
                          evidence=[evidence(r, r.stat_paths.get(uid, r.path), {**hits, "registeredWeapon": registered})] if usable else [],
                          participants=[uid], partial=True, reason="Dano agregado não possui arma por acerto; não se calcula HS% por arma.")

        # 082: whole-match comparison; first sampled point is not a starting position.
        if len(op_rounds) < 2:
            report.record("082", target, match_only=True, eligible=False, evaluated=False,
                          reason="Menos de dois rounds com Operator registrada.")
        for previous, current in zip(op_rounds, op_rounds[1:]):
            a, b = first_sample(previous, uid), first_sample(current, uid)
            side = previous.side(ctx.team(uid))
            usable = bool(a and b and side and side == current.side(ctx.team(uid)))
            delta = distance(a[1], b[1]) if usable else None
            report.record("082", target, match_only=True, key=f"{previous.number}:{current.number}", evaluated=usable,
                          flagged=usable and delta <= cfg.operator_repeat_distance_units, unit="round",
                          observation=f"Primeiras posições disponíveis nos R{previous.number}/R{current.number}, do mesmo lado, diferem {delta:.1f} unidades; não são posições iniciais." if usable else "",
                          evidence=[evidence(previous, a[2], {"sampleTimeMs": a[0], "x": a[1]["x"], "y": a[1]["y"]}), evidence(current, b[2], {"sampleTimeMs": b[0], "x": b[1]["x"], "y": b[1]["y"], "distanceUnits": delta})] if usable else [],
                          rounds=[previous.number, current.number], participants=[uid], parameters={"repeatDistanceUnits": cfg.operator_repeat_distance_units},
                          basis="inferred", partial=True, reason=SPATIAL_LIMIT + " Pares entre lados diferentes ou sem amostra não são avaliados; unidade round representa transições entre rounds com Operator.")
