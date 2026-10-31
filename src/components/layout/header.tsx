"use client";
import { useI18n } from "@/i18n/provider";
import Link from "@/i18n/link";
import Image from "next/image";
import wordmark from "@/app/icon_typo.svg";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function Header() {
  const { t } = useI18n();

    return(
        <header className="flex flex-wrap items-center justify-between gap-4" aria-label={t("Navegação principal")}>
        <div className="flex items-center gap-12">
          <Link href="/" aria-label={t("Afterplant, início")}>
            <Image src={wordmark} alt={t("Afterplant")} width={131} height={40} priority />
          </Link>
          <nav className="flex items-center gap-12 max-[760px]:hidden" aria-label={t("Links institucionais")}>
            <Link className="font-['Schabo_Condensed',Impact,sans-serif] text-2xl leading-[1.2] uppercase" href="/#inicio">{t("Home")}</Link>
            <Link className="font-['Schabo_Condensed',Impact,sans-serif] text-2xl leading-[1.2] uppercase" href="/privacy">{t("Privacy")}</Link>
            <Link className="font-['Schabo_Condensed',Impact,sans-serif] text-2xl leading-[1.2] uppercase" href="/#sobre">{t("About")}</Link>
            <Link className="font-['Schabo_Condensed',Impact,sans-serif] text-2xl leading-[1.2] uppercase" href="/#contato">{t("Contact")}</Link>
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LanguageSwitcher />
          <Link className="bg-primary px-6 py-2 font-['Schabo_Condensed',Impact,sans-serif] text-2xl text-background uppercase hover:brightness-80" href="/app">{t("Enter the app")}</Link>
        </div>
      </header>
    )
}
