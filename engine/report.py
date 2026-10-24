"""Opportunity ledger -> coverage, occurrences and recommendations. No UI text catalog duplication."""
import hashlib
import json
from dataclasses import dataclass, field
from .review_policy import REVIEW_RULES, select_review_occurrences


DETECTORS = {
    "001": "economy_spend_next_loadout", "002": "team_equipment_distribution",
    "003": "individual_spend_team_context", "004": "match_point_loadout",
    "005": "lost_pistol_economy_context", "006": "bonus_weapon_continuity",
    "007": "bonus_round_sequence", "008": "unequal_equipment_classes",
    "009": "lower_loadout_team_contribution", "010": "one_full_four_eco",
    "011": "opening_victim_equipment", "012": "balance_next_loadout",
    "013": "equipment_advantage_loss", "014": "team_economy_sequence",
    "015": "pistol_agent_loadout", "016": "pistol_ghost_frenzy_distance",
    "017": "pistol_opening_followup", "018": "reyna_pistol_refrag",
    "019": "support_pistol_weapon_divergence", "020": "pistol_sheriff_context",
    "021": "pistol_classic_fire_mode", "022": "pistol_opening_conversion",
    "023": "postkill_next_sample", "024": "region_postkill_death",
    "025": "opening_advantage_context", "026": "successive_kill_positions",
    "027": "multiple_nearby_opponents", "028": "rare_region_context",
    "029": "advanced_opening_followup", "030": "death_without_nearby_ally_response",
    "031": "region_numerical_state", "032": "first_region_sample",
    "033": "sample_staleness_context", "034": "multiple_region_damage_context",
    "035": "clutch_postkill_sample", "036": "consecutive_region_pattern",
    "037": "death_response_context", "038": "afterplant_sampled_fallback",
    "039": "successive_allied_deaths", "040": "temporal_trade",
    "041": "death_sampled_ally_distance", "042": "recorded_pair_assistance",
    "043": "postplant_sample_changes", "044": "preplant_event_distribution",
    "045": "advanced_defender_space", "046": "pick_to_plant_interval",
    "047": "repeated_plant_site_context", "048": "defender_region_dominance",
    "049": "plant_sampled_team_distribution", "050": "sampled_team_separation",
    "051": "separated_contact_timing", "052": "separated_pick_to_plant",
    "053": "defensive_sample_changes", "054": "retake_sampled_dispersion",
    "055": "surviving_agent_sequence", "056": "death_to_next_event",
    "057": "plant_sampled_enemy_distance", "058": "completed_plant_survival_context",
    "059": "plant_coordinate_context", "060": "protected_plant_geometry",
    "061": "planter_next_sample", "062": "attacker_death_soon_after_plant",
    "063": "objective_outcome_interval", "064": "detonation_remaining_defenders",
    "065": "one_vs_two_defuse_sequence", "066": "afterplant_pick_ally_distance",
    "067": "postplant_sampled_dispersion", "068": "outside_site_afterplant",
    "069": "connector_space_retention", "070": "defense_plant_outcome_context",
    "071": "agents_at_completed_plant", "072": "attack_timeout",
    "073": "clutch_entry_context", "074": "clutch_kill_sequence",
    "075": "clutch_sampled_threat_distance", "076": "clutch_cover_geometry",
    "077": "opponent_pattern_adaptation", "078": "clutch_objective_outcome",
    "079": "numerical_advantage_lost", "080": "comparable_round_inventory",
    "081": "operator_sampled_reposition", "082": "operator_first_sample_variation",
    "083": "operator_defensive_retreat", "084": "operator_second_pick_followup",
    "085": "operator_attack_context", "086": "operator_lethal_distance",
    "087": "operator_close_lethal_distance", "088": "sniper_hit_context",
    "089": "aggregate_hit_distribution", "090": "recorded_weapon_training_inventory",
    "091": "pistol_damage_review", "092": "long_distance_lethal_context",
    "093": "opening_death_review", "094": "prior_orientation_candidate",
    "095": "match_ability_cast_volume", "096": "lethal_ability_objective_context",
    "097": "recorded_assistance_context", "098": "composition_inventory",
    "099": "sampled_opponent_tools_context", "100": "contribution_beyond_kd",
}


@dataclass
class Group:
    tip: str
    target: dict
    period: dict
    unit: str
    cases: dict = field(default_factory=dict)


class Report:
    def __init__(self, ctx, catalog, config, match_id):
        self.ctx, self.catalog, self.config, self.match_id = ctx, catalog, config, match_id
        self.groups, self.occurrences = {}, {}

    def record(self, tip, target, r=None, *, key=None, eligible=True, evaluated=True,
               flagged=False, observation="", evidence=(), participants=(),
               parameters=None, reason=None, partial=False, basis="measured",
               unit="round", match_only=False, rounds=None, extra_limits=()):
        """One explicit opportunity; False eligible registers a known empty population.

        eligible=None means applicability is unknown because required fields are absent.
        A match-only record never fabricates round-level occurrences.
        """
        if flagged and (eligible is not True or not evaluated or not evidence):
            raise ValueError("An occurrence needs an evaluated opportunity and evidence")
        period = {"kind": "match"} if match_only else {"kind": "round", "roundNumber": r.number}
        target_key = json.dumps(target, sort_keys=True)
        group_key = (tip, target_key, json.dumps(period, sort_keys=True))
        group = self.groups.setdefault(group_key, Group(tip, target, period, unit))
        if group.unit != unit: raise ValueError("Mixed opportunity units")
        opportunity = str(key if key is not None else ("match" if match_only else r.number))
        if opportunity in group.cases: raise ValueError("Duplicate opportunity")
        occurrence_id = None
        if flagged:
            identity = json.dumps([self.match_id, DETECTORS[tip], target, period, opportunity], sort_keys=True)
            occurrence_id = f"occ-{tip}-{hashlib.sha256(identity.encode()).hexdigest()[:24]}"
            related = sorted(set(rounds or [r.number]))
            self.occurrences[occurrence_id] = {
                "id": occurrence_id, "detectorId": DETECTORS[tip], "detectorVersion": "1.0.0",
                "target": target, "period": period, "roundNumbers": related,
                "participantIds": sorted(set(uid for uid in participants if uid in self.ctx.players)),
                "basis": basis, "observation": observation, "evidence": list(evidence),
                "definition": {"rule": self.catalog[tip]["inferencia"]["metodo"], "parameters": parameters or {}},
                "limitations": list(dict.fromkeys([self.catalog[tip]["inferencia"]["limites"], *extra_limits])),
            }
        group.cases[opportunity] = {"eligible": eligible, "evaluated": eligible is True and bool(evaluated),
                                     "occurrence": occurrence_id, "reason": reason, "partial": partial}

    @staticmethod
    def sample(group):
        cases = group.cases.values()
        return {"unit": group.unit,
                "eligible": None if any(c["eligible"] is None for c in cases) else sum(c["eligible"] is True for c in cases),
                "evaluated": sum(c["evaluated"] for c in cases),
                "flagged": sum(bool(c["occurrence"]) for c in cases)}

    def finish(self):
        # Occurrence != recommendation. Keep the complete audit ledger, but
        # publish only explicitly admitted review points in either period.
        tips_by_detector = {detector: tip for tip, detector in DETECTORS.items()}
        review_ids = select_review_occurrences(
            ((tips_by_detector[o["detectorId"]], o) for o in self.occurrences.values()), self.ctx)
        # Merge original opportunity keys, not evidence counts or copied recommendation rows.
        groups = dict(self.groups)
        for group in self.groups.values():
            if group.period["kind"] == "match": continue
            k = (group.tip, json.dumps(group.target, sort_keys=True), json.dumps({"kind": "match"}, sort_keys=True))
            aggregate = groups.setdefault(k, Group(group.tip, group.target, {"kind": "match"}, group.unit))
            for key, case in group.cases.items():
                aggregate.cases[f"r{group.period['roundNumber']}:{key}"] = case
        coverage, recommendations = [], []
        for _, group in sorted(groups.items()):
            sample = self.sample(group)
            reasons = sorted({c["reason"] for c in group.cases.values() if c["reason"]})
            uncertain = sample["eligible"] is None or (sample["eligible"] or 0) > sample["evaluated"] or any(c["partial"] and c["eligible"] is not False for c in group.cases.values())
            status = ("not_evaluable" if not sample["evaluated"] and (sample["eligible"] is None or sample["eligible"] > 0)
                      else "partial" if uncertain else "complete")
            coverage.append({"detectorId": DETECTORS[group.tip], "detectorVersion": "1.0.0",
                             "target": group.target, "period": group.period, "status": status,
                             "sample": sample, "reasons": reasons or ["Sem oportunidades aplicáveis." if sample["eligible"] == 0 else "Recorte avaliado segundo a definição; não comprova erro tático."]})
            occurrences = [self.occurrences[c["occurrence"]] for c in group.cases.values() if c["occurrence"] in review_ids]
            if not occurrences: continue
            # Denominators describe the evaluated detector opportunities; flagged
            # now counts ONLY the selected references, not contextual siblings.
            sample = {**sample, "flagged": len(occurrences)}
            rounds = sorted({n for o in occurrences for n in o["roundNumbers"]})
            weak = self.catalog[group.tip]["inferencia"]["indicioFraco"]
            medium = (group.period["kind"] == "match" and group.unit != "match" and not weak
                      and status == "complete" and len(rounds) >= self.config.match_priority_min_rounds
                      and sample["evaluated"] >= self.config.match_priority_min_evaluated)
            detail = (" | ".join(o["observation"] for o in occurrences) if group.period["kind"] == "round" or group.unit == "match"
                      else f"{sample['flagged']} de {sample['evaluated']} oportunidades avaliadas selecionadas em {len(rounds)} rounds. Sem atribuição automática de erro.")
            observation = f"{REVIEW_RULES[group.tip]} {detail}"
            key = json.dumps([self.match_id, group.tip, group.target, group.period], sort_keys=True)
            recommendations.append({"id": f"rec-{group.tip}-{hashlib.sha256(key.encode()).hexdigest()[:24]}",
                                    "tipId": group.tip, "target": group.target, "period": group.period,
                                    "observation": observation, "occurrenceIds": sorted(o["id"] for o in occurrences),
                                    "roundNumbers": rounds, "sample": sample, "priority": "medium" if medium else "low",
                                    "priorityReasons": ["Recorrência em oportunidades distintas com cobertura completa." if medium else "Recorte contextual, amostra limitada ou observabilidade parcial; revisar sem diagnosticar falha."],
                                    "limitations": sorted({limit for o in occurrences for limit in o["limitations"]} | set(reasons))})
        recommendations.sort(key=lambda rec: ({"high": 0, "medium": 1, "low": 2}[rec["priority"]], -len(rec["roundNumbers"]), -rec["sample"]["flagged"], rec["tipId"], rec["id"]))
        return coverage, list(self.occurrences.values()), recommendations
