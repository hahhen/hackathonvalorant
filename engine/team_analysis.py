"""Generate the active team's analyses from the import manifest, validating original hashes."""
import hashlib
import json
from pathlib import Path
from .runner import ROOT, analyze_match
from .report import DETECTORS


def main():
    (ROOT / "src/data/engine-detectors.json").write_text(json.dumps(DETECTORS, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest = json.loads((ROOT / "src/data/team-sources.json").read_text(encoding="utf-8"))
    output = ROOT / "src/data/analyses"
    output.mkdir(parents=True, exist_ok=True)
    rounds = kills = 0
    for entry in manifest["entries"]:
        path = (ROOT / entry["path"]).resolve()
        if not path.is_relative_to((ROOT / "Dados .Json").resolve()): raise ValueError("Source outside organization data")
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != entry["sha256"]: raise ValueError("Reimport changed source before analysis")
        result = analyze_match(data, path.name)
        if result["matchId"] != entry["matchId"]: raise ValueError("Match identity mismatch")
        (output / f"{result['matchId']}.json").write_text(json.dumps(result, ensure_ascii=False, allow_nan=False, indent=2) + "\n", encoding="utf-8")
        raw = json.loads(data)
        rounds += len(raw["roundResults"])
        kills += sum(len(s.get("kills") or []) for r in raw["roundResults"] for s in r["playerStats"])
        print(f"Analyzed {entry['file']}: {len(result['recommendations'])} recommendations", flush=True)
    print(json.dumps({"team": manifest["team"], "matches": len(manifest["entries"]), "rounds": rounds, "kills": kills}), flush=True)


if __name__ == "__main__": main()
