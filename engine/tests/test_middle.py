"""Regression of the teammate integration against the shared contract and raw data."""
import unittest
from engine.tests.test_engine import match, add, kill, position, run, records
from engine.report import DETECTORS


def team_rows(result, tip, kind="occurrences", team="Red", period="round"):
    return [o for o in records(result, tip, kind, uid=None, period=period)
            if o["target"] == {"kind": "team", "teamId": team}]


def plant(raw, time=1000):
    raw["roundResults"][0].update(bombPlanter="p", plantRoundTime=time, plantSite="A",
        plantLocation={"x": 0, "y": 0}, plantPlayerLocations=[position("p"), position("a", 100), position("q", 3000), position("b", 4000)])


class MiddleTests(unittest.TestCase):
    def test_middle_ids_remain_registered_after_full_integration(self):
        result = run(match())
        self.assertEqual(set(DETECTORS), {f"{i:03}" for i in range(1, 101)})
        self.assertEqual({c["detectorId"] for c in result["coverage"]}, set(DETECTORS.values()))
        self.assertEqual(result["mode"], "computed")
        self.assertEqual(result["engine"]["version"], "0.4.0")
        self.assertNotIn("teamplayAnalysis", result)

    def test_trade_one_opportunity_and_sensitivity_windows(self):
        raw = match()
        add(raw, kill("q", "a", 1000))
        add(raw, kill("p", "q", 3500))
        result = run(raw)
        occ = records(result, "040")[0]
        values = occ["evidence"][0]["values"]
        self.assertFalse(values["within1s"])
        self.assertTrue(values["within3s"])
        self.assertTrue(values["within5s"])
        self.assertEqual(team_rows(result, "040", "coverage")[0]["sample"],
                         {"unit": "death", "eligible": 1, "evaluated": 1, "flagged": 1})
        self.assertFalse(records(result, "040", uid="a"))

    def test_simultaneous_not_a_trade(self):
        raw = match()
        add(raw, kill("q", "a", 1000))
        add(raw, kill("p", "q", 1000))
        self.assertFalse(records(run(raw), "040"))

    def test_censored_trade_not_an_evaluated_failure(self):
        raw = match()
        add(raw, kill("q", "a", 1000))
        row = records(run(raw), "040", "coverage", period="round")[0]
        self.assertEqual(row["sample"]["eligible"], 1)
        self.assertEqual(row["sample"]["evaluated"], 0)

    def test_trade_negative_has_denominator_when_window_observed(self):
        raw = match()
        add(raw, kill("q", "a", 1000))
        add(raw, kill("b", "p", 6000))
        row = team_rows(run(raw), "040", "coverage")[0]
        self.assertEqual(row["sample"], {"unit": "death", "eligible": 2, "evaluated": 1, "flagged": 0})

    def test_afterplant_death_excludes_completed_defuse_and_exact_plant(self):
        raw = match()
        plant(raw)
        raw["roundResults"][0].update(bombDefuser="q", defuseRoundTime=4000)
        add(raw, kill("q", "a", 1000))
        add(raw, kill("b", "p", 4000))
        self.assertFalse(team_rows(run(raw), "062"))

    def test_afterplant_positive_is_not_free_duel_claim(self):
        raw = match()
        plant(raw)
        add(raw, kill("q", "a", 2000))
        result = run(raw)
        self.assertTrue(records(result, "062", uid="a"))
        self.assertTrue(team_rows(result, "062"))

    def test_planter_next_sample_same_life_and_missing_snapshot(self):
        raw = match()
        plant(raw)
        add(raw, kill("a", "q", 2000, positions=[position("p", 100), position("a")]))
        self.assertEqual(records(run(raw), "061")[0]["evidence"][1]["values"]["displacementUnits"], 100)
        add(raw, kill("b", "p", 1500))
        self.assertFalse(records(run(raw), "061"))

    def test_missing_plant_time_not_zero(self):
        raw = match()
        plant(raw)
        del raw["roundResults"][0]["plantRoundTime"]
        self.assertFalse(records(run(raw), "057"))
        self.assertEqual(records(run(raw), "057", "coverage", period="round")[0]["sample"]["eligible"], None)

    def test_defuse_interval_and_unknown_result(self):
        raw = match()
        plant(raw)
        raw["roundResults"][0].update(bombDefuser="q", defuseRoundTime=5000, roundResult="Bomb defused")
        self.assertEqual(team_rows(run(raw), "063")[0]["evidence"][0]["values"]["plantToDefuseMs"], 4000)
        raw["roundResults"][0]["defuseRoundTime"] = 500
        self.assertFalse(team_rows(run(raw), "063"))

    def test_timeout_exact_label_and_side(self):
        raw = match()
        raw["roundResults"][0].update(winningTeam="Blue", winningTeamRole="Defender", roundResult="Round timer expired")
        self.assertTrue(team_rows(run(raw), "072"))
        raw["roundResults"][0]["roundResult"] = "maybe timer problem"
        self.assertFalse(team_rows(run(raw), "072"))

    def test_clutch_entry_and_advantage_loss(self):
        raw = match()
        raw["roundResults"][0].update(roundResult="Eliminated")
        add(raw, kill("q", "a", 1000))
        add(raw, kill("p", "q", 2000))
        add(raw, kill("p", "b", 3000))
        result = run(raw)
        self.assertEqual(records(result, "073")[0]["evidence"][0]["values"]["opponentsAtEntry"], 2)
        self.assertEqual(records(result, "073")[0]["basis"], "inferred")
        self.assertEqual(team_rows(result, "073")[0]["participantIds"], ["p"])
        self.assertTrue(records(result, "074"))
        self.assertTrue(team_rows(result, "079", team="Blue"))
        self.assertTrue(records(result, "078"))

    def test_batch_ties_do_not_invent_intermediate_clutch(self):
        raw = match()
        add(raw, kill("q", "a", 1000))
        add(raw, kill("b", "p", 1000))
        self.assertFalse(records(run(raw), "073"))

    def test_environment_death_changes_counts_not_trade(self):
        raw = match()
        add(raw, kill("a", "a", 1000, kind="Fall"))
        result = run(raw)
        self.assertTrue(records(result, "073"))
        self.assertFalse(team_rows(result, "040"))

    def test_resurrection_ambiguity_blocks_alive_based_findings(self):
        raw = match()
        add(raw, kill("q", "a", 1000))
        add(raw, kill("b", "a", 2000))
        self.assertFalse(records(run(raw), "073"))
        self.assertEqual(records(run(raw), "073", "coverage", period="round")[0]["status"], "not_evaluable")

    def test_incomplete_feed_does_not_reconstruct_alive(self):
        raw = match()
        del raw["roundResults"][0]["playerStats"][0]["kills"]
        add(raw, kill("q", "a", 1000))
        self.assertFalse(records(run(raw), "073"))

    def test_detonation_survivors_require_bomb_boundary(self):
        raw = match()
        plant(raw)
        raw["roundResults"][0]["roundResult"] = "Bomb detonated"
        self.assertFalse(team_rows(run(raw), "064"))
        add(raw, kill(None, "q", 45000, kind="Bomb"))
        self.assertEqual(team_rows(run(raw), "064")[0]["evidence"][0]["values"]["defendersInferredAliveBeforeBombEvents"], 2)

    def test_geometry_blocks_and_global_inventory_no_fake_rounds(self):
        raw = match()
        plant(raw)
        result = run(raw)
        for tip in ("045", "048", "060", "068", "069", "076", "077"):
            self.assertFalse(records(result, tip, uid=None))
        self.assertFalse(records(result, "080", period="round"))
        self.assertTrue(records(result, "080", period="match"))

    def test_source_array_indices_survive_reordered_round_numbers(self):
        raw = match(2)
        raw["roundResults"][0]["roundNum"] = 5
        add(raw, kill("q", "a", 1000))
        row = records(run(raw), "073")[0]
        self.assertEqual(row["period"]["roundNumber"], 6)
        self.assertTrue(row["evidence"][0]["sourcePath"].startswith("/roundResults/0/"))

    def test_comparable_inventory_includes_successes_and_failures(self):
        raw = match(2)
        raw["roundResults"][1].update(winningTeam="Blue", winningTeamRole="Defender")
        row = team_rows(run(raw), "080", period="match")[0]
        self.assertEqual(len(row["evidence"]), 2)
        for ev in row["evidence"]:
            self.assertEqual(ev["values"]["comparableRecordedRounds"], 2)
            self.assertEqual(ev["values"]["comparableRecordedWins"], 1)


if __name__ == "__main__": unittest.main()
