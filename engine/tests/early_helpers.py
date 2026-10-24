from copy import deepcopy

from engine.context import Context as SharedContext
from engine.config import Config
from engine.detectors.early.bridge import prepare
from engine.tests.test_engine import IDS


def identifier(group, name):
    return next(k for k, v in IDS[group].items() if v['nome'] == name)


def fixture(count=4):
    players = [{'puuid': f'{team}{i}', 'teamId': team, 'characterId': identifier('agentes', 'Reyna' if i == 0 else 'Omen'), 'isObserver': False} for team in ('A', 'B') for i in range(5)]
    rounds = []
    for n in range(count):
        rounds.append({'roundNum': n, 'winningTeam': 'B', 'winningTeamRole': 'Defender', 'roundResult': 'Eliminated', 'roundResultCode': 'Elimination', 'bombPlanter': '', 'bombDefuser': '', 'plantRoundTime': 0, 'defuseRoundTime': 0,
                       'playerStats': [{'puuid': p['puuid'], 'kills': [], 'damage': [], 'economy': {'loadoutValue': 4500, 'spent': 2500, 'remaining': 500, 'weapon': identifier('armas', 'Ghost'), 'armor': ''}} for p in players]})
    return {'matchInfo': {'matchId': 'synthetic', 'mapId': 'test', 'gameMode': '/Game/GameModes/Bomb/BombGameMode.BombGameMode_C'}, 'players': players, 'roundResults': rounds}


def stat(raw, rn, pid):
    return next(s for s in raw['roundResults'][rn-1]['playerStats'] if s['puuid'] == pid)


def econ(raw, rn, pid, **kwargs):
    stat(raw, rn, pid)['economy'].update(kwargs)


def kill(raw, rn, killer, victim, time, *, x=0, weapon='Ghost', secondary=False, kind='Weapon'):
    r = raw['roundResults'][rn-1]
    killed = {k['victim'] for s in r['playerStats'] for k in s['kills'] if k['timeSinceRoundStartMillis'] <= time}
    event = {'killer': killer, 'victim': victim, 'timeSinceRoundStartMillis': time, 'timeSinceGameStartMillis': rn*100000+time, 'assistants': [], 'victimLocation': {'x': x+100, 'y': 0}, 'finishingDamage': {'damageType': kind, 'damageItem': identifier('armas', weapon) if kind == 'Weapon' else '', 'isSecondaryFireMode': secondary}, 'playerLocations': [{'puuid': p['puuid'], 'location': {'x': x, 'y': 0}, 'viewRadians': 0} for p in raw['players'] if p['puuid'] not in killed and p['puuid'] != victim]}
    stat(raw, rn, killer)['kills'].append(event)
    return event


def plant(raw, rn, time=1500):
    raw['roundResults'][rn-1].update(bombPlanter='A0', plantRoundTime=time, plantSite='A', plantLocation={'x': 0, 'y': 0}, plantPlayerLocations=[])


def geometry():
    return {'test': {'version': 'synthetic-1', 'source': 'Somente fixture sintética; não usar em mapas reais.', 'regions': [
        {'id': 'front', 'polygon': [[-1000,-1000],[999,-1000],[999,1000],[-1000,1000]], 'tags': ['advanced:Attacker', 'retake_front:A']},
        {'id': 'back', 'polygon': [[1000,-1000],[3000,-1000],[3000,1000],[1000,1000]], 'tags': ['fallback:A']}]}}


def context(raw, maps=False, **overrides):
    cfg = Config.from_dict({'early': ({'maps': geometry()} | overrides) if maps else overrides})
    shared = SharedContext(deepcopy(raw), IDS)
    return prepare(shared, cfg)


PLAYER = {'kind': 'player', 'teamId': 'A', 'playerId': 'A0'}
TEAM = {'kind': 'team', 'teamId': 'A'}
