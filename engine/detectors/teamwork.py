"""039–056: bounded teamwork indicators adapted from the supplied 39a80.py."""
from ..context import evidence, distance
from .middle_facts import (facts, targets, emit, blocked, ally_distance, transitions,
                           positions, spread, SPATIAL_LIMIT, STATE_LIMIT)


def evaluate(ctx, report, cfg):
    for target, members in targets(ctx):
        team = target["teamId"]
        prior_site = None
        for r in ctx.rounds:
            f = facts(ctx, r)
            kills, deaths = f.combat, [k for k in f.combat if k.victim in members]
            own = [k for k in kills if k.killer in members]
            applicable = True if r.kills_complete else None
            # Same-team deaths, not a claim about coordinated entry or attackers' intent.
            team_deaths = [k for k in kills if ctx.team(k.victim) == team]
            pairs = [(a, b) for a, b in zip(team_deaths, team_deaths[1:]) if b.time > a.time and b.victim in members]
            emit(report, "039", target, r, eligible=applicable, usable=r.kills_complete,
                 ev=[evidence(r, b.path, {"previousDeathTimeMs": a.time, "deathTimeMs": b.time,
                     "elapsedMs": b.time-a.time, "nearestSampledAllyDistanceUnits": ally_distance(ctx, b, b.victim)}, b)
                     for a, b in pairs], flag=bool(pairs), participants=members,
                 observation="Mortes aliadas sucessivas registradas; intervalos não comprovam entrada em fila ou falta de coordenação.", reason=SPATIAL_LIMIT)

            # One opportunity per allied death, NOT per 1/3/5-second window or evidence row.
            allied_deaths = [k for k in kills if ctx.team(k.victim) == team]
            opportunities = allied_deaths if target["kind"] == "team" else [k for k in allied_deaths if k.victim != members[0]]
            if not opportunities or not r.kills_complete:
                report.record("040", target, r, eligible=False if r.kills_complete else None, evaluated=False, unit="death", reason="Sem morte aliada aplicável ou feed incompleto.")
            for k in opportunities if r.kills_complete else []:
                replies = [t for t in kills if t.killer in members and t.killer != k.victim and t.victim == k.killer
                           and 0 < t.time-k.time <= max(5000, cfg.followup_window_ms)
                           and not any(d.victim in (k.killer, t.killer) and k.time < d.time < t.time for d in r.kills)]
                reply = min(replies, key=lambda t: t.time) if replies else None
                elapsed = reply.time-k.time if reply else None
                flag = reply is not None and elapsed <= cfg.followup_window_ms
                # Absence isn't a failed trade if the observation window is censored.
                horizon = r.defuse_time if r.defuse_time is not None else max((t.time for t in r.kills), default=0)
                usable = flag or horizon >= k.time + cfg.followup_window_ms
                report.record("040", target, r, key=k.event_id, unit="death", evaluated=usable, flagged=flag,
                    observation=f"Um aliado eliminou o autor da morte após {elapsed} ms; resposta temporal, não coordenação comprovada.",
                    evidence=[evidence(r, k.path, {"deathTimeMs": k.time, "replyTimeMs": reply.time if reply else None,
                        "elapsedMs": elapsed, "within1s": elapsed is not None and elapsed <= 1000,
                        "within3s": elapsed is not None and elapsed <= 3000, "within5s": elapsed is not None and elapsed <= 5000}, k)] +
                        ([evidence(r, reply.path, {"tradePlayerId": reply.killer}, reply)] if reply else []),
                    participants=[k.victim, k.killer, *([reply.killer] if reply else [])], parameters={"windowMs": cfg.followup_window_ms, "sensitivityWindowsMs": "1000;3000;5000"},
                    partial=True, reason="Janelas analíticas de 1/3/5 s, sem valor universal. Janela censurada não conta como ausência confirmada; sem timestamp confiável de ressurreição.")

            distances = [(k, ally_distance(ctx, k, k.victim)) for k in deaths]
            valid = [(k, d) for k, d in distances if d is not None]
            emit(report, "041", target, r, eligible=bool(deaths) if r.kills_complete else None, usable=bool(valid),
                 ev=[evidence(r, k.path, {"victimId": k.victim, "nearestSampledAllyDistanceUnits": d}, k) for k, d in valid],
                 observation="Distância ao aliado amostrado mais próximo na morte. Não identifica região avançada nem pedido de companhia.", reason=SPATIAL_LIMIT)
            assists = [(k, a) for k in kills for a in (k.raw.get("assistants") or [])
                       if isinstance(a, str) and a in ctx.players and ctx.team(a) == team and (a in members or k.killer in members)]
            emit(report, "042", target, r, eligible=applicable, usable=r.kills_complete and all(isinstance(k.raw.get("assistants"), list) for k in kills),
                 ev=[evidence(r, k.path, {"killerId": k.killer, "assistantId": a,
                      "sampledPairDistanceUnits": distance(k.position(k.killer)["location"], k.position(a)["location"]) if k.position(k.killer) and k.position(a) else None}, k) for k, a in assists],
                 flag=bool(assists), observation="Pares com assistência registrada; não prova distração, bait combinado ou crossfire.", reason=SPATIAL_LIMIT)

            moves = [(uid, a, b, d) for uid in members for a, b, d in transitions(ctx, r, uid)]
            post = [(uid, a, b, d) for uid in members for a, b, d in transitions(ctx, r, uid, r.plant_time)] if r.plant_time is not None else []
            for tip, subset, eligible, note in (
                ("043", post, bool(f.planter) if not f.planter or r.plant_time is not None else None, "Mudanças amostradas após plant; sem medir conservação/perda de controle."),
                ("053", moves, r.side(team) == "Defender" if r.side(team) else None, "Mudanças amostradas na defesa; não provam recuo por pressão ou reforço solicitado."),
            ):
                emit(report, tip, target, r, eligible=eligible, usable=bool(subset),
                     ev=[evidence(r, b[2], {"playerId": uid, "fromTimeMs": a[0], "toTimeMs": b[0], "displacementUnits": d}) for uid, a, b, d in subset],
                     observation=note, participants=members, reason=SPATIAL_LIMIT)
            blocked(report, "045", target, r, applicable)
            blocked(report, "048", target, r, applicable)

            before = [k for k in own if r.plant_time is not None and k.time < r.plant_time]
            plant_eligible = f.plant_team == team if f.planter else False
            if f.planter and f.plant_team is None: plant_eligible = None
            for tip in ("044", "046"):
                emit(report, tip, target, r, eligible=plant_eligible, usable=r.plant_time is not None and r.kills_complete,
                     values={"plantTimeMs": r.plant_time, "plantSite": r.raw.get("plantSite"), "killsBeforePlant": len(before),
                             "lastPickToPlantMs": r.plant_time-before[-1].time if before else None},
                     flag=bool(before), observation="Abates anteriores e intervalo até o plant concluído. Não comprova fake, pressão em outro lado ou aceleração da entrada.", reason=SPATIAL_LIMIT)
            site = r.raw.get("plantSite") if plant_eligible else None
            repeated = site is not None and prior_site == site
            emit(report, "047", target, r, eligible=plant_eligible, usable=site is not None,
                 values={"site": site, "previousRecordedPlantSite": prior_site, "roundWon": r.raw.get("winningTeam") == team}, flag=repeated,
                 observation="Site de plants concluídos repetido em rounds do mesmo lado. Não representa todas as tentativas nem concentração inimiga na entrada.", reason=SPATIAL_LIMIT)
            if site is not None: prior_site = site
            plant_own = {p: xy for p, xy in f.plant_positions.items() if ctx.team(p) == team}
            emit(report, "049", target, r, eligible=bool(f.planter), usable=bool(plant_own),
                 values={"sampledAlliesAtPlant": len(plant_own), "sampledTeamDiameterUnits": spread(plant_own)},
                 observation="Distribuição aliada amostrada no plant; não identifica lado vazio, concentração 1+4 por região ou controle de rotação.", reason=SPATIAL_LIMIT)

            sampled_distances = [(k, ally_distance(ctx, k, k.killer)) for k in own]
            separated = [(k, d) for k, d in sampled_distances if d is not None and d >= cfg.sampled_isolation_distance_units]
            for tip in ("050", "051", "052"):
                selected = separated
                if tip == "051": selected = [(k, d) for k, d in selected if any(ctx.team(a.victim) == team and a.victim != k.killer and a.time < k.time for a in kills)]
                if tip == "052": selected = [(k, d) for k, d in selected if f.plant_team == team and r.plant_time is not None and k.time < r.plant_time]
                emit(report, tip, target, r, eligible=bool(own) if r.kills_complete else None,
                     usable=r.kills_complete and any(d is not None for _, d in sampled_distances),
                     ev=[evidence(r, k.path, {"killerId": k.killer, "nearestSampledAllyDistanceUnits": d,
                         "timeMs": k.time, "nextPlantMs": r.plant_time if r.plant_time is not None and r.plant_time > k.time else None}, k) for k, d in selected],
                     flag=bool(selected), observation="Abate com separação espacial entre aliados amostrados; contexto temporal para revisão, sem classificar lurker, flanco ou utilidade do espaço.",
                     parameters={"sampledIsolationDistanceUnits": cfg.sampled_isolation_distance_units},
                     reason=SPATIAL_LIMIT + " Distância alta não estabelece isolamento real; ausentes no snapshot não têm posição estimada.")
            defensive_samples = [(t, positions(ctx, entries), path) for t, entries, path in r.snapshots if r.plant_time is not None and t > r.plant_time and (r.defuse_time is None or t <= r.defuse_time)]
            defensive_samples = [(t, {p: xy for p, xy in pts.items() if p in members}, path) for t, pts, path in defensive_samples]
            defensive_samples = [(t, pts, path) for t, pts, path in defensive_samples if len(pts) > 1]
            emit(report, "054", target, r, eligible=bool(f.planter) and r.side(team) == "Defender" if r.side(team) else None,
                 usable=bool(defensive_samples), ev=[evidence(r, path, {"timeMs": t, "sampledPlayers": len(pts), "diameterUnits": spread(pts)}) for t, pts, path in defensive_samples],
                 observation="Dispersão amostrada da defesa após plant; não reconstrói múltiplas rotas de retake.", reason=SPATIAL_LIMIT)
            emit(report, "055", target, r, eligible=applicable, usable=f.valid_state,
                 ev=[evidence(r, batch[0].path, {"timeMs": t, "survivingPlayerIds": ";".join(sorted(after[team])),
                     "survivingAgents": ";".join(ctx.agent(p).get("nome", "desconhecido") for p in sorted(after[team]))}, batch[0]) for t, _, after, batch in f.states],
                 observation="Identidades sobreviventes inferidas por evento; não atribui função inicial ou possibilidade de rotação ao agente.", reason=STATE_LIMIT)
            followups = [(a, next((b for b in kills if b.time > a.time), None)) for a in deaths]
            followups = [(a, b) for a, b in followups if b]
            emit(report, "056", target, r, eligible=applicable, usable=r.kills_complete,
                 ev=[evidence(r, b.path, {"previousDeathMs": a.time, "nextKillMs": b.time, "elapsedMs": b.time-a.time}, b) for a, b in followups], flag=bool(followups),
                 observation="Tempo entre morte aliada e próximo abate registrado; não comprova existência ou adaptação de um plano.", reason=SPATIAL_LIMIT)
