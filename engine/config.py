from dataclasses import dataclass, asdict, fields, field
import math
from .detectors.early.configuration import configuration


@dataclass(frozen=True)
class Config:
    """Analytical choices, not thresholds prescribed by the lessons."""
    operator_repeat_distance_units: float = 1000
    operator_close_distance_units: float = 1000
    operator_min_approach_units: float = 100
    long_distance_units: float = 3000
    followup_window_ms: int = 3000
    afterplant_death_window_ms: int = 5000
    sampled_isolation_distance_units: float = 2000
    min_hits: int = 8
    low_headshot_ratio: float = 0.15
    first_death_damage_max: float = 50
    prior_snapshot_window_ms: int = 1000
    prior_snapshot_displacement_units: float = 100
    rear_candidate_angle_degrees: float = 135
    match_priority_min_rounds: int = 3
    match_priority_min_evaluated: int = 5
    early: dict = field(default_factory=dict)

    @classmethod
    def from_dict(cls, values=None):
        values = values or {}
        unknown = set(values) - {f.name for f in fields(cls)}
        if unknown:
            raise ValueError(f"Unknown configuration: {sorted(unknown)}")
        result = cls(**values)
        for key, value in asdict(result).items():
            if key == "early":
                if not isinstance(value, dict): raise ValueError("early must be an object")
                configuration(value)
                continue
            if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or value < 0:
                raise ValueError(f"Invalid configuration: {key}")
        if not 0 <= result.low_headshot_ratio <= 1 or not 90 <= result.rear_candidate_angle_degrees <= 180:
            raise ValueError("Invalid ratio or angle")
        for name in ("followup_window_ms", "afterplant_death_window_ms", "min_hits", "prior_snapshot_window_ms", "match_priority_min_rounds", "match_priority_min_evaluated"):
            if not isinstance(getattr(result, name), int) or getattr(result, name) < 1:
                raise ValueError(f"{name} must be a positive integer")
        return result
