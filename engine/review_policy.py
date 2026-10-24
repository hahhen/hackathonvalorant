"""Select coaching candidates, not every observable fact.

Raw occurrences/coverage stay intact for audit. A new detector is context-only
until its negative, actionable trigger has been explicitly reviewed here.
Selection never infers a tactical mistake, intention, blame or causality.
"""

POLICY_VERSION = "review-points-1"

# Deliberately small: successful trades, inventories, movement alone, low HS%
# without weapon attribution and mere defeats are not improvement diagnoses.
REVIEW_RULES = {
    "010": "Revisar o alinhamento da compra: um jogador com equipamento completo e quatro em economia.",
    "013": "Revisar a conversão da vantagem de equipamento registrada na derrota.",
    "025": "Revisar a conservação da abertura: o time perdeu após o primeiro abate ou seu autor morreu logo em seguida.",
    "030": "Revisar a possibilidade de apoio: morte sem aliado próximo no snapshot e sem resposta na janela observada.",
    "062": "Revisar a sobrevivência após o plant: houve morte atacante nos primeiros segundos.",
    "072": "Revisar a gestão do tempo: o ataque perdeu pelo relógio sem concluir o plant.",
    "079": "Revisar a conversão da vantagem: o time perdeu após ficar com pelo menos dois jogadores contra um.",
    "084": "Revisar a continuidade após o segundo pick de Operator: aproximação amostrada seguida de morte rápida.",
    "093": "Revisar o primeiro contato: primeira morte do round com contribuição de dano limitada.",
}

# Related versions of the same review topic: keep the more specific signal for
# the SAME recipient and round, before building both round and match summaries.
FAMILIES = {"025": ("numerical-conversion", 1), "079": ("numerical-conversion", 2),
            "093": ("opening-contact", 1), "030": ("opening-contact", 2)}


def select_review_occurrences(rows, ctx):
    """Return selected IDs; no cap, ranking quota, text matching or loss-only filter."""
    import json

    selected, families = set(), {}
    for tip, occurrence in rows:
        if tip not in REVIEW_RULES:
            continue
        # Unknown winner must not be interpreted as a loss by a detector's
        # `winner != team` comparison. These candidates need an actual result.
        if tip in {"013", "025", "072", "079"}:
            r = next((r for r in ctx.rounds if r.number == occurrence["period"].get("roundNumber")), None)
            if r is None or r.raw.get("winningTeam") not in ctx.teams:
                continue
        family = FAMILIES.get(tip)
        if not family:
            selected.add(occurrence["id"])
            continue
        key = (json.dumps(occurrence["target"], sort_keys=True),
               json.dumps(occurrence["period"], sort_keys=True), family[0])
        families.setdefault(key, []).append((family[1], occurrence))
    for candidates in families.values():
        rank = max(rank for rank, _ in candidates)
        selected.update(o["id"] for priority, o in candidates if priority == rank)
    return selected
