"""Offline, evidence-based analysis. Public entry point: analyze_match."""

def analyze_match(*args, **kwargs):
    from .runner import analyze_match as run
    return run(*args, **kwargs)

__all__ = ["analyze_match"]
