import copy
import unittest
from engine import analyze_match
from engine.config import Config
from engine.report import DETECTORS
from engine.tests.test_engine import run, records, match
from engine.tests import test_early_rules as early_cases
from engine.tests.early_helpers import fixture, context, econ, kill, plant, stat, identifier, PLAYER, TEAM, geometry
from engine.detectors.early import evaluate_tip
from engine.detectors.early.bridge import GEOMETRY_TIPS, MATCH_PERIOD


class EarlyIntegrationTests(unittest.TestCase):
    def test_all_38_positive_cases_reach_shared_output(self):
        outer = self
        class Cases(early_cases.DetectorTests):
            def check_tip(self, tip, raw, rn=1, maps=False, expected=True):
                target = TEAM if tip in {2,4,5,7,8,10,11,13,14,22} else PLAYER
                result = run(raw, config={"early": {"maps": geometry()} if maps else {}})
                selected = [o for o in records(result, f"{tip:03}", uid=None) if o["target"] == target]
                outer.assertEqual(bool(selected), expected, tip)
                return selected
        cases = Cases()
        cases.test_each_economic_detector_positive()
        cases.test_each_pistol_detector_positive()
        cases.test_each_position_detector_positive()

    def test_all_ids_and_four_recuts_and_existing_modules_preserved(self):
        raw = fixture(3)
        for rn in range(1, 4):
            kill(raw, rn, "A0", "B0", 1000)
            kill(raw, rn, "B1", "A0", 2000)
        result = run(raw)
        self.assertEqual(set(DETECTORS), {f"{i:03}" for i in range(1, 101)})
        self.assertEqual({r["detectorId"] for r in result["coverage"]}, set(DETECTORS.values()))
        self.assertEqual({(r["target"]["kind"], r["period"]["kind"]) for r in result["recommendations"]},
                         {("team", "match"), ("team", "round"), ("player", "match"), ("player", "round")})
        self.assertTrue(any(int(r["tipId"]) >= 39 for r in result["recommendations"]))

    def test_sequences_match_only_and_anchor_round_denominators(self):
        raw = fixture(3)
        result = run(raw)
        self.assertFalse(records(result, "014", uid=None, period="round"))
        rows = [o for o in records(result, "014", "coverage", uid=None, period="match") if o["target"] == TEAM]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["sample"], {"unit": "round", "eligible": 2, "evaluated": 2, "flagged": 2})
        occurrences = [o for o in records(result, "014", uid=None) if o["target"] == TEAM]
        self.assertEqual(sorted({n for o in occurrences for n in o["roundNumbers"]}), [1, 2, 3])
        self.assertEqual(len(occurrences), 2)
        self.assertFalse(records(result, "014", "recommendations", uid=None))

    def test_do_not_cross_halftime_or_overtime_resets(self):
        raw = fixture(26)
        for n in (12, 24, 25):
            econ(raw, n, "A0", spent=5000, loadoutValue=5000)
            econ(raw, n+1, "A0", loadoutValue=1000)
        ctx = context(raw)
        for n in (12, 24, 25): self.assertFalse(evaluate_tip(1, ctx, ctx.match.rounds[n-1], PLAYER).applicable)
        for n in (25, 26): self.assertFalse(evaluate_tip(15, ctx, ctx.match.rounds[n-1], PLAYER).applicable)

    def test_geometry_not_invented_and_unknown_game_mode(self):
        result = run(fixture(1))
        for tip in GEOMETRY_TIPS:
            self.assertFalse(records(result, f"{tip:03}", uid=None))
            self.assertTrue(any(c["status"] == "not_evaluable" for c in records(result, f"{tip:03}", "coverage", uid=None)))
        raw = fixture(1)
        del raw["matchInfo"]["gameMode"]
        self.assertFalse(records(run(raw), "015", uid=None))

    def test_geometry_config_validation_and_fingerprint(self):
        for cfg in ({"early": []}, {"early": {"unknown": 1}}, {"early": {"maps": {"x": []}}},
                    {"early": {"ecoMaxValue": 5000}}, {"early": {"tradeWindowMs": 0}}):
            with self.assertRaises(ValueError): Config.from_dict(cfg)
        first = run(fixture(1))
        other = run(fixture(1), config={"early": {"tradeWindowMs": 1000}})
        self.assertNotEqual(first["engine"]["configVersion"], other["engine"]["configVersion"])

    def test_missing_economy_not_zero_and_team_facts_not_copied_to_players(self):
        raw = fixture(1)
        del stat(raw, 1, "A0")["economy"]["spent"]
        result = run(raw)
        self.assertFalse([o for o in records(result, "008", uid=None) if o["target"] == TEAM])
        self.assertFalse(any(o["target"]["kind"] == "player" for o in records(result, "002", uid=None)))

    def test_ties_and_censored_opening(self):
        raw = fixture(1)
        kill(raw, 1, "A0", "B0", 1000)
        kill(raw, 1, "B1", "A1", 1000)
        self.assertFalse(records(run(raw), "025", uid=None))
        raw = fixture(1)
        raw["roundResults"][0]["winningTeam"] = "A"
        kill(raw, 1, "A0", "B0", 1000)
        result = run(raw)
        self.assertFalse(records(result, "017", uid=None))
        self.assertFalse(records(result, "025", uid=None))

    def test_death_boundary_and_resurrection_block_movement(self):
        raw = fixture(1)
        kill(raw, 1, "A0", "B0", 1000)
        kill(raw, 1, "B1", "A0", 2000)
        kill(raw, 1, "A0", "B2", 3000, x=2000)
        result = run(raw)
        for tip in ("023", "026", "033", "035"): self.assertFalse(records(result, tip, uid=None))

    def test_missing_weapon_not_a_pickup_signal(self):
        raw = fixture(1)
        raw["players"][0]["characterId"] = identifier("agentes", "Omen")
        econ(raw, 1, "A0", weapon="")
        kill(raw, 1, "A0", "B0", 1000)
        self.assertFalse(records(run(raw), "019", uid=None))

    def test_friendly_hits_excluded_from_sheriff_context(self):
        raw = fixture(1)
        kill(raw, 1, "A0", "B0", 1000, weapon="Sheriff")
        stat(raw, 1, "A0")["damage"] = [{"receiver": "A1", "damage": 50, "headshots": 5, "bodyshots": 0, "legshots": 0}]
        row = records(run(raw), "020", uid=None)[0]
        self.assertFalse(any("/damage/" in ev["sourcePath"] for ev in row["evidence"]))

    def test_original_pointers_and_kill_ids_are_shared(self):
        raw = fixture(2)
        kill(raw, 1, "A0", "B0", 1000)
        raw["roundResults"].reverse()
        row = records(run(raw), "025", uid=None)[0]
        self.assertEqual(row["evidence"][0]["sourcePath"], "/roundResults/1/playerStats/0/kills/0")
        self.assertEqual(row["evidence"][0]["eventId"], "r1-k0")


if __name__ == "__main__": unittest.main()
