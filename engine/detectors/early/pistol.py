from .common import Finding, unavailable, found, distance, equipment_class


def pistol(tip, ctx, r, target):
    cfg, match = ctx.cfg, ctx.match
    if r.n not in (1, cfg["regulationHalfRounds"] + 1):
        return unavailable("Fora dos pistols regulamentares; overtime não é pistol.", applicable=False)
    team, pid = target["teamId"], target.get("playerId")
    if not r.feed_complete:
        return unavailable("Feed de kills incompleto.")
    if tip == 22:
        if r.opening is None:
            return unavailable("Primeira eliminação ausente ou simultânea.")
        op = r.opening
        if match.team(op.data["killer"]) == team and r.winner != team:
            plant = match.team(r.raw.get("bombPlanter")) == team
            return found(f"R{r.n}: time obteve a primeira eliminação, plant={plant} e perdeu o pistol.", [op.evidence(r.n, killer=op.data['killer'], victim=op.data['victim']), r.evidence(winningTeam=r.winner, planted=plant)])
        return Finding()
    own = r.economy(pid)
    agent = ctx.agent(pid)
    if own is None or agent is None:
        return unavailable("Economia ou agente não identificado no dicionário.")
    ev = [r.econ_evidence(pid), {"roundNumber": r.n, "sourcePath": f"/players/{list(match.raw['players']).index(match.players[pid])}", "values": {"characterId": match.players[pid].get('characterId'), "agent": agent}}]
    kills = [e for e in r.combat if e.data["killer"] == pid]
    if tip == 15:
        return found(f"R{r.n}: {agent}, arma registrada {ctx.name('armas', own['weapon']) or own['weapon']}, armadura {ctx.name('escudos', own['armor']) or own['armor']}, gasto {own['spent']}; {len(kills)} abates; vitória={r.winner == team}.", ev + [r.evidence(playerId=pid, kills=len(kills), won=r.winner == team)])
    if tip == 17:
        op = r.opening
        if op is None:
            return unavailable("Abertura simultânea ou ausente.")
        if op.data["killer"] != pid:
            return unavailable("Jogador não foi o autor da primeira eliminação.", applicable=False)
        death = r.death(pid, op.time)
        if death and death.time - op.time <= cfg["followupWindowMs"]:
            return found(f"R{r.n}: {agent} conseguiu a primeira eliminação e morreu {death.time-op.time} ms depois no pistol.", ev + [op.evidence(r.n, killer=pid), death.evidence(r.n, victim=pid, delayMs=death.time-op.time)])
        if not r.window_complete(op, cfg["followupWindowMs"]):
            return unavailable("Janela pós-abertura censurada.")
        return Finding()
    if tip == 18:
        if agent != "Reyna":
            return unavailable("Dica aplicável somente à Reyna.", applicable=False)
        if r.opening is None:
            return unavailable("Abertura simultânea ou ausente.")
        if any(r.simultaneous_response(e) for e in r.combat if match.team(e.data['victim']) == team):
            return unavailable('Resposta no mesmo timestamp: ordem causal da troca ambígua.')
        responses = [(e, r.response(e, cfg["tradeWindowMs"])) for e in r.combat if match.team(e.data['victim']) == team]
        own_responses = [(e, trade) for e, trade in responses if trade and trade.data['killer'] == pid]
        first_death = r.opening.data['victim'] == pid
        if own_responses or first_death:
            evidence = ev + [r.opening.evidence(r.n, firstVictim=r.opening.data['victim'])]
            evidence += [e.evidence(r.n, victim=e.data['victim']) for e, _ in own_responses]
            evidence += [trade.evidence(r.n, responseDelayMs=trade.time-e.time) for e, trade in own_responses]
            return found(f"R{r.n}: Reyna foi primeira vítima={first_death}; {len(own_responses)} mortes aliadas respondidas na janela de {cfg['tradeWindowMs']} ms.", evidence)
        return Finding()
    if tip == 19:
        entry = ctx.dictionary.get('agentes', {}).get(match.players[pid].get('characterId', '').lower(), {})
        if entry.get('classe') not in ('Controller', 'Sentinel', 'Initiator'):
            return unavailable("Fora do recorte declarado de controlador/sentinela/iniciador.", applicable=False)
        changed = [e for e in kills if e.data.get('finishingDamage', {}).get('damageType') == 'Weapon'
                   and own['weapon'] and e.data.get('finishingDamage', {}).get('damageItem')
                   and ctx.name('armas', own['weapon']) and ctx.name('armas', e.data['finishingDamage']['damageItem'])
                   and e.data['finishingDamage']['damageItem'].lower() != own['weapon'].lower()]
        if changed:
            assists = sum(pid in e.data.get('assistants', []) for e in r.combat)
            return found(f"R{r.n}: {len(changed)} finalizações com arma diferente da registrada no equipamento; {assists} assistências no pistol. Não identifica pickup ou compra de utilidade.", ev + [e.evidence(r.n, finishingWeapon=e.data['finishingDamage']['damageItem'], assists=assists) for e in changed])
        return Finding()
    names = {16: {'Ghost', 'Frenzy'}, 20: {'Sheriff'}, 21: {'Classic'}}[tip]
    eligible = [e for e in kills if e.data.get('finishingDamage', {}).get('damageType') == 'Weapon' and ctx.name('armas', e.data['finishingDamage'].get('damageItem')) in names]
    if not eligible:
        return unavailable("Nenhuma finalização com a arma do recorte.", applicable=False)
    measured = []
    for e in eligible:
        a, b = e.position(pid), e.position(e.data['victim'])
        if a and b and (tip != 21 or isinstance(e.data['finishingDamage'].get('isSecondaryFireMode'), bool)):
            measured.append(e.evidence(r.n, weapon=ctx.name('armas', e.data['finishingDamage']['damageItem']), distanceUnits=round(distance(a, b), 4), secondary=e.data['finishingDamage'].get('isSecondaryFireMode')))
    if not measured:
        return unavailable("Coordenadas ou modo de disparo ausentes nas finalizações elegíveis.")
    if tip == 20:
        damage = r.stats[pid].get('damage')
        if ctx.match.shared.damage(r.source, pid) is None:
            return unavailable("Acertos agregados do pistol ausentes.")
        for i, d in enumerate(damage):
            if match.team(d['receiver']) == team: continue
            ev.append({"roundNumber": r.n, "sourcePath": f"{r.stat_paths[pid]}/damage/{i}", "values": {k: d[k] for k in ('headshots', 'bodyshots', 'legshots')}})
    reasons = ["Algumas finalizações sem coordenadas/modo foram excluídas."] if len(measured) < len(eligible) else []
    return found(f"R{r.n}: {len(measured)} finalizações de {', '.join(sorted(names))} com distância em unidades brutas; consultar evidências por arma/modo. Acertos agregados permanecem separados das kills.", ev + measured, reasons)
