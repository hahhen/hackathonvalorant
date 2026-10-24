import hashlib
import json
from dataclasses import asdict
from pathlib import Path
from .config import Config
from .context import Context
from .report import Report
from .validate import validate_result
from .detectors import operator, aim, abilities, teamwork, objective, clutch, early
from .detectors.early.configuration import configuration as early_configuration
from .review_policy import POLICY_VERSION, REVIEW_RULES, FAMILIES

ROOT = Path(__file__).resolve().parent.parent
CATEGORIES = ("economia", "pistol", "posicionamento", "trabalho-em-equipe", "objetivo", "clutch", "operator", "mira", "habilidades")
# Teammates add modules here, without modifying the opportunity ledger or UI contract.
MODULES = (early, teamwork, objective, clutch, operator, aim, abilities)


def analyze_match(raw_bytes: bytes, file_name: str, *, ids=None, config=None, catalog=None, ability_catalog=None):
    def read(path): return json.loads(Path(path).read_text(encoding="utf-8-sig"))
    raw = json.loads(raw_bytes.decode("utf-8-sig"), parse_constant=lambda value: (_ for _ in ()).throw(ValueError(f"Non-finite JSON constant: {value}")))
    ids = ids if ids is not None else read(Path(__file__).parent / "data" / "valorant-ids.json")
    if not all(isinstance(ids.get(key), dict) for key in ("agentes", "armas", "mapas", "escudos")):
        raise ValueError("Use the shared Portuguese valorant-ids.json (agentes/armas/mapas/escudos)")
    catalog = catalog if catalog is not None else read(ROOT / "src/data/tactical-tips.json")
    selected = {t["id"]: t for t in catalog["dicas"] if t["tipo"] in CATEGORIES}
    if set(selected) != {f"{n:03}" for n in range(1, 101)}: raise ValueError("Expected exactly tips 001–100 in the selected categories")
    cfg = Config.from_dict(asdict(config) if isinstance(config, Config) else config)
    if ability_catalog is None:
        path = ROOT / "src/data/agents.json"
        ability_catalog = read(path) if path.exists() else {}
    ctx = Context(raw, ids, ability_catalog)
    match_id = (raw.get("matchInfo") or {}).get("matchId")
    if not isinstance(match_id, str) or not match_id: raise ValueError("Original matchInfo.matchId is required")
    report = Report(ctx, selected, cfg, match_id)
    for module in MODULES: module.evaluate(ctx, report, cfg)
    coverage, occurrences, recommendations = report.finish()
    configuration = json.dumps({"categories": CATEGORIES, "thresholds": asdict(cfg) | {"early": early_configuration(cfg.early)}, "ids": ids, "abilities": ability_catalog,
                                "reviewPolicy": {"version": POLICY_VERSION, "rules": REVIEW_RULES, "families": FAMILIES}}, sort_keys=True, ensure_ascii=False)
    result = {"schemaVersion": "1.1.0", "mode": "computed", "matchId": match_id,
              "source": {"fileName": Path(file_name).name, "sha256": hashlib.sha256(raw_bytes).hexdigest()},
              "engine": {"version": "0.4.0", "catalogVersion": catalog["versao"], "configVersion": hashlib.sha256(configuration.encode()).hexdigest()[:16]},
              "coverage": coverage, "occurrences": occurrences, "recommendations": recommendations}
    return validate_result(result, selected, ctx)
