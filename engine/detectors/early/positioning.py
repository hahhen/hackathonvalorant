from .common import Finding, unavailable, found, distance, equipment_class


def positioning(tip, ctx, r, target):
    cfg, match = ctx.cfg, ctx.match
    pid, team = target.get('playerId'), target['teamId']
    if not r.feed_complete:
        return unavailable("Feed incompleto; não é seguro avaliar sequência/ausência de resposta.")
    if tip in (24, 27, 28, 29, 31, 32, 34, 36, 38) and not ctx.geometry:
        return unavailable("Geometria versionada do mapa desta partida não cadastrada.")
    if tip in (25, 27, 29, 31, 35) and r.ambiguous_lives:
        return unavailable("Vítima repetida ou reaparição após morte: estado de vida ambíguo.")
    if tip == 25:
        op = r.opening
        if op is None:
            return unavailable("Primeira eliminação ausente ou simultânea.")
        if match.team(op.data['killer']) != team or (pid and op.data['killer'] != pid):
            return unavailable("Destinatário não obteve a primeira eliminação.", applicable=False)
        death = r.death(op.data['killer'], op.time)
        evidence = [op.evidence(r.n, killer=op.data['killer'], victim=op.data['victim']), r.evidence(winningTeam=r.winner, opener=op.data['killer'])]
        if death:
            evidence.append(death.evidence(r.n, victim=op.data['killer'], delayMs=death.time-op.time))
        if r.winner != team or (death and death.time - op.time <= cfg['followupWindowMs']):
            return found(f"R{r.n}: primeira eliminação do time; vitória={r.winner == team}; " + (f"autor morreu {death.time-op.time} ms depois." if death else "nenhuma morte posterior do autor registrada na disputa observada."), evidence)
        if not r.window_complete(op, cfg['followupWindowMs']):
            return unavailable("Janela pós-abertura censurada.")
        return Finding()
    own_kills = [e for e in r.combat if e.data['killer'] == pid]
    own_deaths = [e for e in r.combat if e.data['victim'] == pid]
    relevant = [e for e in r.combat if pid in (e.data['killer'], e.data['victim'])]
    snippets, observations, missing = [], [], []

    def add_pair(a, b, **values):
        pa, pb = a.position(pid), b.position(pid)
        snippets.extend([a.evidence(r.n, playerId=pid, x=pa['x'], y=pa['y']), b.evidence(r.n, playerId=pid, x=pb['x'], y=pb['y'], delayMs=b.time-a.time, distanceUnits=round(distance(pa, pb), 4), **values)])

    if tip in (23, 26, 35, 38):
        candidates = own_kills
        if tip == 35:
            candidates = []
            for e in own_kills:
                living = r.living(e.time)
                if living is not None and sum(match.team(p) == team for p in living) == 1 and sum(match.team(p) != team for p in living) >= 2:
                    candidates.append(e)
            candidates = candidates[:1]  # Uma entrada de clutch por round.
        if tip == 38:
            if r.roles.get(team) != 'Attacker' or not r.raw.get('bombPlanter'):
                return unavailable("Sem afterplant atacante aplicável.", applicable=False)
            candidates = [e for e in own_kills if e.time > r.raw['plantRoundTime']]
        if not candidates:
            return unavailable("Nenhuma kill elegível neste recorte.", applicable=False)
        for e in candidates:
            nxt = (next((k for k in own_kills if k.time > e.time), None) if tip == 26 else r.next_sample(e, pid))
            if not e.position(pid) or nxt is None or not nxt.position(pid):
                missing.append("Sem duas amostras válidas para todas as kills elegíveis.")
                continue
            if tip == 38:
                start, end = ctx.region(e.position(pid)), ctx.region(nxt.position(pid))
                site = r.raw.get('plantSite')
                if not start or not end:
                    missing.append("Região não classificada/ambígua.")
                    continue
                if not any(tag in start.get('tags', []) for tag in (f'retake_front:{site}', f'site_edge:{site}')) or f'fallback:{site}' not in end.get('tags', []):
                    continue
                # Não tratar a própria morte como recuo intencional observado.
                if nxt.kind == 'kill' and nxt.data.get('victim') == pid:
                    continue
                snippets.append(r.evidence(plantRoundTime=r.raw['plantRoundTime'], plantSite=site, winningTeam=r.winner, geometryVersion=ctx.geometry['version']))
            moved = distance(e.position(pid), nxt.position(pid))
            add_pair(e, nxt, sampledDisplacementBelowThreshold=moved < cfg['movementMinUnits'], nextEventIsDeath=nxt.kind == 'kill' and nxt.data.get('victim') == pid)
            observations.append(f"{e.time}→{nxt.time} ms: deslocamento amostrado {moved:.1f} unidades")
    elif tip in (24, 29):
        candidates = own_kills if tip == 24 else ([r.opening] if r.opening and r.opening.data['killer'] == pid else [])
        if not candidates:
            return unavailable("Nenhuma abertura/kill individual elegível.", applicable=False)
        for e in candidates:
            reg = ctx.region(e.position(pid))
            if not reg:
                missing.append("Posição sem região classificada.")
                continue
            if tip == 29 and f"advanced:{r.roles.get(team, '')}" not in reg.get('tags', []):
                continue
            death = r.death(pid, e.time)
            if death and death.time - e.time <= cfg['followupWindowMs']:
                snippets.extend([e.evidence(r.n, region=reg['id'], agent=ctx.agent(pid)), death.evidence(r.n, victim=pid, delayMs=death.time-e.time)])
                observations.append(f"kill na região {reg['id']} seguida de morte em {death.time-e.time} ms")
            elif not r.window_complete(e, cfg['followupWindowMs']):
                missing.append("Janela pós-kill censurada.")
    elif tip in (27, 30, 34, 37):
        if not own_deaths:
            return unavailable("Nenhuma morte entre adversários elegível.", applicable=False)
        for death in own_deaths:
            if tip != 27 and r.simultaneous_response(death):
                missing.append('Resposta no mesmo timestamp: ordem causal da troca ambígua.')
                continue
            response = r.response(death, cfg['tradeWindowMs'])
            if tip != 27 and response is None and not r.window_complete(death, cfg['tradeWindowMs']):
                missing.append("Janela de resposta censurada.")
                continue
            pos = death.position(pid)
            if pos is None:
                missing.append("Coordenada da vítima ausente.")
                continue
            positions = {p: death.position(p) for p in match.players if p != pid}
            living = r.living(death.time)
            # A vítima some no próprio snapshot; os demais vivos precisam constar.
            if living is None or any(positions.get(p) is None for p in living - {pid}):
                missing.append("Snapshot/estado de vivos incompleto para proximidade.")
                continue
            nearby = [p for p in living - {pid} if positions[p] is not None and distance(pos, positions[p]) <= cfg['nearbyUnits']]
            allies = [p for p in nearby if match.team(p) == team]
            enemies = [p for p in nearby if match.team(p) != team]
            flag = tip == 37  # Desfecho descritivo de troca, inclusive respostas.
            if tip == 27:
                reg = ctx.region(pos)
                if not reg:
                    missing.append("Região da morte não classificada.")
                    continue
                flag = len(enemies) >= 2
            if tip == 30:
                flag = response is None and not allies
            if tip == 34:
                regions = {ctx.region(positions[p])['id'] for p in enemies if ctx.region(positions[p])}
                sources = [(p, i, d) for p, stat in r.stats.items() for i, d in enumerate(stat.get('damage', [])) if match.team(p) != team and d.get('receiver') == pid and d.get('damage', 0) > 0]
                flag = len(regions) >= 2 and len({p for p, _, _ in sources}) >= 2 and response is None
                if flag:
                    snippets += [{"roundNumber": r.n, "sourcePath": f"{r.stat_paths[p]}/damage/{i}", "values": {"attacker": p, "receiver": pid, "damage": d['damage']}} for p, i, d in sources]
            if flag:
                snippets.append(death.evidence(r.n, victim=pid, killer=death.data['killer'], nearbyAllies=len(allies), nearbyEnemies=len(enemies), responded=response is not None, x=pos['x'], y=pos['y']))
                if response:
                    snippets.append(response.evidence(r.n, responseDelayMs=response.time-death.time, killer=response.data['killer']))
                observations.append(f"morte aos {death.time} ms, aliados próximos={len(allies)}, adversários próximos={len(enemies)}, resposta na janela={response is not None}")
    elif tip == 28:
        if not relevant:
            return unavailable("Sem confronto individual amostrado.", applicable=False)
        for e in relevant:
            reg = ctx.region(e.position(pid))
            if not reg:
                missing.append("Região não classificada.")
                continue
            phase = 'postplant' if r.raw.get('bombPlanter') and e.time > r.raw['plantRoundTime'] else 'preplant'
            comparable = []
            for q in match.rounds:
                if q.roles.get(team) != r.roles.get(team) or not q.roles.get(team):
                    continue
                events = []
                for k in q.combat:
                    if match.team(k.data['killer']) != team:
                        continue
                    kphase = 'postplant' if q.raw.get('bombPlanter') and k.time > q.raw['plantRoundTime'] else 'preplant'
                    region = ctx.region(k.position(k.data['killer']))
                    if region and region['id'] == reg['id'] and phase == kphase:
                        events.append(k)
                if events:
                    comparable.append((q, events))
            if len(comparable) <= cfg['rareRegionMaxRounds']:
                snippets.append(e.evidence(r.n, region=reg['id'], sampledTeamRounds=len(comparable), side=r.roles.get(team), phase=phase, outcome='kill' if e.data['killer'] == pid else 'death'))
                snippets += [k.evidence(q.n, region=reg['id'], killer=k.data['killer'], victim=k.data['victim']) for q, events in comparable for k in events]
                observations.append(f"região {reg['id']} com kills aliadas em {len(comparable)} rounds comparáveis; raridade não comprova off-angle")
    elif tip == 31:
        if not relevant:
            return unavailable("Sem confronto individual amostrado.", applicable=False)
        for e in relevant:
            reg, living = ctx.region(e.position(pid)), r.living(e.time)
            if not reg or living is None:
                missing.append("Região/estado numérico indisponível.")
                continue
            a, b = sum(match.team(p) == team for p in living), sum(match.team(p) != team for p in living)
            snippets.append(e.evidence(r.n, region=reg['id'], alliesAliveBefore=a, enemiesAliveBefore=b, outcome='kill' if e.data['killer'] == pid else 'death'))
            observations.append(f"{reg['id']} em {a}v{b}, resultado do evento={'abate' if e.data['killer'] == pid else 'morte'}")
    elif tip == 32:
        first = next((e for e in r.events if (r.end is None or e.time <= r.end) and e.position(pid)), None)
        if first is None or not r.roles.get(team):
            return unavailable("Sem primeira aparição amostrada/lado conhecido.")
        reg = ctx.region(first.position(pid))
        if not reg:
            return unavailable("Primeira amostra fora das regiões cadastradas.")
        snippets.append(first.evidence(r.n, region=reg['id'], side=r.roles[team], firstSampleMs=first.time))
        observations.append(f"primeira aparição amostrada em {reg['id']} aos {first.time} ms; não é instante de chegada/contato")
    elif tip == 33:
        samples = [e for e in r.events if (r.end is None or e.time <= r.end) and e.position(pid)]
        if len(samples) < 2:
            return unavailable("Menos de duas amostras de posição.")
        for a, b in zip(samples, samples[1:]):
            if b.time - a.time >= cfg['staleSampleMs']:
                add_pair(a, b)
                observations.append(f"{b.time-a.time} ms sem nova amostra; deslocamento observado {distance(a.position(pid), b.position(pid)):.1f} unidades; informação disponível apenas ao analista")
    elif tip == 36:
        idx = match.rounds.index(r)
        if idx == 0 or not relevant:
            return unavailable("Sem confronto individual e round anterior.", applicable=False)
        current = relevant[0]
        reg = ctx.region(current.position(pid))
        if not reg or not r.roles.get(team):
            return unavailable("Região/lado do confronto indisponível.")
        consecutive = [(r, current)]
        for q in reversed(match.rounds[:idx]):
            if q.n != consecutive[-1][0].n - 1 or q.roles.get(team) != r.roles[team]:
                break
            first = next((k for k in q.combat if pid in (k.data['killer'], k.data['victim'])), None)
            old_reg = ctx.region(first.position(pid)) if first else None
            if not old_reg or old_reg['id'] != reg['id']:
                break
            consecutive.append((q, first))
        if len(consecutive) >= cfg['repeatMinRounds']:
            snippets += [e.evidence(q.n, region=reg['id'], outcome='kill' if e.data['killer'] == pid else 'death', won=q.winner == team) for q, e in reversed(consecutive)]
            observations.append(f"primeiro confronto amostrado na região {reg['id']} em {len(consecutive)} rounds consecutivos do mesmo lado")
    if snippets:
        return found(f"R{r.n}: " + '; '.join(observations) + '.', snippets, sorted(set(missing)))
    if missing:
        return unavailable('; '.join(sorted(set(missing))))
    return Finding()
