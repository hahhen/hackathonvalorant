"use client";

import { useRouter } from "next/navigation";
import { isLocale, localeCookie, localizedHref } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  return (
    <select
      aria-label={t("Language")}
      value={locale}
      className="h-9 shrink-0 rounded-md border border-border bg-card px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
      onChange={(event) => {
        const nextLocale = event.target.value;
        if (!isLocale(nextLocale)) return;
        document.cookie = `${localeCookie}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
        router.replace(localizedHref(location.pathname + location.search + location.hash, nextLocale), { scroll: false });
      }}
    >
      <option value="en" lang="en">English</option>
      <option value="pt-BR" lang="pt-BR">Português</option>
    </select>
  );
}
