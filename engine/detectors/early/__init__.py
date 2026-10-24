"""Operational rules 001–038 supplied by the team; orchestration lives in bridge.py."""
from .economy import economy
from .pistol import pistol
from .positioning import positioning


def evaluate_tip(tip, ctx, r, target):
    if tip <= 14: return economy(tip, ctx, r, target)
    if tip <= 22: return pistol(tip, ctx, r, target)
    return positioning(tip, ctx, r, target)


def evaluate(ctx, report, cfg):
    from .bridge import evaluate as run
    run(ctx, report, cfg)
