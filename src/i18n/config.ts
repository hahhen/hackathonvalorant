export const locales = ["en", "pt-BR"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const localeCookie = "afterplant-locale";

export function isLocale(value: unknown): value is Locale {
  return locales.some((locale) => locale === value);
}

/** Only local page URLs are localized; assets, APIs and external URLs are untouched. */
export function localizedHref(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//") || /^\/(?:api|_next|assets|fonts)(?:\/|\?|$)/.test(href) || /\.[a-z0-9]+(?:[?#]|$)/i.test(href)) return href;
  const path = href.replace(/^\/(en|pt-BR)(?=\/|[?#]|$)/, "");
  return `/${locale}${path === "/" ? "" : path}`;
}
