import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PrivacyContent from "@/components/privacy-content";
import { isLocale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslator(locale);
  return { title: t("Privacy"), description: t("How Afterplant handles the match data used for analysis.") };
}
export default function PrivacyPage() { return <PrivacyContent />; }
