"use client";

import { useI18n } from "./provider";

/** Engine reports are source material. Mark untranslated text with its real language. */
export function AnalysisText({ text }: { text: string }) {
  const { locale, t } = useI18n();
  const translated = t(text);
  const original = locale === "en" && translated === text;
  return <span lang={original ? "pt-BR" : locale} title={original ? t("Original analysis (Portuguese)") : undefined}>{translated}</span>;
}
