"""Adapt the supplied 001–038 rules to the ONE shared parser and opportunity ledger.

Views expose the colleague's rule API without re-parsing, renumbering, deduplicating
events or copying their pipeline/schema/priority implementation.
"""
from ...context import number, point, snapshot_position, player_target, team_target
from ..middle_facts import facts
from .common import Context as RuleContext, TEAM, MATCH_PERIOD, MEASURED, LIMITS, unavailable
from .configuration import configuration
from . import evaluate_tip

GEOMETRY_TIPS = {24, 27, 28, 29, 31, 32, 34, 36, 38}
LIFE_TIPS = {6, 17, 18, 23, 24, 25, 26, 27, 29, 30, 31, 33, 34, 35, 37, 38}


class EventView:
    def __init__(self, data, path, time, event_id=None, kind="kill"):
        self.data, self.path, self.time, self.id, self.kind = data, path, time, event_id, kind

    def evidence(self, round_number, **values):
        result = {"roundNumber": round_number, "sourcePath": self.path, "values": {"timeMs": self.time, **values}}
        if self.id: result["eventId"] = self.id
        return result

    def position(self, pid):
        if self.kind == "kill" and self.data.get("victim") == pid:
            pos = self.data.get("victimLocation")
            return pos if point(pos) else None
        sample = snapshot_position(self.data.get("playerLocations"), pid)
        return sample["location"] if sample else None


class MatchView:
    def __init__(self, shared):
        self.shared, self.raw, self.players, self.teams = shared, shared.raw, shared.players, shared.teams
        self.id = (shared.raw.get("matchInfo") or {}).get("matchId")
        self.map_id = (shared.raw.get("matchInfo") or {}).get("mapId")
        self.rounds = [RoundView(self, r) for r in shared.rounds]

    def team(self, pid): return self.shared.team(pid)


class RoundView:
    def __init__(self, match, source):
        self.match, self.source, self.raw = match, source, source.raw
        self.n, self.index, self.path = source.number, source.index, source.path
        self.winner = source.raw.get("winningTeam")
        self.roles = {team: side for team in match.teams if (side := source.side(team)) is not None}
        self.stats, self.stat_paths = source.stats, source.stat_paths
        self.feed_complete = source.kills_complete and all(
            k.victim in match.players and (k.damage_type not in ("Weapon", "Ability") or k.killer in match.players)
            for k in source.kills)
        self.kills = [EventView(k.raw, k.path, k.time, k.event_id) for k in source.kills]
        self.events = list(self.kills)
        self.end = source.defuse_time
        for kind, timestamp in (("plant", source.plant_time), ("defuse", source.defuse_time)):
            if timestamp is not None:
                key = f"{kind}PlayerLocations"
                self.events.append(EventView({"playerLocations": self.raw.get(key)}, self.path + "/" + key, timestamp, kind=kind))
        self.events.sort(key=lambda e: e.time)
        self.active = [e for e in self.kills if self.end is None or e.time < self.end]
        combat_ids = {id(k.raw) for k in match.shared.combat(source)}
        self.combat = [e for e in self.active if id(e.data) in combat_ids]
        self.state = facts(match.shared, source)
        self.ambiguous_lives = not self.state.valid_state
        opening = match.shared.opening(source)
        self.opening = next((e for e in self.combat if e.data is opening[0].raw), None) if len(opening) == 1 else None

    def evidence(self, **values): return {"roundNumber": self.n, "sourcePath": self.path, "values": values}
    def econ_evidence(self, pid):
        return {"roundNumber": self.n, "sourcePath": self.stat_paths[pid] + "/economy", "values": self.economy(pid)}

    def economy(self, pid):
        eco = self.stats.get(pid, {}).get("economy")
        if not isinstance(eco, dict) or not all(number(eco.get(k)) for k in ("loadoutValue", "spent", "remaining")): return None
        return {**{k: eco[k] for k in ("loadoutValue", "spent", "remaining")},
                **{k: eco.get(k) if isinstance(eco.get(k), str) else None for k in ("weapon", "armor")}}

    def death(self, pid, after=-1): return next((e for e in self.active if e.data["victim"] == pid and e.time > after), None)
    def response(self, death, window):
        return next((e for e in self.combat if 0 < e.time-death.time <= window
                     and e.data["victim"] == death.data.get("killer") and e.data["killer"] != death.data["victim"]
                     and self.match.team(e.data["killer"]) == self.match.team(death.data["victim"])), None)

    def simultaneous_response(self, death):
        return any(e.time == death.time and e.data["victim"] == death.data.get("killer")
                   and self.match.team(e.data["killer"]) == self.match.team(death.data["victim"]) for e in self.combat)

    def observed_until(self): return max((e.time for e in self.events if self.end is None or e.time <= self.end), default=0)
    def window_complete(self, event, window):
        return self.feed_complete and (self.end is not None and self.end > event.time or self.observed_until() >= event.time+window)
    def living(self, time):
        return set().union(*self.state.at(time).values()) if self.feed_complete and not self.ambiguous_lives else None

    def next_sample(self, event, pid):
        return next((e for e in self.events if e.time > event.time and (self.end is None or e.time <= self.end)
                     and e.position(pid) is not None
                     and not any(d.data["victim"] == pid and event.time < d.time < e.time for d in self.kills)), None)


def rule_targets(shared, tip):
    if tip in TEAM or tip == 25:
        for team in shared.teams: yield team_target(team)
    if tip not in TEAM:
        for pid in sorted(shared.players): yield player_target(shared, pid)


def prepare(shared, cfg):
    return RuleContext(MatchView(shared), configuration(cfg.early), shared.ids)


def evaluate(shared, report, cfg):
    ctx = prepare(shared, cfg)
    is_bomb = "BombGameMode" in str((shared.raw.get("matchInfo") or {}).get("gameMode", ""))
    for tip in range(1, 39):
        tid = f"{tip:03}"
        limits = [LIMITS["economy" if tip <= 14 else "pistol" if tip <= 22 else "position"]]
        if tip in LIFE_TIPS: limits += ["Estado de vida inferido; ausência de evento de ressurreição não comprova ausência de retornos."]
        if tip in GEOMETRY_TIPS and ctx.geometry:
            limits += [f"Geometria {ctx.geometry['version']}; fonte: {ctx.geometry['source']}."]
        for target in rule_targets(shared, tip):
            for r in ctx.match.rounds:
                if 15 <= tip <= 22 and not is_bomb:
                    finding = unavailable("Modo Bomb não identificado; não presumir pistols por número do round.")
                elif tip in LIFE_TIPS and r.ambiguous_lives:
                    finding = unavailable("Feed incompleto, vítima repetida ou retorno detectável: sequência de vidas ambígua.")
                elif r.raw.get("bombPlanter") and r.source.plant_time is None and tip in (5, 22, 28, 38):
                    finding = unavailable("Plant registrado sem timestamp válido.")
                elif r.winner not in shared.teams:
                    finding = unavailable("Vencedor do round ausente ou desconhecido.")
                else:
                    finding = evaluate_tip(tip, ctx, r, target)
                participants = {target["playerId"]} if target["kind"] == "player" else set()
                for ev in finding.evidence:
                    participants.update(v for v in ev["values"].values() if isinstance(v, str) and v in shared.players)
                related = sorted({ev["roundNumber"] for ev in finding.evidence}) or [r.n]
                report.record(tid, target, r.source, key=r.n, eligible=finding.applicable,
                    evaluated=finding.available, flagged=finding.available and finding.applicable and finding.flagged,
                    observation=finding.observation, evidence=finding.evidence, participants=participants,
                    match_only=tip in MATCH_PERIOD, rounds=related if tip in MATCH_PERIOD else [r.n],
                    basis="measured" if tip in MEASURED else "inferred",
                    partial=bool(finding.reasons) or tip not in MEASURED, reason="; ".join(finding.reasons) or None,
                    extra_limits=[*limits, *finding.reasons],
                    parameters={k: v for k, v in ctx.cfg.items() if k != "maps"} | {
                        "geometryVersion": ctx.geometry["version"] if ctx.geometry else None,
                        "opportunity": "one anchor round per target; evidence rows do not increase denominator"})
