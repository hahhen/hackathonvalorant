"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import { createTranslator, formatMatchDate } from "./translate";

const LocaleContext = createContext<Locale | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const locale = useContext(LocaleContext);
  if (!locale) throw new Error("useI18n must be used within I18nProvider");
  return useMemo(() => ({
    locale,
    t: createTranslator(locale),
    number: (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat(locale).format(value),
    date: (value: string) => formatMatchDate(value, locale),
  }), [locale]);
}
