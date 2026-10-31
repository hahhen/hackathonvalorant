import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { TooltipProvider } from "@/components/ui/tooltip";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import { I18nProvider } from "@/i18n/provider";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return {
    title: { default: "Afterplant", template: "%s · Afterplant" },
    description: createTranslator(locale)("Análise pós-partida de VALORANT."),
    icons: { icon: "/icon.svg" },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} className="dark">
      <body
        className={`${GeistSans.variable} motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:transition-none`}
      >
        <I18nProvider locale={locale}><TooltipProvider>{children}</TooltipProvider></I18nProvider>
      </body>
    </html>
  );
}
