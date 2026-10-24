from collections import Counter
from math import atan2, degrees, pi, isfinite
from ..context import evidence, player_target, team_target, point, distance, snapshot_position


HIT_LIMIT = "Distribuição de acertos agregados, não precisão, altura da mira, ordem dos tiros ou dano por arma."


def evaluate(ctx, report, cfg):
    # 089 collective is recomputed from team hit records, not copied individual diagnoses.
    targets = [(player_target(ctx, p), [p]) for p in ctx.players] + [(team_target(t), ctx.roster(t)) for t in ctx.teams]
    for target, members in targets:
        for r in ctx.rounds:
            rows = [ctx.damage(r, uid) for uid in members]
            usable = all(row is not None for row in rows)
            hits = {key: sum(row[key] for row in rows) for key in rows[0]} if usable else None
            evaluated = bool(usable and hits["hits"] > 0)
            ratio = hits["headshots"] / hits["hits"] if evaluated else None
            flag = bool(evaluated and hits["hits"] >= cfg.min_hits and ratio < cfg.low_headshot_ratio)
            report.record("089", target, r, eligible=None if any(uid not in r.stats for uid in members) else True,
                          evaluated=evaluated, flagged=flag,
                          observation=f"{hits['headshots']} de {hits['hits']} acertos registrados na cabeça ({ratio*100:.1f}%). Recorte para revisão, não diagnóstico de mira baixa." if evaluated else "",
                          evidence=[evidence(r, r.stat_paths[uid], {**ctx.damage(r, uid), "agentRole": ctx.agent(uid).get("classe"),
                                      "registeredWeapon": ctx.weapon(r.stats[uid].get("economy", {}).get("weapon")) if isinstance(r.stats[uid].get("economy"), dict) else None,
                                      "side": r.side(ctx.team(uid)), "roundWon": r.raw.get("winningTeam") == ctx.team(uid)}) for uid in members] if evaluated else [],
                          participants=members, parameters={"minHits": cfg.min_hits, "reviewHeadshotRatioBelow": cfg.low_headshot_ratio},
                          partial=False, reason=HIT_LIMIT if evaluated else "Dano/acertos ausentes, inválidos ou sem amostra de acertos.")

    for uid in ctx.players:
        target = player_target(ctx, uid)
        inventory, inventory_evidence, known_rounds, incomplete = Counter(), [], [], False
        for r in ctx.rounds:
            stat = r.stats.get(uid)
            eco = (stat or {}).get("economy")
            weapon = ctx.weapon(eco.get("weapon")) if isinstance(eco, dict) else None
            if weapon:
                inventory[weapon] += 1
                known_rounds.append(r.number)
                inventory_evidence.append(evidence(r, r.stat_paths[uid] + "/economy", {"registeredWeapon": weapon, "weaponId": eco["weapon"]}))
            else: incomplete = True

            # 091 is only a pistol-round triage, never a firing cadence detector.
            bomb_mode = "BombGameMode" in str((ctx.raw.get("matchInfo") or {}).get("gameMode") or "")
            applicable = r.number in (1, 13) and bomb_mode
            hits = ctx.damage(r, uid)
            contribution = ctx.contribution(r, uid, cfg.followup_window_ms)
            usable = hits is not None and contribution is not None
            flag = bool(applicable and usable and hits["damage"] > 0 and contribution["kills"] == 0 and contribution["deaths"] > 0)
            report.record("091", target, r, eligible=applicable if bomb_mode else None, evaluated=usable, flagged=flag,
                          observation="No pistol, registrou dano contra adversários, nenhuma kill e uma morte; revisar o confronto sem inferir cadência ou recoil.",
                          evidence=[evidence(r, r.stat_paths[uid], {**hits, **contribution})] if usable else [],
                          participants=[uid], basis="inferred", partial=True,
                          parameters={"pistolRound1": 1, "pistolRound2": 13}, reason="Indício fraco: não há disparos errados, cadência, inputs ou ordem dos acertos. R1/R13 é a convenção do modo Bomb padrão; sem modo identificado, não avaliar.")

            # 092: lethal distance and round-wide hit records stay separate.
            kills = [k for k in ctx.combat(r) if k.killer == uid and k.damage_type == "Weapon"
                     and ctx.weapon(k.item) and not ctx.ids["armas"][k.item].get("exclusiva")
                     and ctx.weapon(k.item) not in ("Operator", "Marshal", "Outlaw", "Melee", "Bucky", "Judge")]
            if not kills or not r.kills_complete:
                report.record("092", target, r, eligible=False if r.kills_complete else None, evaluated=False, unit="death")
            for kill in kills if r.kills_complete else []:
                pos = kill.position(uid)
                usable = bool(pos and point(kill.victim_position))
                length = distance(pos["location"], kill.victim_position) if usable else None
                flag = usable and length >= cfg.long_distance_units
                ev = [evidence(r, kill.path, {"lethalDistanceUnits": length, "weapon": ctx.weapon(kill.item), "timeMs": kill.time}, kill)] if usable else []
                if hits is not None: ev.append(evidence(r, r.stat_paths[uid] + "/damage", {**hits, "scope": "round; not attributed to this kill or distance"}))
                report.record("092", target, r, key=kill.event_id, unit="death", evaluated=usable, flagged=flag,
                              observation=f"Finalização de {ctx.weapon(kill.item)} a {length:.1f} unidades brutas; os acertos do round são um recorte separado, sem identificar tap/burst/spray." if usable else "",
                              evidence=ev, participants=[uid, kill.victim], parameters={"longDistanceUnits": cfg.long_distance_units},
                              partial=True, reason="Indício fraco: amostra de finalizações, não todos os duelos ou o tipo de tiro.")

            # 093: opening death and damage are a triage, not evidence of angle-clearing mechanics.
            opening = ctx.opening(r)
            unique = len(opening) == 1
            first = opening[0] if unique else None
            applicable = unique and first.victim == uid
            usable = hits is not None and applicable and point(first.victim_position)
            flag = bool(usable and hits["damage"] <= cfg.first_death_damage_max)
            report.record("093", target, r, eligible=(None if not r.kills_complete or len(opening) > 1 else applicable), evaluated=usable, flagged=flag,
                          observation="Primeira morte contra adversário, com contribuição de dano limitada no round: revisar o ponto de contato, sem concluir erro de abertura de ângulo.",
                          evidence=[evidence(r, first.path, {"timeMs": first.time, "x": first.victim_position["x"], "y": first.victim_position["y"]}, first), evidence(r, r.stat_paths[uid] + "/damage", hits)] if usable else [],
                          participants=[uid, first.killer] if usable else [], parameters={"roundDamageAtMost": cfg.first_death_damage_max},
                          basis="inferred", partial=True, reason="Indício fraco; não há regiões versionadas, movimento, limpeza de pixels ou utilidade percebida. Empates na abertura não são desambiguados pela ordem do array.")

            # 094: strictly prior victim sample; victim never gets a current inferred orientation.
            eligible = [k for k in ctx.combat(r) if k.killer == uid and k.damage_type in ("Weapon", "Melee")]
            if not eligible or not r.kills_complete:
                report.record("094", target, r, eligible=False if r.kills_complete else None, evaluated=False, unit="death")
            for kill in eligible if r.kills_complete else []:
                previous = None
                for time, entries, path in r.snapshots:
                    if time >= kill.time: break
                    if any(isinstance(e, dict) and e.get("puuid") == kill.victim for e in entries or []):
                        previous = (time, entries, path)
                prior = snapshot_position(previous[1], kill.victim) if previous else None
                killer = kill.position(uid)
                orientation = prior.get("viewRadians") if prior else None
                usable = bool(previous and prior and killer and point(kill.victim_position)
                              and isinstance(orientation, (int, float)) and not isinstance(orientation, bool) and isfinite(orientation)
                              and 0 < kill.time - previous[0] <= cfg.prior_snapshot_window_ms
                              and distance(prior["location"], kill.victim_position) <= cfg.prior_snapshot_displacement_units
                              and not any(k.victim == kill.victim and previous[0] <= k.time < kill.time for k in r.kills))
                angle, moved = None, None
                if usable:
                    dx, dy = killer["location"]["x"] - kill.victim_position["x"], killer["location"]["y"] - kill.victim_position["y"]
                    if dx == 0 and dy == 0: usable = False
                    else:
                        angle = abs(degrees((atan2(dy, dx) - orientation + pi) % (2 * pi) - pi))
                        moved = distance(prior["location"], kill.victim_position)
                flag = usable and angle >= cfg.rear_candidate_angle_degrees
                ev = []
                if usable:
                    index = next(i for i, p in enumerate(previous[1]) if p is prior)
                    ev = [evidence(r, f"{previous[2]}/{index}", {"priorTimeMs": previous[0], "priorViewRadians": orientation, "priorX": prior["location"]["x"], "priorY": prior["location"]["y"]}),
                          evidence(r, kill.path, {"killTimeMs": kill.time, "sampleAgeMs": kill.time-previous[0], "victimDisplacementUnits": moved, "angleDegrees": angle,
                                                  "killerX": killer["location"]["x"], "killerY": killer["location"]["y"], "victimX": kill.victim_position["x"], "victimY": kill.victim_position["y"]}, kill)]
                report.record("094", target, r, key=kill.event_id, unit="death", evaluated=usable, flagged=flag,
                              observation=f"Candidato baseado na orientação anterior da vítima: diferença de {angle:.1f}°, amostra de {kill.time-previous[0]:.0f} ms antes. Não confirma morte de costas." if flag else "",
                              evidence=ev, participants=[uid, kill.victim], basis="inferred", partial=True,
                              parameters={"priorSnapshotWindowMs": cfg.prior_snapshot_window_ms, "maxVictimDisplacementUnits": cfg.prior_snapshot_displacement_units, "minAngleDegrees": cfg.rear_candidate_angle_degrees},
                              reason="Orientação é anterior ao disparo; ausência, idade, deslocamento, retorno à vida e snapshots simultâneos impedem avaliação. Sem visibilidade/altura/parede; nunca reportar taxa confirmada de mortes de costas.")

        # 090 is a whole-match inventory, not proof that a training session occurred.
        finalizations = Counter(ctx.weapon(k.item) or f"unknown:{k.item}" for r in ctx.rounds for k in ctx.combat(r) if k.killer == uid and k.damage_type in ("Weapon", "Melee"))
        ev = list(inventory_evidence)
        for r in ctx.rounds:
            for k in ctx.combat(r):
                if k.killer == uid and k.damage_type in ("Weapon", "Melee"):
                    ev.append(evidence(r, k.path, {"finishingWeaponId": k.item, "finishingWeapon": ctx.weapon(k.item)}, k))
        usable = bool(inventory)
        report.record("090", target, match_only=True, unit="match", evaluated=usable, flagged=usable,
                      rounds=sorted({e["roundNumber"] for e in ev}),
                      observation="Equipamento registrado por round: " + "; ".join(f"{w}: {n}" for w, n in sorted(inventory.items())) + ". Finalizações por arma: " + "; ".join(f"{w}: {n}" for w, n in sorted(finalizations.items())) + ". Inventário para escolher contextos de treino, não comprovação de treino realizado.",
                      evidence=ev, participants=[uid], partial=incomplete or not all(r.kills_complete for r in ctx.rounds),
                      reason="Arma registrada não prova compra, drop ou arma de todos os confrontos; nomes desconhecidos não são adivinhados. Sem sessões de treino.")
