"""073–080: inferred states, not CeremonyClutch flags or guessed duel isolation."""
from ..context import evidence, distance, number, point
from .middle_facts import facts, targets, emit, blocked, outcome, positions, STATE_LIMIT, SPATIAL_LIMIT


def evaluate(ctx, report, cfg):
    for r in ctx.rounds:
        f = facts(ctx, r)
        for target, members in targets(ctx):
            team = target["teamId"]
            enemy = next(t for t in ctx.teams if t != team)
            entries = [e for e in f.clutches(team) if target["kind"] == "team" or e[0] in members]
            eligible = bool(entries) if f.valid_state else None
            entry_evidence = [evidence(r, batch[0].path, {"soloPlayerId": uid, "entryTimeMs": t,
                "opponentsAtEntry": count, "side": r.side(team), "spikePlantedAtEntry": r.plant_time is not None and r.plant_time <= t,
                "roundWon": r.raw.get("winningTeam") == team}, batch[0]) for uid, t, count, batch in entries]
            emit(report, "073", target, r, eligible=eligible, usable=f.valid_state, ev=entry_evidence, participants=[e[0] for e in entries],
                 observation="Entrada 1vX inferida do feed, com lado, estado da spike no instante e desfecho. Estados simultâneos são processados juntos.", reason=STATE_LIMIT)
            subsequent = [(uid, t, [k for k in f.combat if k.killer == uid and k.time > t]) for uid, t, _, _ in entries]
            sequential = [(uid, a, b) for uid, _, ks in subsequent for a, b in zip(ks, ks[1:]) if b.time > a.time]
            emit(report, "074", target, r, eligible=eligible, usable=f.valid_state,
                 ev=[evidence(r, b.path, {"soloPlayerId": uid, "previousKillMs": a.time, "nextKillMs": b.time, "elapsedMs": b.time-a.time}, b) for uid, a, b in sequential],
                 flag=bool(sequential), observation="Abates sequenciais durante estado 1vX inferido; não comprovam x1 isolados ou ausência de ameaças simultâneas.", reason=SPATIAL_LIMIT + " " + STATE_LIMIT)
            threats = []
            for uid, t, ks in subsequent:
                for k in ks:
                    origin = k.position(uid)
                    if not origin: continue
                    points = positions(ctx, k.raw.get("playerLocations"))
                    if point(k.victim_position): points[k.victim] = k.victim_position
                    for pid, xy in points.items():
                        if ctx.team(pid) == enemy:
                            threats.append(evidence(r, k.path, {"opponentId": pid, "killedAtEvent": pid == k.victim,
                                "sampledDistanceUnits": distance(origin["location"], xy)}, k))
            emit(report, "075", target, r, eligible=eligible, usable=f.valid_state and bool(threats), ev=threats,
                 observation="Distâncias brutas de adversários amostrados no abate do sobrevivente. Não mede quem chegaria primeiro, som ou caminho navegável.", reason=SPATIAL_LIMIT)
            for tip in ("076", "077"): blocked(report, tip, target, r, eligible)
            emit(report, "078", target, r, eligible=eligible, usable=f.valid_state and r.raw.get("winningTeam") in ctx.teams,
                 ev=[evidence(r, r.path, {"soloPlayerId": uid, "entryTimeMs": t, "killsAfterEntry": len(ks),
                     "outcome": outcome(r), "roundWon": r.raw.get("winningTeam") == team}) for uid, t, ks in subsequent],
                 observation="Desfecho do estado 1vX e kills posteriores, inclusive derrotas e vitórias por objetivo. Não mede calma ou qualidade do posicionamento.", reason=STATE_LIMIT)
            advantages = [(t, after) for t, _, after, _ in f.states if len(after[team]) >= 2 and len(after[enemy]) == 1]
            if target["kind"] == "player": advantages = [(t, after) for t, after in advantages if members[0] in after[team]]
            emit(report, "079", target, r, eligible=bool(advantages) if f.valid_state else None, usable=f.valid_state and r.raw.get("winningTeam") in ctx.teams,
                 values={"firstAdvantageTimeMs": advantages[0][0] if advantages else None,
                         "alliesAtFirstAdvantage": len(advantages[0][1][team]) if advantages else None, "roundWon": r.raw.get("winningTeam") == team},
                 flag=bool(advantages) and r.raw.get("winningTeam") != team,
                 observation="Equipe perdeu após vantagem numérica contra um adversário inferida no feed. Isso não prova duelos oferecidos isoladamente.", reason=STATE_LIMIT + " " + SPATIAL_LIMIT)

    # 080 is an inventory of comparable recorded contexts, not a stream of defeated-round warnings.
    for target, members in targets(ctx):
        ev = []
        contexts = []
        for r in ctx.rounds:
            equipment = [(r.stats.get(uid, {}).get("economy") or {}).get("loadoutValue") for uid in members]
            loadout = sum(equipment) if all(number(v) for v in equipment) else None
            key = (r.side(target["teamId"]), bool(r.raw.get("bombPlanter")), r.raw.get("plantSite"), loadout)
            contexts.append((r, key))
        for r, key in contexts:
            comparable = [other for other, other_key in contexts if other_key == key]
            ev.append(evidence(r, r.path, {"side": r.side(target["teamId"]), "site": r.raw.get("plantSite"),
                "plantCompleted": bool(r.raw.get("bombPlanter")), "outcome": outcome(r),
                "roundWon": r.raw.get("winningTeam") == target["teamId"],
                "registeredLoadoutValue": key[3], "comparableRecordedRounds": len(comparable),
                "comparableRecordedWins": sum(other.raw.get("winningTeam") == target["teamId"] for other in comparable),
                "comparisonKey": "same side, plant presence, site and exact registered loadout; fixed match composition"}))
        report.record("080", target, match_only=True, unit="match", flagged=True, rounds=[r.number for r in ctx.rounds],
            observation="Inventário de contextos por lado, objetivo e equipamento, com sucessos e derrotas. Uma partida não estabelece taxa universal ou superioridade de uma tática.",
            evidence=ev, participants=members, partial=True,
            reason="Contextos brutos para comparação; não classifica intenção tática. Equipamento registrado pode ser comprado, recebido ou guardado.")
