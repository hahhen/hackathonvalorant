"""Product semantics: facts are not automatically improvement recommendations."""
import unittest

from engine.review_policy import REVIEW_RULES
from engine.tests.test_engine import match, add, kill, run, records, stat
from engine.tests.early_helpers import fixture, econ, identifier
from engine.validate import validate_result
from engine.tests.test_engine import TIPS


class ReviewPolicyTests(unittest.TestCase):
    def test_screenshot_full_buy_is_context_not_economy_problem(self):
        raw = fixture(6)
        for i, (value, remaining) in enumerate(zip(
                [4550, 4600, 4700, 4450, 4600], [50, 1200, 1400, 50, 0])):
            econ(raw, 6, f"A{i}", loadoutValue=value, remaining=remaining,
                 weapon=identifier("armas", "Vandal"))
        result = run(raw)
        self.assertTrue(records(result, "002", uid=None))
        self.assertFalse(records(result, "002", "recommendations", uid=None))
        self.assertFalse([r for r in result["recommendations"] if int(r["tipId"]) <= 14])

    def test_empty_review_is_valid_without_filling_quota(self):
        result = run(match())
        self.assertTrue(result["occurrences"])  # composition/casts/inventories retained
        self.assertTrue(result["coverage"])
        self.assertEqual(result["recommendations"], [])

    def test_successful_trade_assist_and_ability_kill_not_warnings(self):
        raw = match()
        add(raw, kill("q", "a", 1000))
        add(raw, kill("p", "q", 2000, kind="Ability", item="Ability1", assistants=["a"]))
        result = run(raw)
        for tip in ("040", "095", "096", "097", "098", "100"):
            self.assertFalse(records(result, tip, "recommendations", uid=None), tip)
        self.assertTrue(records(result, "040", uid=None))
        self.assertTrue(records(result, "096", uid=None))

    def test_low_hs_and_sniper_inventory_do_not_diagnose_aim(self):
        raw = match()
        stat(raw)["economy"]["weapon"] = identifier("armas", "Operator")
        stat(raw)["damage"] = [{"receiver": "q", "damage": 100, "headshots": 0, "bodyshots": 10, "legshots": 0}]
        result = run(raw)
        self.assertTrue(records(result, "089"))
        self.assertFalse(records(result, "089", "recommendations", uid=None))
        self.assertFalse(records(result, "088", "recommendations", uid=None))

    def test_clear_buy_disparity_is_a_review_not_every_class_difference(self):
        raw = fixture(1)
        econ(raw, 1, "A0", loadoutValue=3850)
        self.assertFalse([r for r in run(raw)["recommendations"] if int(r["tipId"]) <= 14])
        for i in range(1, 5): econ(raw, 1, f"A{i}", loadoutValue=1000)
        econ(raw, 1, "A0", loadoutValue=4500)
        self.assertTrue(records(run(raw), "010", "recommendations", uid=None))

    def test_round_dedup_and_match_summary_reference_same_selected_cases(self):
        raw = match(2)
        for i in range(2):
            raw["roundResults"][i]["winningTeam"] = "Blue"
            add(raw, kill("p", "q", 1000), i)
            add(raw, kill("b", "p", 2000), i)
        result = run(raw)
        self.assertTrue(records(result, "025", uid=None))
        self.assertTrue(records(result, "079", uid=None))
        self.assertFalse(records(result, "025", "recommendations", uid=None))
        for target in ({"kind": "team", "teamId": "Red"},
                       {"kind": "player", "teamId": "Red", "playerId": "p"}):
            rows = [r for r in result["recommendations"] if r["target"] == target and r["tipId"] == "079"]
            rounds = [r for r in rows if r["period"]["kind"] == "round"]
            general = next(r for r in rows if r["period"]["kind"] == "match")
            self.assertEqual(set(general["occurrenceIds"]), {oid for r in rounds for oid in r["occurrenceIds"]})
            self.assertEqual(general["roundNumbers"], [1, 2])
            self.assertEqual(general["sample"]["flagged"], 2)
            self.assertIn("Revisar", general["observation"])

    def test_missing_winner_is_not_a_lost_advantage(self):
        raw = match()
        raw["roundResults"][0].pop("winningTeam")
        add(raw, kill())
        self.assertFalse(records(run(raw), "025", "recommendations", uid=None))
        self.assertFalse(records(run(raw), "079", "recommendations", uid=None))

    def test_positive_context_cannot_be_smuggled_as_recommendation(self):
        result = run(match())
        occurrence = records(result, "095")[0]
        result["recommendations"].append({
            "id": "invalid-context-rec", "tipId": "095", "target": occurrence["target"],
            "period": occurrence["period"], "observation": "Not a review point",
            "occurrenceIds": [occurrence["id"]], "roundNumbers": occurrence["roundNumbers"],
            "sample": {"unit": "match", "eligible": 1, "evaluated": 1, "flagged": 1},
            "priority": "low", "priorityReasons": ["context"], "limitations": []})
        with self.assertRaisesRegex(ValueError, "Context or positive"):
            validate_result(result, TIPS)

    def test_new_detector_is_not_implicitly_admitted(self):
        self.assertNotIn("002", REVIEW_RULES)
        self.assertNotIn("014", REVIEW_RULES)
        self.assertNotIn("098", REVIEW_RULES)


if __name__ == "__main__": unittest.main()
