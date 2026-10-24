"""Normalize source pointers, identities, event ordering and shared facts once."""
from dataclasses import dataclass, field
from math import isfinite, hypot


def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and isfinite(value) and value >= 0


def point(value):
    return isinstance(value, dict) and all(isinstance(value.get(k), (int, float)) and not isinstance(value[k], bool) and isfinite(value[k]) for k in ("x", "y"))


def distance(a, b):
    return hypot(a["x"] - b["x"], a["y"] - b["y"])


@dataclass
class Kill:
    raw: dict
    time: float
    path: str
    event_id: str | None = None

    @property
    def killer(self): return self.raw.get("killer")
    @property
    def victim(self): return self.raw.get("victim")
    @property
    def damage_type(self): return (self.raw.get("finishingDamage") or {}).get("damageType")
    @property
    def item(self): return str((self.raw.get("finishingDamage") or {}).get("damageItem") or "").lower()
    @property
    def victim_position(self): return self.raw.get("victimLocation")

    def position(self, player):
        return snapshot_position(self.raw.get("playerLocations"), player)


def snapshot_position(entries, player):
    matches = [e for e in entries or [] if isinstance(e, dict) and e.get("puuid") == player]
    if len(matches) != 1 or not point(matches[0].get("location")):
        return None
    return matches[0]


@dataclass
class Round:
    raw: dict
    index: int
    number: int
    stats: dict = field(default_factory=dict)
    stat_paths: dict = field(default_factory=dict)
    kills: list[Kill] = field(default_factory=list)
    kills_complete: bool = True
    snapshots: list = field(default_factory=list)

    @property
    def path(self): return f"/roundResults/{self.index}"
    @property
    def plant_time(self):
        value = self.raw.get("plantRoundTime")
        return value if self.raw.get("bombPlanter") and number(value) else None
    @property
    def defuse_time(self):
        value = self.raw.get("defuseRoundTime")
        return value if self.raw.get("bombDefuser") and number(value) else None

    def active(self, kill):
        # No invented detonation timer or generic end-of-round timestamp.
        return self.defuse_time is None or kill.time < self.defuse_time

    def side(self, team):
        winner, role = self.raw.get("winningTeam"), self.raw.get("winningTeamRole")
        if not winner or role not in ("Attacker", "Defender"):
            return None
        return role if team == winner else ("Defender" if role == "Attacker" else "Attacker")


class Context:
    def __init__(self, raw: dict, ids: dict, abilities: dict | None = None):
        if not isinstance(raw, dict) or not isinstance(raw.get("players"), list) or not isinstance(raw.get("roundResults"), list):
            raise ValueError("Expected an original match JSON with players and roundResults")
        self.raw, self.ids = raw, ids
        self.abilities = (abilities or {}).get("agents", {})
        self.players, self.player_paths = {}, {}
        for i, player in enumerate(raw["players"]):
            if not isinstance(player, dict): raise ValueError("Invalid player")
            if player.get("isObserver"): continue
            uid = player.get("puuid")
            if not isinstance(uid, str) or not uid or uid in self.players or not player.get("teamId"):
                raise ValueError("Invalid or duplicate player identity")
            self.players[uid] = player
            self.player_paths[uid] = f"/players/{i}"
        if not self.players: raise ValueError("No participating players")
        self.teams = sorted({p["teamId"] for p in self.players.values()})
        if len(self.teams) != 2: raise ValueError("Expected two participating teams")
        self.rounds, numbers = [], set()
        for i, data in enumerate(raw["roundResults"]):
            n = data.get("roundNum") if isinstance(data, dict) else None
            if not isinstance(n, int) or isinstance(n, bool) or n < 0 or n in numbers:
                raise ValueError("Invalid or duplicate roundNum")
            numbers.add(n)
            r = Round(data, i, n + 1)
            stats = data.get("playerStats")
            if not isinstance(stats, list):
                stats, r.kills_complete = [], False
            for j, stat in enumerate(stats):
                if not isinstance(stat, dict):
                    r.kills_complete = False
                    continue
                uid = stat.get("puuid")
                if uid in r.stats: raise ValueError("Duplicate playerStats in a round")
                if uid in self.players:
                    r.stats[uid] = stat
                    r.stat_paths[uid] = f"{r.path}/playerStats/{j}"
                kills = stat.get("kills")
                if not isinstance(kills, list):
                    r.kills_complete = False
                    continue
                for k, kill in enumerate(kills):
                    if not isinstance(kill, dict) or not number(kill.get("timeSinceRoundStartMillis")):
                        r.kills_complete = False
                        continue
                    r.kills.append(Kill(kill, kill["timeSinceRoundStartMillis"], f"{r.path}/playerStats/{j}/kills/{k}"))
            if set(r.stats) != set(self.players): r.kills_complete = False
            r.kills.sort(key=lambda k: k.time)  # Python sort preserves source order for ties.
            for k, kill in enumerate(r.kills):
                if r.kills_complete: kill.event_id = f"r{r.number}-k{k}"
                r.snapshots.append((kill.time, kill.raw.get("playerLocations"), kill.path + "/playerLocations"))
            for actor, time, key in (("bombPlanter", r.plant_time, "plantPlayerLocations"), ("bombDefuser", r.defuse_time, "defusePlayerLocations")):
                if data.get(actor) and time is not None:
                    r.snapshots.append((time, data.get(key), f"{r.path}/{key}"))
            r.snapshots.sort(key=lambda s: s[0])
            self.rounds.append(r)
        self.rounds.sort(key=lambda r: r.number)
        if not self.rounds: raise ValueError("No rounds")

    def team(self, uid): return self.players.get(uid, {}).get("teamId")
    def roster(self, team): return [uid for uid in self.players if self.team(uid) == team]
    def agent(self, uid):
        key = str(self.players.get(uid, {}).get("characterId") or "").lower()
        return self.ids.get("agentes", {}).get(key, {})
    def weapon(self, item): return self.ids.get("armas", {}).get(str(item or "").lower(), {}).get("nome")
    def opponent(self, kill):
        return bool(self.team(kill.killer) and self.team(kill.victim) and self.team(kill.killer) != self.team(kill.victim) and kill.damage_type not in ("Bomb", "Fall", "Crush"))
    def combat(self, r): return [k for k in r.kills if r.active(k) and self.opponent(k)]
    def opening(self, r):
        kills = self.combat(r)
        return [k for k in kills if k.time == kills[0].time] if kills and r.kills_complete else []
    def repeated_death(self, r, uid): return sum(k.victim == uid for k in r.kills) > 1

    def damage(self, r, uid):
        rows = r.stats.get(uid, {}).get("damage")
        if not isinstance(rows, list): return None
        result = {"headshots": 0, "bodyshots": 0, "legshots": 0, "damage": 0}
        for row in rows:
            if not isinstance(row, dict) or row.get("receiver") not in self.players: return None
            if self.team(row["receiver"]) == self.team(uid): continue
            if not all(number(row.get(key)) for key in result): return None
            for key in result: result[key] += row[key]
        result["hits"] = sum(result[key] for key in ("headshots", "bodyshots", "legshots"))
        return result

    def contribution(self, r, uid, window):
        if not r.kills_complete: return None
        combat = self.combat(r)
        if any(not isinstance(k.raw.get("assistants"), list) for k in combat): return None
        kills = sum(k.killer == uid for k in combat)
        assists = sum(uid in k.raw["assistants"] for k in combat)
        trades = sum(any(t.killer == uid and t.victim == k.killer and 0 < t.time - k.time <= window for t in combat) for k in combat if self.team(k.victim) == self.team(uid) and k.victim != uid)
        return {"kills": kills, "assists": assists, "trades": trades,
                "deaths": sum(k.victim == uid for k in r.kills if r.active(k)),
                "plant": int(r.raw.get("bombPlanter") == uid), "defuse": int(r.raw.get("bombDefuser") == uid)}


def evidence(r, path, values, kill=None):
    result = {"roundNumber": r.number, "sourcePath": path, "values": values}
    if kill and kill.event_id: result["eventId"] = kill.event_id
    return result


def player_target(ctx, uid): return {"kind": "player", "teamId": ctx.team(uid), "playerId": uid}
def team_target(team): return {"kind": "team", "teamId": team}
