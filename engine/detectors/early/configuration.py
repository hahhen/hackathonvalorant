"""Parâmetros analíticos, não regras universais do jogo."""

import math

DEFAULTS = {
    "tradeWindowMs": 3000,
    "followupWindowMs": 5000,
    "ecoMaxValue": 1500,
    "fullMinValue": 3900,
    "highSpend": 2000,
    "lowBalance": 1000,
    "equipmentDrop": 1500,
    "equipmentAdvantageRatio": 1.5,
    "movementMinUnits": 300,
    "nearbyUnits": 1500,
    "rareRegionMaxRounds": 2,
    "repeatMinRounds": 2,
    "staleSampleMs": 10000,
    "regulationHalfRounds": 12,
    "regulationWinRounds": 13,
    "maps": {},
}


def configuration(overrides=None):
    if overrides is not None and not isinstance(overrides, dict): raise ValueError("early precisa ser um objeto")
    overrides = overrides or {}
    unknown = set(overrides) - set(DEFAULTS)
    if unknown:
        raise ValueError(f"Parâmetros desconhecidos: {sorted(unknown)}")
    result = DEFAULTS | overrides
    for key, value in result.items():
        if key == "maps":
            if not isinstance(value, dict):
                raise ValueError("maps precisa ser um objeto")
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
            raise ValueError(f"Parâmetro inválido: {key}")
    for key in ("regulationHalfRounds", "regulationWinRounds", "rareRegionMaxRounds", "repeatMinRounds"):
        if not isinstance(result[key], int):
            raise ValueError(f"{key} precisa ser inteiro")
    if result["ecoMaxValue"] >= result["fullMinValue"]:
        raise ValueError("ecoMaxValue deve ser inferior a fullMinValue")
    for map_id, spec in result["maps"].items():
        if not isinstance(map_id, str) or not isinstance(spec, dict): raise ValueError("Mapa inválido")
        if (not isinstance(spec.get("version"), str) or not spec["version"]
                or not isinstance(spec.get("source"), str) or not spec["source"]
                or not isinstance(spec.get("regions"), list) or not spec["regions"]):
            raise ValueError(f"Mapa {map_id}: informe version, source e regions")
        names = set()
        for region in spec["regions"]:
            if not isinstance(region, dict) or not isinstance(region.get("id"), str) or not region["id"] or region["id"] in names:
                raise ValueError("Regiões precisam de IDs únicos")
            names.add(region["id"])
            poly = region.get("polygon", [])
            if not isinstance(poly, list) or len(poly) < 3 or any(not isinstance(p, (list, tuple)) or len(p) != 2 or any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in p) for p in poly):
                raise ValueError("Polígono inválido")
            if not isinstance(region.get("tags", []), list) or any(not isinstance(tag, str) for tag in region.get("tags", [])):
                raise ValueError("Tags inválidas")
    return result


