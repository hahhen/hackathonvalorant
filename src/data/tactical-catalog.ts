import catalog from "./tactical-tips.json";

export type TacticalTip = (typeof catalog.dicas)[number];
export type TipCategory = (typeof catalog.tipos)[number];
export type EvidenceFilter = "all" | "mensuravel" | "indicio";
export const tacticalTips: TacticalTip[] = catalog.dicas;
export const tipCategories = catalog.tipos;
export const dataFields = catalog.campos;

export function getTacticalTip(id: string) {
  const tip = tacticalTips.find((item) => item.id === id);
  if (!tip) throw new Error(`Dica desconhecida: ${id}`);
  return tip;
}

export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function matchesTip(
  tip: TacticalTip,
  query: string,
  level: EvidenceFilter,
  translate: (value: string) => string = (value) => value,
) {
  const text = normalizeSearch(`${tip.id} ${translate(tip.titulo)} ${translate(tip.descricao)}`);
  return (
    text.includes(normalizeSearch(query)) &&
    (level === "all" ||
      tip.classificacao === level ||
      tip.classificacao === "misto")
  );
}
