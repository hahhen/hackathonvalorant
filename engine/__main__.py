"""python -m engine INPUT.json --output OUTPUT.json [--ids SHARED.json] [--config CONFIG.json]"""
import argparse
import json
from pathlib import Path
from .runner import analyze_match, CATEGORIES


def main():
    parser = argparse.ArgumentParser(description="Offline analysis: all nine categories, tips 001–100.")
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", "-o", type=Path)
    parser.add_argument("--ids", type=Path, help="Shared valorant-ids.json")
    parser.add_argument("--config", type=Path, help="Threshold overrides as JSON")
    args = parser.parse_args()
    read = lambda p: json.loads(p.read_text(encoding="utf-8-sig")) if p else None
    result = analyze_match(args.input.read_bytes(), args.input.name, ids=read(args.ids), config=read(args.config))
    output = args.output or Path("src/data/analyses") / f"{result['matchId']}.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, allow_nan=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output), "matchId": result["matchId"], "categories": CATEGORIES, "occurrences": len(result["occurrences"]), "recommendations": len(result["recommendations"])}, ensure_ascii=False))


if __name__ == "__main__": main()
