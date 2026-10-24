"""Registro explícito dos detectores das seções 4.1, 4.2 e 4.3."""

from dataclasses import dataclass, field
from math import hypot

TEAM = {2, 4, 5, 7, 8, 10, 11, 13, 14, 22}
MATCH_PERIOD = {1, 3, 6, 7, 12, 14, 28, 31, 36}
MEASURED = {8, 13, 14, 21, 22, 25}

LIMITS = {
    "economy": "Equipamento registrado não prova compra, drop, arma preservada nem intenção; habilidades adquiridas não constam.",
    "pistol": "Finalizações não incluem tentativas sem abate; arma do equipamento não identifica a arma de todo o dano. Função e escape disponível não constam.",
    "position": "Snapshots não mostram trajetória, paredes, visibilidade, altura, comunicação ou utilidade; proximidade não comprova cobertura. Ausência de deslocamento observado não prova imobilidade.",
}


@dataclass
class Finding:
    available: bool = True
    flagged: bool = False
    observation: str = ""
    evidence: list = field(default_factory=list)
    reasons: list = field(default_factory=list)
    applicable: bool = True


def unavailable(reason, applicable=True):
    return Finding(available=False, reasons=[reason], applicable=applicable)


def found(text, evidence, reasons=None):
    return Finding(flagged=True, observation=text, evidence=evidence, reasons=reasons or [])


def distance(a, b):
    return hypot(a["x"] - b["x"], a["y"] - b["y"])


def equipment_class(value, cfg):
    return "eco" if value <= cfg["ecoMaxValue"] else "full" if value >= cfg["fullMinValue"] else "semi"


class Context:
    def __init__(self, match, cfg, dictionary):
        self.match, self.cfg, self.dictionary = match, cfg, dictionary
        self.geometry = cfg["maps"].get(match.map_id)

    def name(self, group, identifier):
        return self.dictionary.get(group, {}).get(str(identifier).lower(), {}).get("nome")

    def members(self, team):
        return sorted(p for p in self.match.players if self.match.team(p) == team)

    def agent(self, pid):
        return self.name("agentes", self.match.players[pid].get("characterId"))

    def region(self, pos):
        if not pos or not self.geometry:
            return None
        # Pontos na borda são incluídos; sobreposições ambíguas não recebem região.
        matches = []
        x, y = pos["x"], pos["y"]
        for region in self.geometry["regions"]:
            poly = region["polygon"]
            inside, boundary = False, False
            for i in range(len(poly)):
                a, b = poly[i - 1], poly[i]
                cross = (x - a[0]) * (b[1] - a[1]) - (y - a[1]) * (b[0] - a[0])
                if abs(cross) < 1e-8 and min(a[0], b[0]) <= x <= max(a[0], b[0]) and min(a[1], b[1]) <= y <= max(a[1], b[1]):
                    boundary = True
                if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
                    inside = not inside
            if inside or boundary:
                matches.append(region)
        return matches[0] if len(matches) == 1 else None
