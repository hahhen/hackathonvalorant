import json
import re
from collections import Counter
from .schema import validate_structure


def pointer(raw, path):
    if not path.startswith("/"): raise ValueError("Expected JSON Pointer")
    node = raw
    for part in path[1:].split("/"):
        part = part.replace("~1", "/").replace("~0", "~")
        node = node[int(part)] if isinstance(node, list) else node[part]
    return node


def validate_result(result, catalog, ctx=None):
    validate_structure(result)
    if result["mode"] == "computed" and not re.fullmatch(r"[0-9a-f]{64}", result["source"]["sha256"] or ""):
        raise ValueError("Computed analyses need an original-byte SHA-256")
    rounds = {r.number for r in ctx.rounds} if ctx else None
    events = {k.event_id for r in ctx.rounds for k in r.kills if k.event_id} if ctx else None
    occurrences = {o["id"]: o for o in result["occurrences"]}
    if len(occurrences) != len(result["occurrences"]): raise ValueError("Duplicate occurrence IDs")
    if len({r["id"] for r in result["recommendations"]}) != len(result["recommendations"]): raise ValueError("Duplicate recommendation IDs")
    coverage = set()
    for row in result["coverage"]:
        key = (row["detectorId"], row["detectorVersion"], json.dumps(row["target"], sort_keys=True), json.dumps(row["period"], sort_keys=True))
        if key in coverage: raise ValueError("Duplicate coverage")
        coverage.add(key)
        if row["status"] in ("not_evaluable", "not_implemented") and row["sample"]["evaluated"]:
            raise ValueError("Unevaluable coverage cannot claim evaluated opportunities")
        if row["status"] == "complete" and (row["sample"]["eligible"] is None or row["sample"]["eligible"] != row["sample"]["evaluated"]):
            raise ValueError("Complete coverage needs all known opportunities evaluated")
    for row in [*result["coverage"], *result["recommendations"]]:
        sample = row["sample"]
        if not 0 <= sample["flagged"] <= sample["evaluated"] or (sample["eligible"] is not None and sample["evaluated"] > sample["eligible"]):
            raise ValueError("Inconsistent opportunity counts")
        if sample["unit"] == "match" and (result["schemaVersion"] == "1.0.0" or row["period"]["kind"] != "match"):
            raise ValueError("Match opportunities require schema 1.1.0 and match period")
    for row in [*result["coverage"], *result["occurrences"], *result["recommendations"]]:
        if ctx:
            target = row["target"]
            if target["teamId"] not in ctx.teams: raise ValueError("Unknown target team")
            if target["kind"] == "player" and ctx.team(target["playerId"]) != target["teamId"]: raise ValueError("Unknown/mismatched player")
        if row["period"]["kind"] == "round" and rounds and row["period"]["roundNumber"] not in rounds: raise ValueError("Unknown round")
        if "roundNumbers" in row:
            related = row["roundNumbers"]
            if related != sorted(set(related)) or (rounds is not None and not set(related) <= rounds): raise ValueError("Invalid related rounds")
            if row["period"]["kind"] == "round" and related != [row["period"]["roundNumber"]]: raise ValueError("Round scope mismatch")
    for occurrence in occurrences.values():
        if not occurrence["evidence"] or not occurrence["roundNumbers"]: raise ValueError("Occurrence without evidence or rounds")
        if ctx and not set(occurrence["participantIds"]) <= set(ctx.players): raise ValueError("Participants must be player IDs")
        for ev in occurrence["evidence"]:
            if rounds is not None and ev["roundNumber"] not in rounds: raise ValueError("Unknown evidence round")
            if ctx:
                try: pointer(ctx.raw, ev["sourcePath"])
                except (KeyError, IndexError, TypeError, ValueError) as error: raise ValueError(f"Broken evidence pointer: {ev['sourcePath']}") from error
                if ev.get("eventId") and ev["eventId"] not in events: raise ValueError("Unknown event ID")
    # Index both scopes once: preserve the same invariant without scanning every
    # occurrence for each of the thousands of coverage rows in a full analysis.
    counts = Counter()
    def occurrence_key(row, period):
        return (row["detectorId"], row["detectorVersion"], json.dumps(row["target"], sort_keys=True), json.dumps(period, sort_keys=True))
    for occurrence in occurrences.values():
        counts[occurrence_key(occurrence, occurrence["period"])] += 1
        if occurrence["period"]["kind"] != "match":
            counts[occurrence_key(occurrence, {"kind": "match"})] += 1
    for row in result["coverage"]:
        if row["sample"]["flagged"] != counts[occurrence_key(row, row["period"])]:
            raise ValueError("Coverage/occurrence mismatch")
    for rec in result["recommendations"]:
        if rec["tipId"] not in catalog: raise ValueError("Unknown tip ID")
        if not rec["occurrenceIds"] or len(set(rec["occurrenceIds"])) != len(rec["occurrenceIds"]): raise ValueError("Invalid recommendation references")
        refs = []
        for oid in rec["occurrenceIds"]:
            if oid not in occurrences: raise ValueError("Missing occurrence")
            occurrence = occurrences[oid]
            if occurrence["target"] != rec["target"]: raise ValueError("Target mismatch")
            if rec["period"]["kind"] == "round" and occurrence["period"] != rec["period"]: raise ValueError("Period mismatch")
            refs.append(occurrence)
        if rec["roundNumbers"] != sorted({n for o in refs for n in o["roundNumbers"]}): raise ValueError("Related rounds mismatch")
        if rec["sample"]["flagged"] != len(refs): raise ValueError("Occurrence/opportunity mismatch")
    if result["mode"] == "computed" and result["engine"]["version"] == "0.4.0":
        from .report import DETECTORS
        from .review_policy import REVIEW_RULES, select_review_occurrences
        if ctx:
            reverse = {detector: tip for tip, detector in DETECTORS.items()}
            selected = select_review_occurrences(((reverse[o["detectorId"]], o) for o in occurrences.values()), ctx)
        for rec in result["recommendations"]:
            if rec["tipId"] not in REVIEW_RULES:
                raise ValueError("Context or positive occurrence cannot become a review recommendation")
            if any(occurrences[oid]["detectorId"] != DETECTORS[rec["tipId"]] for oid in rec["occurrenceIds"]):
                raise ValueError("Recommendation/detector mismatch")
            if ctx and not set(rec["occurrenceIds"]) <= selected:
                raise ValueError("Recommendation contains a suppressed review occurrence")
    return result
