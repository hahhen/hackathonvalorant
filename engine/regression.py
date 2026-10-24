"""Read-only regression across organization data; optionally export the four product matches."""
import argparse
import hashlib
import json
from collections import Counter
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from .runner import ROOT, analyze_match


def check_file(path):
    """Independent full validation; safe to distribute without sharing mutable context."""
    data = path.read_bytes()
    result = analyze_match(data, path.name)
    assert result == analyze_match(data, path.name)
    assert result["source"]["sha256"] == hashlib.sha256(data).hexdigest()
    raw = json.loads(data)
    status = Counter(c["status"] for c in result["coverage"])
    tips = Counter(r["tipId"] for r in result["recommendations"])
    # Keep only four full results across process boundaries; aggregate the others.
    product = path.name.startswith(("UNIVAVA_C4_041_", "UNIVAVA_C4_053_", "UNIVAVA_C4_059_", "UNIVAVA_C4_062_"))
    return path, raw, status, tips, result if product else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, default=ROOT / "Dados .Json")
    parser.add_argument("--write-usp", action="store_true")
    parser.add_argument("--workers", type=int, default=1, help="Independent validation processes (1–8)")
    args = parser.parse_args()
    if not 1 <= args.workers <= 8: parser.error("--workers must be between 1 and 8")
    files = sorted(args.input_dir.rglob("*.json"))
    if not files: raise ValueError("Organization JSONs are required for regression")
    status, tips, unknown_agents, unknown_weapons = Counter(), Counter(), Counter(), Counter()
    total_rounds, total_kills, exported = 0, 0, []
    shared_ids = json.loads((ROOT / "engine/data/valorant-ids.json").read_text(encoding="utf-8"))
    pool = ProcessPoolExecutor(max_workers=args.workers) if args.workers > 1 else None
    rows = pool.map(check_file, files) if pool else map(check_file, files)
    for i, (path, raw, file_status, file_tips, result) in enumerate(rows):
        total_rounds += len(raw["roundResults"])
        status.update(file_status)
        tips.update(file_tips)
        for player in raw["players"]:
            if not player.get("isObserver") and str(player.get("characterId", "")).lower() not in shared_ids["agentes"]:
                unknown_agents[player.get("characterId")] += 1
        for round_data in raw["roundResults"]:
            for player_stats in round_data["playerStats"]:
                for kill in player_stats.get("kills") or []:
                    total_kills += 1
                    damage = kill.get("finishingDamage") or {}
                    if damage.get("damageType") == "Weapon" and str(damage.get("damageItem") or "").lower() not in shared_ids["armas"]:
                        unknown_weapons[damage.get("damageItem") or "<empty>"] += 1
        if args.write_usp and result is not None:
            output = ROOT / "src/data/analyses" / f"{result['matchId']}.json"
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(json.dumps(result, ensure_ascii=False, allow_nan=False, indent=2) + "\n", encoding="utf-8")
            exported.append(str(output.relative_to(ROOT)))
        if (i + 1) % 10 == 0: print(f"Validated {i+1}/{len(files)} matches", flush=True)
    if pool: pool.shutdown()
    print(json.dumps({"status": "OK", "matches": len(files), "rounds": total_rounds, "kills": total_kills,
                      "coverageStatuses": dict(status), "tipsWithRecommendations": sorted(tips),
                      "unknownAgents": dict(unknown_agents), "unknownWeapons": dict(unknown_weapons),
                      "exported": exported}, ensure_ascii=False))


if __name__ == "__main__": main()
