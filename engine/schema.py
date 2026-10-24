"""Versioned JSON Schema and a dependency-free validator for this schema's subset."""
import json
import math
from pathlib import Path


def obj(properties, required=None):
    return {"type": "object", "properties": properties, "required": list(properties) if required is None else required, "additionalProperties": False}


def array(items): return {"type": "array", "items": items}
STRING = {"type": "string", "minLength": 1}
INT = {"type": "integer", "minimum": 0}
ROUND = {"type": "integer", "minimum": 1}
REF = lambda name: {"$ref": f"#/$defs/{name}"}
SCALAR = {"type": ["string", "number", "boolean", "null"]}
TARGET = {"anyOf": [obj({"kind": {"const": "team"}, "teamId": STRING}), obj({"kind": {"const": "player"}, "teamId": STRING, "playerId": STRING})]}
PERIOD = {"anyOf": [obj({"kind": {"const": "match"}}), obj({"kind": {"const": "round"}, "roundNumber": ROUND})]}
SAMPLE = obj({"unit": {"enum": ["round", "death", "opening", "plant", "match"]}, "eligible": {"anyOf": [INT, {"type": "null"}]}, "evaluated": INT, "flagged": INT})
EVIDENCE = obj({"eventId": STRING, "roundNumber": ROUND, "sourcePath": STRING, "values": {"type": "object", "additionalProperties": SCALAR}}, ["roundNumber", "sourcePath", "values"])
SCHEMA = obj({
    "schemaVersion": {"enum": ["1.0.0", "1.1.0"]}, "mode": {"enum": ["computed", "example"]}, "matchId": STRING,
    "source": obj({"fileName": STRING, "sha256": {"anyOf": [{"type": "string", "pattern": "^[0-9a-f]{64}$"}, {"type": "null"}]}}),
    "engine": obj({"version": STRING, "catalogVersion": INT, "configVersion": STRING}),
    "coverage": array(REF("coverage")), "occurrences": array(REF("occurrence")), "recommendations": array(REF("recommendation")),
})
SCHEMA.update({"$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://afterplant.local/schemas/analysis-result.schema.json", "$defs": {
    "coverage": obj({"detectorId": STRING, "detectorVersion": STRING, "target": TARGET, "period": PERIOD,
                     "status": {"enum": ["complete", "partial", "not_evaluable", "not_implemented"]}, "sample": SAMPLE, "reasons": array(STRING)}),
    "occurrence": obj({"id": STRING, "detectorId": STRING, "detectorVersion": STRING, "target": TARGET, "period": PERIOD,
                       "roundNumbers": array(ROUND), "participantIds": array(STRING), "basis": {"enum": ["measured", "inferred"]},
                       "observation": STRING, "evidence": array(EVIDENCE),
                       "definition": obj({"rule": STRING, "parameters": {"type": "object", "additionalProperties": SCALAR}}), "limitations": array(STRING)}),
    "recommendation": obj({"id": STRING, "tipId": STRING, "target": TARGET, "period": PERIOD, "observation": STRING,
                           "occurrenceIds": array(STRING), "roundNumbers": array(ROUND), "sample": SAMPLE,
                           "priority": {"enum": ["low", "medium", "high"]}, "priorityReasons": array(STRING), "limitations": array(STRING)}),
}, "allOf": [{"if": {"properties": {"mode": {"const": "computed"}}}, "then": {"properties": {"source": {"properties": {"sha256": {"type": "string", "pattern": "^[0-9a-f]{64}$"}}}}}}]})


def validate_structure(value, schema=None, path="$"):
    schema = schema or SCHEMA
    if "$ref" in schema:
        return validate_structure(value, SCHEMA["$defs"][schema["$ref"].split("/")[-1]], path)
    if "anyOf" in schema:
        for variant in schema["anyOf"]:
            try:
                validate_structure(value, variant, path)
                return
            except ValueError: pass
        raise ValueError(f"{path}: no schema alternative matched")
    if "const" in schema and value != schema["const"]: raise ValueError(f"{path}: invalid constant")
    if "enum" in schema and value not in schema["enum"]: raise ValueError(f"{path}: invalid enum")
    types = schema.get("type", [])
    if isinstance(types, str): types = [types]
    matches = {"object": isinstance(value, dict), "array": isinstance(value, list), "string": isinstance(value, str),
               "integer": isinstance(value, int) and not isinstance(value, bool),
               "number": isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value),
               "boolean": isinstance(value, bool), "null": value is None}
    if types and not any(matches[t] for t in types): raise ValueError(f"{path}: invalid type")
    if isinstance(value, (float, int)) and not isinstance(value, bool):
        if not math.isfinite(value) or value < schema.get("minimum", -math.inf): raise ValueError(f"{path}: invalid number")
    if isinstance(value, str) and len(value) < schema.get("minLength", 0): raise ValueError(f"{path}: empty string")
    if isinstance(value, dict):
        if not set(schema.get("required", [])) <= set(value): raise ValueError(f"{path}: missing fields")
        properties, extra = schema.get("properties", {}), schema.get("additionalProperties", True)
        for key, item in value.items():
            if key in properties: validate_structure(item, properties[key], f"{path}.{key}")
            elif extra is False: raise ValueError(f"{path}: unexpected field {key}")
            elif isinstance(extra, dict): validate_structure(item, extra, f"{path}.{key}")
    if isinstance(value, list) and "items" in schema:
        for i, item in enumerate(value): validate_structure(item, schema["items"], f"{path}[{i}]")


if __name__ == "__main__":
    output = Path(__file__).parent / "schemas" / "analysis-result.schema.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(SCHEMA, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(output)
