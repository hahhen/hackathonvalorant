from collections import Counter
from ..context import evidence, player_target, team_target, number, point, distance


CAST_SLOTS = {"grenadeCasts": "grenade", "ability1Casts": "ability1", "ability2Casts": "ability2", "ultimateCasts": "ultimate"}


def cast_summary(ctx, uid):
    stats = ctx.players[uid].get("stats") or {}
    casts = stats.get("abilityCasts")
    rounds = sum(uid in r.stats for r in ctx.rounds)
    played = stats.get("roundsPlayed")
    if not isinstance(casts, dict) or not all(number(casts.get(k)) and isinstance(casts[k], int) for k in CAST_SLOTS): return None
    if not number(played) or played == 0 or played != rounds: return None
    return {**{k: casts[k] for k in CAST_SLOTS}, "roundsPlayed": played, "castsPerRoundMatchAverage": sum(casts[k] for k in CAST_SLOTS) / played}


def ability_name(ctx, uid, item):
    agent = str(ctx.players.get(uid, {}).get("characterId") or "").lower()
    slot = {"Ability1": "ability1", "Ability2": "ability2", "GrenadeAbility": "grenade", "Ultimate": "ultimate"}.get(item)
    return ctx.abilities.get(agent, {}).get("abilities", {}).get(slot, {}).get("namePtBr")


def evaluate(ctx, report, cfg):
    targets = [(player_target(ctx, uid), [uid]) for uid in ctx.players] + [(team_target(t), ctx.roster(t)) for t in ctx.teams]
    for target, members in targets:
        # 095: global counters are never expanded into invented per-round cast events.
        summaries = [cast_summary(ctx, uid) for uid in members]
        usable = all(s is not None for s in summaries)
        rounds = [r.number for r in ctx.rounds if any(uid in r.stats for uid in members)]
        ev = []
        if usable:
            for uid, summary in zip(members, summaries):
                anchor = next(r for r in ctx.rounds if uid in r.stats)
                ev.append(evidence(anchor, ctx.player_paths[uid] + "/stats/abilityCasts", {**summary, "scope": "match; roundNumber is a source anchor, not a cast timestamp"}))
        total = sum(sum(s[k] for k in CAST_SLOTS) for s in summaries) if usable else 0
        average = total / len(rounds) if usable else 0
        report.record("095", target, match_only=True, unit="match", evaluated=usable, flagged=usable,
                      rounds=rounds, observation=f"{total} ativações totais registradas; média de {average:.2f} por round do recorte. Não informa uso em rounds específicos ou habilidades disponíveis ao morrer.",
                      evidence=ev, participants=members, reason="Contadores somente da partida; ausência ou roundsPlayed inconsistente impedem calcular médias. Volume não mede qualidade ou disponibilidade.")

        for r in ctx.rounds:
            # 096: all lethal Ability events, positive contributions included. Ability-weapons retain Weapon.
            kills = [k for k in ctx.combat(r) if k.damage_type == "Ability" and k.killer in members]
            if not kills or not r.kills_complete:
                report.record("096", target, r, eligible=False if r.kills_complete else None, evaluated=False, unit="death",
                              reason=None if r.kills_complete else "Histórico de mortes incompleto.")
            for kill in kills if r.kills_complete else []:
                raw_item = (kill.raw.get("finishingDamage") or {}).get("damageItem")
                name = ability_name(ctx, kill.killer, raw_item)
                label = name or f"habilidade de slot {raw_item or 'não informado'}"
                relative = kill.time - r.plant_time if r.plant_time is not None else None
                report.record("096", target, r, key=kill.event_id, unit="death", flagged=True,
                              observation=f"Finalização por {label}, aos {kill.time/1000:.3f} s" + (f", {relative/1000:.3f} s em relação ao plant." if relative is not None else "; horário de plant não disponível.") + " Não comprova interrupção de plant/defuse.",
                              evidence=[evidence(r, kill.path, {"damageType": "Ability", "damageItem": raw_item, "abilityName": name, "timeMs": kill.time,
                                                              "timeSincePlantMs": relative, "winningTeam": r.raw.get("winningTeam")}, kill)] +
                                       ([evidence(r, r.path + "/plantRoundTime", {"plantTimeMs": r.plant_time})] if r.plant_time is not None else []),
                              participants=[kill.killer, kill.victim], partial=bool(r.raw.get("bombDefuser") and r.defuse_time is None) or bool(r.raw.get("bombPlanter") and r.plant_time is None),
                              reason="Mede finalização por habilidade, não o cast, efeito não letal ou negação comprovada do objetivo. Mortes após defuse com horário conhecido ficam fora; sem horário, não se localiza o fim da disputa.")
            # 097: denominator is allied kills in which assistance could be recorded, not ability casts.
            team_kills = [k for k in ctx.combat(r) if ctx.team(k.killer) == target["teamId"] and (target["kind"] == "team" or k.killer != target["playerId"])]
            if not team_kills or not r.kills_complete:
                report.record("097", target, r, eligible=False if r.kills_complete else None, evaluated=False, unit="death")
            for kill in team_kills if r.kills_complete else []:
                assistants = kill.raw.get("assistants")
                usable = isinstance(assistants, list) and all(uid in ctx.players and ctx.team(uid) == ctx.team(kill.killer) for uid in assistants)
                assistants = sorted(set(assistants)) if usable else []
                selected = assistants if target["kind"] == "team" else [uid for uid in assistants if uid == target["playerId"]]
                flag = usable and bool(selected)
                killer_pos = kill.position(kill.killer)
                lengths = [distance(killer_pos["location"], k["location"]) for a in selected if (k := kill.position(a)) and killer_pos]
                report.record("097", target, r, key=kill.event_id, unit="death", evaluated=usable, flagged=flag,
                              observation=f"Assistência registrada no abate de {kill.victim}; permite revisar a participação conjunta, não identificar flash/drone/stun ou sincronização de casts.",
                              evidence=[evidence(r, kill.path, {"killer": kill.killer, "assistants": ";".join(selected), "timeMs": kill.time,
                                                              "nearestSampledAssistantDistanceUnits": min(lengths) if lengths else None}, kill)] if usable else [],
                              participants=[kill.killer, kill.victim, *selected], partial=True,
                              reason="Assistência não identifica habilidade causal. Distância entre pontos do mesmo evento não prova cobertura ou visibilidade; casts só existem no agregado da partida.")

    # 098: team-level composition and side/context facts, not a recommendation to copy a meta.
    for team in ctx.teams:
        members = ctx.roster(team)
        agents = [ctx.agent(uid) for uid in members]
        usable = all(a.get("nome") and a.get("classe") for a in agents)
        roles = Counter(a["classe"] for a in agents) if usable else Counter()
        ev = []
        if usable:
            for uid, agent in zip(members, agents):
                ev.append(evidence(ctx.rounds[0], ctx.player_paths[uid], {"playerId": uid, "agent": agent["nome"], "class": agent["classe"], "scope": "match composition"}))
            for r in ctx.rounds:
                contributions = [ctx.contribution(r, uid, cfg.followup_window_ms) for uid in members]
                if all(c is not None for c in contributions):
                    ev.append(evidence(r, r.path, {"side": r.side(team), "roundWon": r.raw.get("winningTeam") == team,
                                                  "kills": sum(c["kills"] for c in contributions), "assists": sum(c["assists"] for c in contributions),
                                                  "plants": sum(c["plant"] for c in contributions), "defuses": sum(c["defuse"] for c in contributions)}))
        partial = any(not r.kills_complete or r.side(team) is None for r in ctx.rounds)
        report.record("098", team_target(team), match_only=True, unit="match", evaluated=usable, flagged=usable,
                      rounds=[r.number for r in ctx.rounds], observation="Composição registrada: " + "; ".join(f"{a.get('nome', 'desconhecido')} ({a.get('classe', 'classe desconhecida')})" for a in agents) + ". Distribuição de funções: " + "; ".join(f"{role}: {n}" for role, n in sorted(roles.items())) + ". Inventário para revisão, não medida de sinergia ou validação do meta.",
                      evidence=ev, participants=members, partial=partial,
                      reason="Uma única composição não compara alternativas; função do agente não prova função exercida. Agente/classe desconhecidos impedem o inventário completo.")

    for uid in ctx.players:
        target = player_target(ctx, uid)
        for r in ctx.rounds:
            deaths = [k for k in ctx.combat(r) if k.victim == uid]
            kill = deaths[0] if deaths else None
            positions = kill.raw.get("playerLocations") if kill else None
            present = [entry["puuid"] for entry in positions or [] if isinstance(entry, dict) and ctx.team(entry.get("puuid")) and ctx.team(entry["puuid"]) != ctx.team(uid)]
            usable = bool(kill and point(kill.victim_position) and isinstance(positions, list) and present and all(ctx.agent(p).get("nome") for p in present))
            report.record("099", target, r, eligible=bool(deaths) if r.kills_complete else None, evaluated=False, flagged=False,
                          observation="No evento da morte, o snapshot registra adversários com estes agentes: " + ", ".join(ctx.agent(p).get("nome", p) for p in sorted(set(present))) + ". Contexto para revisar ferramentas adversárias, sem afirmar que foram usadas ou estavam disponíveis.",
                          evidence=[evidence(r, kill.path, {"victimX": kill.victim_position["x"], "victimY": kill.victim_position["y"], "sampledOpponents": ";".join(sorted(set(present))), "opponentAgents": ";".join(ctx.agent(p).get("nome", p) for p in sorted(set(present)))}, kill)] if usable else [],
                          participants=[uid, *present], partial=True,
                          reason="Sem geometria versionada e lançamento/efeito/cooldowns não se avalia adequação da posição às ferramentas inimigas. Roster e presença no snapshot não bastam para recomendar mudar de posição; detector bloqueado, sem achado fabricado.")
            # 100: measurable positive participation despite zero lethal contributions.
            contribution = ctx.contribution(r, uid, cfg.followup_window_ms)
            flag = bool(contribution and contribution["kills"] == 0 and sum(contribution[k] for k in ("assists", "plant", "defuse", "trades")) > 0)
            eco = r.stats.get(uid, {}).get("economy")
            eco = eco if isinstance(eco, dict) else {}
            report.record("100", target, r, eligible=True if uid in r.stats else None, evaluated=contribution is not None, flagged=flag,
                          observation="Mesmo sem kill contra adversário na disputa, registrou assistência, resposta temporal ou participação no objetivo; revisar contribuição além do K/D.",
                          evidence=[evidence(r, r.path, {**contribution, "side": r.side(ctx.team(uid)), "roundWon": r.raw.get("winningTeam") == ctx.team(uid), "registeredLoadoutValue": eco.get("loadoutValue") if number(eco.get("loadoutValue")) else None})] if contribution else [],
                          participants=[uid], parameters={"tradeWindowMs": cfg.followup_window_ms},
                          reason="Resposta temporal não comprova trade planejado; não mede disciplina, comunicação, rotina de treino ou qualidade do capitão.")
