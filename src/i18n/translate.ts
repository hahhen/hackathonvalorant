import en from "./messages/en.json";
import pt from "./messages/pt-BR.json";
import type { Locale } from "./config";

export type Values = Record<string, string | number | null | undefined>;
const messages: Record<Locale, Record<string, string>> = { en, "pt-BR": pt };
const messageFor = (locale: Locale, key: string) =>
  Object.prototype.hasOwnProperty.call(messages[locale], key) ? messages[locale][key] : undefined;

/** Source strings are message IDs. Unknown source content is preserved verbatim. */
export function createTranslator(locale: Locale) {
  function t<T>(message: T, values?: Values): T extends string ? string : T;
  function t(message: unknown, values?: Values): unknown {
    if (typeof message !== "string") return message;
    const pluralKey = typeof values?.count === "number"
      ? `${message}.${new Intl.PluralRules(locale).select(values.count)}`
      : message;
    const translated = messageFor(locale, pluralKey) ?? messageFor(locale, message) ?? message;
    if (!values) return translated;
    return translated.replace(/\{(\w+)\}/g, (placeholder, key: string) => {
      const value = values[key];
      return value == null ? placeholder : String(value);
    });
  }
  return t;
}

export function formatMatchDate(value: string, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

/** Importer metrics use this fixed source format; never rewrite arbitrary report prose. */
export function formatMetricDetail(detail: string, locale: Locale) {
  const t = createTranslator(locale);
  const match = /^(\d+) de (\d+) (rounds|mortes|plants) · (.+)$/.exec(detail);
  if (!match) return t(detail);
  return t("{won} of {total} {unit} · {team}", {
    won: match[1], total: match[2], unit: t(match[3]), team: t(match[4]),
  });
}

export function formatEventLabel(label: string, locale: Locale) {
  const t = createTranslator(locale);
  if (label.startsWith("Eliminação com ")) {
    return t("Kill with {ability}", { ability: t(label.slice("Eliminação com ".length)) });
  }
  if (label.startsWith("Spike plantada no ")) {
    return t("Spike planted at {site}", { site: label.slice("Spike plantada no ".length) });
  }
  const trade = /^Retaliação em ([\d,]+) s$/.exec(label);
  if (trade) return t("Trade after {seconds} s", { seconds: new Intl.NumberFormat(locale).format(Number(trade[1].replace(",", "."))) });
  return t(label);
}
