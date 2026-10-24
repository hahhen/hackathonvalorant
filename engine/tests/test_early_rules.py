"""Positive fixtures supplied with the colleague's 001–038 rules, on shared context."""
import unittest
from engine.detectors.early import evaluate_tip as evaluate
from engine.tests.early_helpers import fixture, context, econ, kill, plant, stat, identifier, IDS, PLAYER, TEAM, geometry

class DetectorTests(unittest.TestCase):
    def check_tip(self, tip, raw, rn=1, maps=False, expected=True):
        ctx = context(raw, maps=maps)
        target = TEAM if tip in {2,4,5,7,8,10,11,13,14,22} else PLAYER
        result = evaluate(tip, ctx, ctx.match.rounds[rn-1], target)
        self.assertEqual(result.flagged, expected, (tip, result))
        if expected:
            self.assertTrue(result.evidence)
        return result

    def test_each_economic_detector_positive(self):
        for tip in range(1, 15):
            with self.subTest(tip=tip):
                raw, rn = fixture(), 1
                if tip in {1, 3}:
                    econ(raw, 1, 'A0', spent=3500, loadoutValue=3000)
                    econ(raw, 2, 'A0', loadoutValue=1000)
                elif tip == 4:
                    raw = fixture(13)
                    rn = 13
                    for i in range(5):
                        econ(raw, rn, f'A{i}', loadoutValue=1000)
                elif tip == 5:
                    rn = 2
                    plant(raw, 1)
                    kill(raw, 1, 'A0', 'B0', 1000)
                elif tip == 6:
                    rn = 3
                    econ(raw, 3, 'A0', spent=0)
                elif tip == 7:
                    rn = 3
                elif tip == 8:
                    econ(raw, 1, 'A0', loadoutValue=1000)
                elif tip == 9:
                    econ(raw, 1, 'A0', loadoutValue=1000)
                elif tip == 10:
                    for i in range(1, 5):
                        econ(raw, 1, f'A{i}', loadoutValue=1000)
                elif tip == 11:
                    kill(raw, 1, 'A0', 'B0', 1000)
                elif tip == 12:
                    rn = 2
                elif tip == 13:
                    for i in range(5):
                        econ(raw, 1, f'B{i}', loadoutValue=1000)
                self.check_tip(tip, raw, rn=rn)

    def test_each_pistol_detector_positive(self):
        for tip in range(15, 23):
            with self.subTest(tip=tip):
                raw = fixture()
                if tip == 18:
                    kill(raw, 1, 'B0', 'A1', 1000)
                    kill(raw, 1, 'A0', 'B0', 2000)
                else:
                    weapon = 'Sheriff' if tip == 20 else 'Classic' if tip == 21 else 'Ghost'
                    kill(raw, 1, 'A0', 'B0', 1000, weapon=weapon, secondary=tip==21)
                    if tip == 17:
                        kill(raw, 1, 'B1', 'A0', 2000)
                    if tip == 19:
                        raw['players'][0]['characterId'] = identifier('agentes', 'Omen')
                        econ(raw, 1, 'A0', weapon=identifier('armas', 'Classic'))
                self.check_tip(tip, raw)

    def test_each_position_detector_positive(self):
        for tip in range(23, 39):
            with self.subTest(tip=tip):
                raw, rn = fixture(), 1
                if tip == 27:
                    kill(raw, 1, 'B0', 'A0', 1000)
                elif tip in {30, 34, 37}:
                    event = kill(raw, 1, 'B0', 'A0', 1000)
                    kill(raw, 1, 'B1', 'A1', 6000)
                    if tip == 30:
                        for loc in event['playerLocations']:
                            if loc['puuid'].startswith('A'):
                                loc['location']['x'] = 5000
                    if tip == 34:
                        for loc in event['playerLocations']:
                            if loc['puuid'] == 'B1':
                                loc['location']['x'] = 1100
                        for p in ['B0', 'B1']:
                            stat(raw, 1, p)['damage'].append({'receiver':'A0','damage':50})
                elif tip == 35:
                    for i in range(1, 5):
                        kill(raw, 1, f'B{i}', f'A{i}', i*100)
                    kill(raw, 1, 'A0', 'B0', 1000)
                    kill(raw, 1, 'A0', 'B1', 2000, x=2000)
                elif tip == 36:
                    rn = 2
                    kill(raw, 1, 'A0', 'B0', 1000)
                    kill(raw, 2, 'A0', 'B0', 1000)
                elif tip == 38:
                    plant(raw, 1, time=500)
                    kill(raw, 1, 'A0', 'B0', 1000)
                    kill(raw, 1, 'A0', 'B1', 2000, x=2000)
                else:
                    kill(raw, 1, 'A0', 'B0', 1000)
                    if tip in {23, 26, 33}:
                        kill(raw, 1, 'A0', 'B1', 15000, x=2000)
                    elif tip in {24, 29}:
                        kill(raw, 1, 'B1', 'A0', 2000)
                self.check_tip(tip, raw, rn=rn, maps=True)

    def test_all_rules_report_missing_data_without_false_findings(self):
        raw = fixture()
        raw['roundResults'][0]['playerStats'] = []
        ctx = context(raw)
        for tip in range(1,39):
            target = TEAM if tip in {2,4,5,7,8,10,11,13,14,22} else PLAYER
            f = evaluate(tip, ctx, ctx.match.rounds[0], target)
            self.assertFalse(f.available, tip)
            self.assertFalse(f.flagged, tip)

    def test_true_negative_economic_and_opening(self):
        raw = fixture()
        raw['roundResults'][0]['winningTeam'] = 'A'
        kill(raw, 1, 'A0', 'B0', 1000)
        kill(raw, 1, 'A1', 'B1', 10000)
        for tip in {1,3,8,9,10,13,17,18,19,22,24,25,27,29,30,33,34,35,36,38}:
            self.check_tip(tip, raw, maps=True, expected=False)
