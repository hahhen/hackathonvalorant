"""Shared, bounded facts adapted from the supplied 39a80.py, not its parser/output.

No paths, visibility, calls, pressure, revives or defuse attempts are fabricated.
Equal-time deaths are applied as a batch, never as artificial intermediate clutches.
"""
from itertools import groupby
from ..context import evidence, point, distance, snapshot_position, team_target, player_target

SPATIAL_LIMIT = "Amostras isoladas em unidades brutas; não comprovam região, rota, cobertura, visão, intenção ou causa."
STATE_LIMIT = "Vivos inferidos do feed; retornos/ressurreições podem não estar registrados. Não há horário geral de fim do round."
STATE_TIPS = {"055", "058", "064", "065", "071", "073", "074", "075", "078", "079"}
BLOCKED = {
    "045": "Faltam regiões avançadas anotadas e progressão pelo espaço liberado.",
    "048": "Falta classificação de região/rota para comparar confrontos e mudanças entre rounds.",
    "060": "Faltam regiões de plant protegido/exposto e informação disponível ao planter.",
    "068": "Faltam perímetro do site, linhas de visão e efeitos de utilidade.",
    "069": "Faltam regiões de ligação e controle por portas/utilidade.",
    "076": "Faltam geometria 3D, regiões e bloqueios para avaliar proteção das costas.",
    "077": "Amostras de posição não identificam padrão percebido nem adaptação ao mesmo adversário.",
}


def targets(ctx):
    return [(team_target(t), ctx.roster(t)) for t in ctx.teams] + [(player_target(ctx, p), [p]) for p in ctx.players]


def outcome(r):
    """Only known source labels; no substring guesses or timer constants."""
    labels = {str(r.raw.get(k) or "").strip().casefold() for k in ("roundResult", "roundResultCode")}
    for kind, accepted in {
        "detonation": {"bomb detonated", "detonate"}, "defuse": {"bomb defused", "defuse"},
        "timeout": {"round timer expired", "timer"}, "elimination": {"eliminated", "elimination"},
    }.items():
        if labels & accepted: return kind
    return None


def positions(ctx, entries):
    return {p: s["location"] for p in ctx.players if (s := snapshot_position(entries, p))}


def spread(points):
    pts = list(points.values())
    return max((distance(a, b) for i, a in enumerate(pts) for b in pts[i + 1:]), default=None)


def ally_distance(ctx, k, uid):
    origin = k.victim_position if k.victim == uid else (k.position(uid) or {}).get("location")
    if not point(origin): return None
    samples = positions(ctx, k.raw.get("playerLocations"))
    lengths = [distance(origin, p) for pid, p in samples.items() if pid != uid and ctx.team(pid) == ctx.team(uid)]
    return min(lengths) if lengths else None


def transitions(ctx, r, uid, start=None):
    """Strictly later same-life snapshots; no interpolation or reused victim facing."""
    samples = [(t, s["location"], path) for t, entries, path in r.snapshots
               if (start is None or t >= start) and (r.defuse_time is None or t < r.defuse_time)
               and (s := snapshot_position(entries, uid))]
    for a, b in zip(samples, samples[1:]):
        if b[0] <= a[0] or any(k.victim == uid and a[0] <= k.time <= b[0] for k in r.kills): continue
        yield a, b, distance(a[1], b[1])


class Facts:
    def __init__(self, ctx, r):
        self.ctx, self.r = ctx, r
        self.combat = ctx.combat(r)
        self.planter = r.raw.get("bombPlanter")
        self.plant_team = ctx.team(self.planter)
        self.plant_positions = positions(ctx, r.raw.get("plantPlayerLocations"))
        self.states = []
        self.valid_state = r.kills_complete
        alive = {team: set(ctx.roster(team)) for team in ctx.teams}
        self.initial = {team: set(ids) for team, ids in alive.items()}
        active = [k for k in r.kills if r.active(k)]
        # A bomb death is an upper boundary for pre-detonation alive-state analysis.
        bomb_time = min((k.time for k in active if k.damage_type == "Bomb"), default=None)
        self.bomb_time = bomb_time
        for time, batch in groupby(active, key=lambda k: k.time):
            if bomb_time is not None and time >= bomb_time: break
            batch = list(batch)
            before = {team: set(ids) for team, ids in alive.items()}
            victims = [k.victim for k in batch]
            if len(set(victims)) != len(victims): self.valid_state = False
            for k in batch:
                team = ctx.team(k.victim)
                if team is None or k.victim not in before.get(team, set()): self.valid_state = False
                if ctx.team(k.killer) and k.killer not in before[ctx.team(k.killer)]: self.valid_state = False
                if team: alive[team].discard(k.victim)
            self.states.append((time, before, {team: set(ids) for team, ids in alive.items()}, batch))
        # Any repeated death, including a late event, makes resurrection timing ambiguous.
        if any(ctx.repeated_death(r, uid) for uid in ctx.players): self.valid_state = False
        # Dead participants appearing alive later expose an unrecorded return.
        for time, entries, _ in r.snapshots:
            if (r.defuse_time is not None and time >= r.defuse_time) or (bomb_time is not None and time >= bomb_time): continue
            state = self.at(time, inclusive=False)
            for uid in positions(ctx, entries):
                if uid not in state[ctx.team(uid)] and not any(k.victim == uid and k.time == time for k in r.kills):
                    self.valid_state = False

    def at(self, time, inclusive=False):
        state = self.initial
        for t, _, after, _ in self.states:
            if t < time or (inclusive and t == time): state = after
            else: break
        return state

    def clutches(self, team):
        enemy = next(t for t in self.ctx.teams if t != team)
        entries, seen = [], set()
        for time, _, after, batch in self.states:
            if len(after[team]) != 1 or not after[enemy]: continue
            uid = next(iter(after[team]))
            if uid in seen: continue
            seen.add(uid)
            entries.append((uid, time, len(after[enemy]), batch))
        return entries


def emit(report, tip, target, r, *, eligible=True, usable=True, values=None, observation="",
         ev=None, participants=(), partial=True, reason=None, flag=None, parameters=None):
    """One round opportunity; detailed measurements are evidence, not extra occurrences."""
    flagged = eligible is True and usable and (bool(values or ev) if flag is None else flag)
    report.record(tip, target, r, eligible=eligible, evaluated=usable, flagged=flagged,
                  observation=observation, evidence=ev if ev is not None else ([evidence(r, r.path, values)] if values else []),
                  participants=participants, partial=partial, reason=reason, parameters=parameters,
                  basis="inferred" if tip in STATE_TIPS else "measured")


def blocked(report, tip, target, r, eligible=True):
    emit(report, tip, target, r, eligible=eligible, usable=False, reason=BLOCKED[tip])


def facts(ctx, r):
    cache = getattr(ctx, "_middle_facts", None)
    if cache is None: ctx._middle_facts = cache = {}
    if r.index not in cache: cache[r.index] = Facts(ctx, r)
    return cache[r.index]
