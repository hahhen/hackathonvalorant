/** Shared category accents. Values live in the shadcn theme, not components. */
const themes: Record<string, { text: string; badge: string; card: string }> = {
  economia: {
    text: "text-tip-economia",
    badge: "text-tip-economia bg-tip-economia/10 border-tip-economia/30",
    card: "border-tip-economia/30 bg-tip-economia/5 hover:border-tip-economia/60",
  },
  pistol: {
    text: "text-tip-pistol",
    badge: "text-tip-pistol bg-tip-pistol/10 border-tip-pistol/30",
    card: "border-tip-pistol/30 bg-tip-pistol/5 hover:border-tip-pistol/60",
  },
  posicionamento: {
    text: "text-tip-posicionamento",
    badge:
      "text-tip-posicionamento bg-tip-posicionamento/10 border-tip-posicionamento/30",
    card: "border-tip-posicionamento/30 bg-tip-posicionamento/5 hover:border-tip-posicionamento/60",
  },
  "trabalho-em-equipe": {
    text: "text-tip-trabalho-em-equipe",
    badge:
      "text-tip-trabalho-em-equipe bg-tip-trabalho-em-equipe/10 border-tip-trabalho-em-equipe/30",
    card: "border-tip-trabalho-em-equipe/30 bg-tip-trabalho-em-equipe/5 hover:border-tip-trabalho-em-equipe/60",
  },
  objetivo: {
    text: "text-tip-objetivo",
    badge: "text-tip-objetivo bg-tip-objetivo/10 border-tip-objetivo/30",
    card: "border-tip-objetivo/30 bg-tip-objetivo/5 hover:border-tip-objetivo/60",
  },
  clutch: {
    text: "text-tip-clutch",
    badge: "text-tip-clutch bg-tip-clutch/10 border-tip-clutch/30",
    card: "border-tip-clutch/30 bg-tip-clutch/5 hover:border-tip-clutch/60",
  },
  operator: {
    text: "text-tip-operator",
    badge: "text-tip-operator bg-tip-operator/10 border-tip-operator/30",
    card: "border-tip-operator/30 bg-tip-operator/5 hover:border-tip-operator/60",
  },
  mira: {
    text: "text-tip-mira",
    badge: "text-tip-mira bg-tip-mira/10 border-tip-mira/30",
    card: "border-tip-mira/30 bg-tip-mira/5 hover:border-tip-mira/60",
  },
  habilidades: {
    text: "text-tip-habilidades",
    badge:
      "text-tip-habilidades bg-tip-habilidades/10 border-tip-habilidades/30",
    card: "border-tip-habilidades/30 bg-tip-habilidades/5 hover:border-tip-habilidades/60",
  },
};
export const tipCategoryTheme = (id: string) =>
  themes[id] ?? {
    text: "text-muted-foreground",
    badge: "text-muted-foreground bg-muted border-border",
    card: "border-border bg-card",
  };
