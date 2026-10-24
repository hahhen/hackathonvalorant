from .common import Finding, unavailable, found, distance, equipment_class


def economy(tip, ctx, r, target):
    cfg, match = ctx.cfg, ctx.match
    team, pid = target["teamId"], target.get("playerId")
    members = ctx.members(team)
    economies = {p: r.economy(p) for p in members}
    if len(members) != 5 or any(e is None for e in economies.values()):
        return unavailable("São necessários cinco estados econômicos completos do time.")
    ev = [r.econ_evidence(p) for p in members]
    values = [economies[p]["loadoutValue"] for p in members]
    classes = [equipment_class(v, cfg) for v in values]
    own = economies.get(pid)
    result = r.evidence(teamId=team, won=r.winner == team, result=r.raw.get("roundResult"), side=r.roles.get(team))
    ev.append(result)
    idx = match.rounds.index(r)
    prev = match.rounds[idx - 1] if idx and match.rounds[idx - 1].n == r.n - 1 else None
    nxt = match.rounds[idx + 1] if idx + 1 < len(match.rounds) and match.rounds[idx + 1].n == r.n + 1 else None
    half = cfg["regulationHalfRounds"]

    def compatible(other):
        # Não cruzar reset de metade nem resets econômicos do overtime.
        return other and r.n <= 2 * half and (other.n - 1) // half == (r.n - 1) // half

    if tip in (1, 3, 7, 14):
        if not compatible(nxt):
            return unavailable("Sem próximo round contíguo na mesma metade regulamentar.", applicable=False)
        next_e = {p: nxt.economy(p) for p in members}
        if any(e is None for e in next_e.values()):
            return unavailable("Equipamento do próximo round indisponível.")
        ev += [nxt.econ_evidence(p) for p in members]
        ev.append(nxt.evidence(teamId=team, won=nxt.winner == team))
        if tip == 1:
            if own["spent"] >= cfg["highSpend"] and own["loadoutValue"] - next_e[pid]["loadoutValue"] >= cfg["equipmentDrop"]:
                return found(f"R{r.n}→R{nxt.n}: gasto {own['spent']} e equipamento de {own['loadoutValue']} para {next_e[pid]['loadoutValue']}.", ev)
        elif tip == 3:
            median = sorted(e["spent"] for e in economies.values())[2]
            if own["loadoutValue"] < cfg["fullMinValue"] and own["spent"] >= cfg["highSpend"] and own["spent"] > median and next_e[pid]["loadoutValue"] < cfg["fullMinValue"]:
                return found(f"R{r.n}→R{nxt.n}: gasto individual {own['spent']} acima da mediana {median}; equipamento abaixo da faixa full nos dois rounds.", ev)
        elif tip == 7:
            if r.n not in (3, half + 3):
                return unavailable("Recorte de bônus somente R3/R15 na configuração padrão.", applicable=False)
            if not compatible(prev):
                return unavailable("Round anterior do bônus ausente.")
            if any(prev.economy(p) is None for p in members):
                return unavailable("Economia anterior ao bônus ausente.")
            ev += [prev.econ_evidence(p) for p in members]
            ev.append(prev.evidence(teamId=team, won=prev.winner == team))
            return found(f"Sequência R{prev.n}–R{nxt.n}: gasto coletivo no possível bônus {sum(e['spent'] for e in economies.values())}; {sum(e['loadoutValue'] >= cfg['fullMinValue'] for e in next_e.values())}/5 equipamentos full no round seguinte.", ev)
        else:
            return found(f"R{r.n}→R{nxt.n}: gasto coletivo {sum(e['spent'] for e in economies.values())}; equipamento total {sum(values)}→{sum(e['loadoutValue'] for e in next_e.values())}; resultados registrados na evidência.", ev)
    elif tip == 2:
        return found(f"R{r.n}: distribuição declarada de equipamento: {classes.count('eco')} eco, {classes.count('semi')} semi, {classes.count('full')} full; vitória={r.winner == team}.", ev)
    elif tip == 4:
        prior = [q for q in match.rounds if q.n < r.n]
        if [q.n for q in prior] != list(range(1, r.n)) or any(q.winner not in match.teams for q in prior):
            return unavailable("Placar anterior incompleto.")
        score = sum(q.winner == team for q in prior)
        enemy_score = len(prior) - score
        ev += [q.evidence(winningTeam=q.winner) for q in prior]
        ev.append(r.evidence(scoreBefore=score, opponentScoreBefore=enemy_score))
        if enemy_score >= cfg["regulationWinRounds"] - 1 and sum(values) / 5 < cfg["fullMinValue"]:
            return found(f"R{r.n}: placar anterior {score}–{enemy_score}; equipamento médio {sum(values)/5:.0f}, abaixo da faixa full. Contexto para revisar a compra.", ev)
    elif tip == 5:
        if r.n not in (2, half + 2):
            return unavailable("Somente o round após os pistols regulamentares.", applicable=False)
        if not compatible(prev) or not prev.feed_complete:
            return unavailable("Pistol anterior ausente ou feed incompleto.")
        if prev.winner == team:
            return unavailable("Time não perdeu o pistol anterior.", applicable=False)
        deaths = sum(match.team(e.data['victim']) != team for e in prev.combat)
        planted = match.team(prev.raw.get("bombPlanter")) == team
        ev += [prev.evidence(planted=planted, enemyDeaths=deaths, winningTeam=prev.winner)]
        ev += [e.evidence(prev.n, killer=e.data.get("killer"), victim=e.data["victim"]) for e in prev.combat]
        return found(f"R{prev.n} perdido: plant={planted}, {deaths} baixas adversárias; R{r.n}: equipamento total {sum(values)}, vitória={r.winner == team}.", ev)
    elif tip == 6:
        if r.n not in (3, half + 3):
            return unavailable("Possível bônus apenas no terceiro round de cada metade.", applicable=False)
        if not compatible(prev) or not prev.feed_complete or prev.ambiguous_lives or prev.economy(pid) is None:
            return unavailable("Sobrevivência/economia anterior não reconstruível com segurança.")
        old = prev.economy(pid)
        if not any(e.data["victim"] == pid for e in prev.kills) and own["weapon"] and own["weapon"].lower() == str(old["weapon"]).lower() and own["spent"] < cfg["highSpend"]:
            return found(f"R{prev.n}→R{r.n}: sem morte registrada no anterior, mesmo identificador de arma e gasto {own['spent']}; compatível com continuidade de equipamento.", ev + [prev.econ_evidence(pid), prev.evidence(playerId=pid, recordedDeaths=0)])
    elif tip == 8:
        if len(set(classes)) > 1:
            return found(f"R{r.n}: equipamentos de {min(values)} a {max(values)} em faixas diferentes ({classes.count('eco')} eco/{classes.count('semi')} semi/{classes.count('full')} full).", ev)
    elif tip == 9:
        full = classes.count("full")
        if full in (3, 4) and own["loadoutValue"] < cfg["fullMinValue"]:
            if not r.feed_complete:
                return unavailable("Feed incompleto para contribuição por kill/assistência.")
            kills = sum(e.data.get("killer") == pid for e in r.combat)
            assists = sum(pid in e.data.get("assistants", []) for e in r.combat)
            return found(f"R{r.n}: {full}/5 colegas na faixa full; equipamento individual {own['loadoutValue']}, {kills} abates e {assists} assistências registradas.", ev + [e.evidence(r.n, killer=e.data.get('killer'), victim=e.data['victim']) for e in r.combat if e.data.get('killer') == pid or pid in e.data.get('assistants', [])])
    elif tip == 10:
        if classes.count("full") == 1 and classes.count("eco") == 4:
            return found(f"R{r.n}: um equipamento full e quatro eco; total {sum(values)}. Revisar o contexto coletivo.", ev)
    elif tip == 11:
        if not r.feed_complete or r.opening is None:
            return unavailable("Primeira eliminação indisponível, simultânea ou feed incompleto.")
        op = r.opening
        opponents = ctx.members(next(t for t in match.teams if t != team))
        other = {p: r.economy(p) for p in opponents}
        if any(e is None for e in other.values()):
            return unavailable("Economia adversária incompleta.")
        killed = op.data["victim"]
        if match.team(killed) != team:
            return found(f"R{r.n}: primeira vítima adversária com equipamento {other[killed]['loadoutValue']}; intervalo adversário {min(e['loadoutValue'] for e in other.values())}–{max(e['loadoutValue'] for e in other.values())}.", ev + [r.econ_evidence(p) for p in opponents] + [op.evidence(r.n, victim=killed, killer=op.data['killer'])])
    elif tip == 12:
        if not compatible(prev) or prev.economy(pid) is None:
            return unavailable("Saldo do round anterior ausente ou reset entre rounds.", applicable=False)
        old = prev.economy(pid)
        if old["remaining"] <= cfg["lowBalance"] and own["loadoutValue"] >= cfg["fullMinValue"]:
            return found(f"R{prev.n}→R{r.n}: saldo anterior {old['remaining']}, equipamento posterior {own['loadoutValue']}; a origem dos recursos/arma não está registrada.", ev + [prev.econ_evidence(pid)])
    elif tip == 13:
        opponents = ctx.members(next(t for t in match.teams if t != team))
        other = [r.economy(p) for p in opponents]
        if any(e is None for e in other):
            return unavailable("Economia adversária incompleta.")
        other_total = sum(e["loadoutValue"] for e in other)
        if sum(values) >= cfg["equipmentAdvantageRatio"] * other_total and sum(values) > other_total and r.winner != team:
            return found(f"R{r.n}: derrota com equipamento total {sum(values)} contra {other_total}; cerimônia {r.raw.get('roundCeremony', '')}.", ev + [r.econ_evidence(p) for p in opponents])
    return Finding()
