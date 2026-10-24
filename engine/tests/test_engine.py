import copy
import json
import unittest
from pathlib import Path

from engine import analyze_match
from engine.context import Context
from engine.runner import ROOT
from engine.schema import validate_structure
from engine.validate import validate_result
from engine.config import Config

IDS = json.loads((ROOT / "engine/data/valorant-ids.json").read_text(encoding="utf-8"))
CATALOG = json.loads((ROOT / "src/data/tactical-tips.json").read_text(encoding="utf-8"))
TIPS = {t["id"]: t for t in CATALOG["dicas"]}
OP = next(k for k, v in IDS["armas"].items() if v["nome"] == "Operator")
VANDAL = next(k for k, v in IDS["armas"].items() if v["nome"] == "Vandal")
CLASSIC = next(k for k, v in IDS["armas"].items() if v["nome"] == "Classic")
SOVA = next(k for k, v in IDS["agentes"].items() if v["nome"] == "Sova")
RAZE = next(k for k, v in IDS["agentes"].items() if v["nome"] == "Raze")


def position(uid, x=0, y=0, angle=0):
    return {"puuid": uid, "location": {"x": x, "y": y}, "viewRadians": angle}


def kill(killer="p", victim="q", time=1000, item=VANDAL, kind="Weapon", positions=None, x=0, y=0, assistants=None):
    return {"killer": killer, "victim": victim, "timeSinceRoundStartMillis": time,
            "finishingDamage": {"damageType": kind, "damageItem": item, "isSecondaryFireMode": False},
            "playerLocations": positions if positions is not None else [position(killer, -100, 0)],
            "victimLocation": {"x": x, "y": y}, "assistants": assistants or []}


def match(rounds=1):
    players = [{"puuid": uid, "teamId": team, "characterId": agent, "stats": {"roundsPlayed": rounds,
                "abilityCasts": {"grenadeCasts": 0, "ability1Casts": 0, "ability2Casts": 0, "ultimateCasts": 0}}}
               for uid, team, agent in [("p", "Red", SOVA), ("a", "Red", RAZE), ("q", "Blue", RAZE), ("b", "Blue", SOVA)]]
    return {"matchInfo": {"matchId": "synthetic-match", "gameMode": "/Game/GameModes/Bomb/BombGameMode.BombGameMode_C"},
            "players": players, "roundResults": [{"roundNum": i, "winningTeam": "Red", "winningTeamRole": "Attacker",
            "playerStats": [{"puuid": p["puuid"], "kills": [], "damage": [], "economy": {"weapon": CLASSIC, "armor": "", "loadoutValue": 0, "remaining": 800, "spent": 0}} for p in players]} for i in range(rounds)]}


def add(raw, event, r=0):
    owner = event["killer"] if event["killer"] in ("p", "q", "a", "b") else "p"
    next(s for s in raw["roundResults"][r]["playerStats"] if s["puuid"] == owner)["kills"].append(event)


def stat(raw, uid="p", r=0):
    return next(s for s in raw["roundResults"][r]["playerStats"] if s["puuid"] == uid)


def run(raw, **kwargs): return analyze_match(json.dumps(raw).encode(), "synthetic.json", **kwargs)
def records(result, tip, kind="occurrences", uid="p", period=None):
    detector = __import__("engine.report", fromlist=["DETECTORS"]).DETECTORS[tip]
    return [o for o in result[kind] if (o.get("tipId") == tip if kind == "recommendations" else o["detectorId"] == detector)
            and (uid is None or o["target"].get("playerId") == uid)
            and (period is None or o["period"]["kind"] == period)]


class EngineTests(unittest.TestCase):
    def test_original_example_schema(self):
        path = ROOT / "docs/internal/examples/analysis-result.example.json"
        if not path.exists(): self.skipTest("Internal handoff example not distributed")
        validate_result(json.loads(path.read_text(encoding="utf-8")), TIPS)

    def test_deterministic_and_four_scopes(self):
        raw = match()
        raw["roundResults"][0]["winningTeam"] = "Blue"
        add(raw, kill())
        add(raw, kill("b", "p", time=2000))
        result = run(raw)
        self.assertEqual(result, run(raw))
        self.assertEqual({(r["target"]["kind"], r["period"]["kind"]) for r in result["recommendations"]},
                         {("player", "round"), ("player", "match"), ("team", "round"), ("team", "match")})
        self.assertEqual(set(o["detectorId"] for o in result["coverage"]), set(__import__("engine.report", fromlist=["DETECTORS"]).DETECTORS.values()))

    def test_source_pointers_use_array_indices_and_rounds_sort(self):
        raw = match(2)
        raw["roundResults"][0]["roundNum"] = 24
        raw["roundResults"][0]["winningTeamRole"] = "Defender"
        add(raw, kill(kind="Ability", item="Ultimate"))
        raw["roundResults"][1]["roundNum"] = 0
        ctx = Context(raw, IDS)
        self.assertEqual([r.number for r in ctx.rounds], [1, 25])
        self.assertEqual(ctx.rounds[1].side("Red"), "Defender")
        occ = records(run(raw), "096")[0]
        self.assertEqual(occ["roundNumbers"], [25])
        self.assertEqual(occ["evidence"][0]["sourcePath"], "/roundResults/0/playerStats/0/kills/0")
        self.assertEqual(occ["evidence"][0]["eventId"], "r25-k0")

    def test_coverage_without_occurrence_and_zero_damage(self):
        result = run(match())
        self.assertFalse(records(result, "089"))
        self.assertEqual(records(result, "089", "coverage", period="round")[0]["status"], "not_evaluable")
        row = records(result, "096", "coverage", period="round")[0]
        self.assertEqual(row["sample"], {"unit": "death", "eligible": 0, "evaluated": 0, "flagged": 0})
        self.assertEqual(row["status"], "complete")

    def test_missing_damage_not_zero_and_bools_rejected(self):
        raw = match()
        del stat(raw)["damage"]
        self.assertFalse(records(run(raw), "089"))
        stat(raw)["damage"] = [{"receiver": "q", "damage": 50, "headshots": False, "bodyshots": 10, "legshots": 0}]
        self.assertFalse(records(run(raw), "089"))

    def test_team_hit_distribution_not_sum_of_individual_flags(self):
        raw = match()
        stat(raw)["damage"] = [{"receiver": "q", "damage": 100, "headshots": 0, "bodyshots": 10, "legshots": 0}]
        stat(raw, "a")["damage"] = [{"receiver": "q", "damage": 100, "headshots": 20, "bodyshots": 0, "legshots": 0}]
        result = run(raw)
        self.assertTrue(records(result, "089"))
        self.assertFalse([o for o in records(result, "089", uid=None) if o["target"]["kind"] == "team" and o["target"]["teamId"] == "Red"])

    def test_friendly_damage_excluded(self):
        raw = match()
        stat(raw)["damage"] = [{"receiver": "a", "damage": 100, "headshots": 0, "bodyshots": 10, "legshots": 0}]
        self.assertFalse(records(run(raw), "089"))

    def test_operator_distance_requires_same_event_shooter(self):
        raw = match()
        add(raw, kill(item=OP, positions=[]))
        self.assertFalse(records(run(raw), "087"))
        coverage = records(run(raw), "087", "coverage", period="round")[0]
        self.assertEqual(coverage["sample"]["evaluated"], 0)
        self.assertEqual(coverage["status"], "not_evaluable")

    def test_operator_equipment_is_not_lethal_weapon(self):
        raw = match()
        stat(raw)["economy"]["weapon"] = OP
        add(raw, kill(item=VANDAL))
        self.assertFalse(records(run(raw), "087"))
        add(raw, kill(victim="b", time=2000, item=OP))
        result = run(raw)
        self.assertEqual(len(records(result, "087")), 1)
        self.assertNotIn("isNoScope", records(result, "087")[0]["evidence"][0]["values"])

    def test_no_operator_reposition_across_death(self):
        raw = match()
        add(raw, kill(item=OP))
        add(raw, kill("q", "p", 1200))
        add(raw, kill("a", "b", 1400, positions=[position("p", -100, 0)]))
        self.assertFalse(records(run(raw), "081"))

    def test_operator_cross_round_comparison_is_match_only(self):
        raw = match(2)
        for i in range(2):
            stat(raw, r=i)["economy"]["weapon"] = OP
            add(raw, kill(item=OP), i)
        occ = records(run(raw), "082")
        self.assertEqual(len(occ), 1)
        self.assertEqual(occ[0]["period"], {"kind": "match"})
        self.assertEqual(occ[0]["roundNumbers"], [1, 2])

    def test_geometry_blocked(self):
        raw = match()
        raw["roundResults"][0]["winningTeamRole"] = "Defender"
        add(raw, kill(item=OP)); add(raw, kill(victim="b", time=2000, item=OP))
        result = run(raw)
        self.assertFalse(records(result, "083"))
        self.assertEqual(records(result, "083", "coverage", period="round")[0]["status"], "not_evaluable")
        self.assertFalse(records(result, "099", uid=None))

    def test_second_operator_pick_followup_and_life_boundary(self):
        raw = match()
        add(raw, kill(item=OP, positions=[position("p", 0, 0)], x=1000))
        add(raw, kill(victim="b", time=2000, item=OP, positions=[position("p", 500, 0)], x=1000))
        add(raw, kill("q", "p", time=2100))
        self.assertEqual(len(records(run(raw), "084")), 1)
        add(raw, kill("q", "p", time=1500))
        self.assertFalse(records(run(raw), "084"))

    def test_attacking_operator_and_unknown_side(self):
        raw = match(); stat(raw)["economy"]["weapon"] = OP
        add(raw, kill("q", "p"))
        self.assertTrue(records(run(raw), "085"))
        del raw["roundResults"][0]["winningTeamRole"]
        result = run(raw)
        self.assertFalse(records(result, "085"))
        self.assertEqual(records(result, "085", "coverage", period="round")[0]["status"], "not_evaluable")

    def test_sniper_context_preserves_aggregate_hits(self):
        raw = match(); stat(raw)["economy"]["weapon"] = OP
        stat(raw)["damage"] = [{"receiver": "q", "damage": 100, "headshots": 1, "bodyshots": 9, "legshots": 0}]
        values = records(run(raw), "088")[0]["evidence"][0]["values"]
        self.assertEqual(values["headshots"], 1)
        self.assertNotIn("weaponHeadshotPercent", values)

    def test_pistol_and_overtime_are_distinct(self):
        raw = match(); add(raw, kill("q", "p"))
        stat(raw)["damage"] = [{"receiver": "q", "damage": 100, "headshots": 1, "bodyshots": 9, "legshots": 0}]
        self.assertTrue(records(run(raw), "091"))
        raw["roundResults"][0]["roundNum"] = 24
        self.assertFalse(records(run(raw), "091"))

    def test_long_finalization_is_not_a_weapon_hit_rate(self):
        raw = match(); add(raw, kill(positions=[position("p", -4000, 0)]))
        occ = records(run(raw), "092")[0]
        self.assertEqual(occ["evidence"][0]["values"]["lethalDistanceUnits"], 4000)
        self.assertEqual(occ["evidence"][1]["values"]["hits"], 0)

    def test_utility_unknown_defuse_time_remains_partial(self):
        raw = match(); raw["roundResults"][0]["bombDefuser"] = "a"
        add(raw, kill(kind="Ability", item="Ultimate"))
        result = run(raw)
        self.assertEqual(records(result, "096", "coverage", period="round")[0]["status"], "partial")

    def test_objective_contribution_without_kills(self):
        raw = match(); raw["roundResults"][0].update(bombPlanter="p", plantRoundTime=2000)
        add(raw, kill("a", "q", assistants=["p"]))
        occ = records(run(raw), "100")[0]
        self.assertEqual(occ["evidence"][0]["values"]["kills"], 0)
        self.assertEqual(occ["evidence"][0]["values"]["plant"], 1)

    def test_unknown_agent_is_not_assigned_a_role(self):
        raw = match(); raw["players"][0]["characterId"] = "unknown"
        result = run(raw)
        self.assertFalse([o for o in records(result, "098", uid=None) if o["target"]["teamId"] == "Red"])

    def test_formal_schema_matches_dependency_free_validation(self):
        try: import jsonschema
        except ImportError: self.skipTest("Optional external validator unavailable; runtime needs no dependencies")
        from engine.schema import SCHEMA
        jsonschema.Draft202012Validator.check_schema(SCHEMA)
        jsonschema.validate(run(match()), SCHEMA)

    def test_opening_excludes_suicide_environment_and_friendly_fire(self):
        for event in [kill("p", "p", kind="Fall"), kill("p", "a"), kill("p", "p", kind="Bomb")]:
            raw = match(); add(raw, event)
            self.assertFalse(records(run(raw), "093", uid=None))

    def test_simultaneous_opening_not_array_winner(self):
        raw = match(); add(raw, kill()); add(raw, kill("q", "p", 1000))
        result = run(raw)
        self.assertFalse(records(result, "093", uid=None))
        self.assertTrue(all(r["status"] == "not_evaluable" for r in records(result, "093", "coverage", uid=None)))

    def test_post_defuse_ability_kill_excluded(self):
        raw = match(); raw["roundResults"][0].update(bombDefuser="a", defuseRoundTime=2000)
        add(raw, kill(kind="Ability", item="Ultimate", time=2500))
        self.assertFalse(records(run(raw), "096", uid=None))

    def test_ability_weapon_not_reclassified(self):
        raw = match(); add(raw, kill(item="95336ae4-45d4-1032-cfaf-6bad01910607"))
        self.assertFalse(records(run(raw), "096", uid=None))

    def test_multiple_ability_kills_counts_and_assist_dedup(self):
        raw = match(); add(raw, kill(kind="Ability", item="Ability1", assistants=["a", "a"]))
        add(raw, kill(victim="b", time=2000, kind="Ability", item="Ultimate"))
        result = run(raw)
        sample = records(result, "096", "coverage", period="round")[0]["sample"]
        self.assertEqual(sample, {"unit": "death", "eligible": 2, "evaluated": 2, "flagged": 2})
        self.assertEqual(records(result, "097", "coverage", uid="a", period="round")[0]["sample"]["flagged"], 1)
        self.assertFalse(records(result, "096", "recommendations", uid=None))
        self.assertFalse(records(result, "097", "recommendations", uid=None))

    def test_casts_are_match_only_and_average_not_timeline(self):
        raw = match(2); raw["players"][0]["stats"]["abilityCasts"]["ability1Casts"] = 6
        result = run(raw)
        occ = records(result, "095")[0]
        self.assertEqual(occ["period"]["kind"], "match")
        self.assertEqual(occ["evidence"][0]["values"]["castsPerRoundMatchAverage"], 3)
        self.assertEqual(records(result, "095", "coverage")[0]["sample"]["unit"], "match")
        self.assertFalse(records(result, "095", "recommendations"))
        raw["players"][0]["stats"]["roundsPlayed"] = 4
        self.assertFalse(records(run(raw), "095"))

    def candidate(self):
        raw = match()
        add(raw, kill("a", "b", time=1000, positions=[position("q", 0, 0, 0)]))
        add(raw, kill("p", "q", time=1500, positions=[position("p", -100, 0)]))
        return raw

    def test_prior_orientation_candidate_not_current_victim_orientation(self):
        raw = self.candidate(); result = run(raw)
        occ = records(result, "094")[0]
        self.assertEqual(occ["basis"], "inferred")
        self.assertEqual(occ["evidence"][1]["values"]["angleDegrees"], 180)
        self.assertEqual(occ["evidence"][1]["values"]["sampleAgeMs"], 500)

    def test_prior_orientation_age_movement_ties_and_life_boundaries(self):
        raw = self.candidate(); stat(raw)["kills"][0]["timeSinceRoundStartMillis"] = 2001
        self.assertFalse(records(run(raw), "094"))
        raw = self.candidate(); stat(raw)["kills"][0]["victimLocation"]["y"] = 101
        self.assertFalse(records(run(raw), "094"))
        raw = self.candidate(); stat(raw)["kills"][0]["timeSinceRoundStartMillis"] = 1000
        self.assertFalse(records(run(raw), "094"))
        raw = self.candidate(); add(raw, kill("a", "q", 1200))
        self.assertFalse(records(run(raw), "094"))

    def test_bad_config_and_missing_input_fields(self):
        for config in ({"unknown": 3}, {"min_hits": True}, {"low_headshot_ratio": 2}):
            with self.assertRaises(ValueError): Config.from_dict(config)
        with self.assertRaises(ValueError): run({})
        with self.assertRaises(ValueError): analyze_match(b'{"x":NaN}', "bad.json")

    def test_validator_rejects_broken_contract_and_pointers(self):
        raw = match(); add(raw, kill(kind="Ability", item="Ability1"))
        good = run(raw); ctx = Context(raw, IDS)
        for mutate in [lambda r: r.update(mode="analysis"),
                       lambda r: r["recommendations"][0]["sample"].update(flagged=999),
                       lambda r: r["occurrences"][0]["evidence"][0].update(sourcePath="/missing"),
                       lambda r: r["occurrences"][0]["participantIds"].append("Red")]:
            changed = copy.deepcopy(good); mutate(changed)
            with self.assertRaises(ValueError): validate_result(changed, TIPS, ctx)


if __name__ == "__main__": unittest.main()
