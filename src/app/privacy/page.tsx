import Header from "@/components/layout/header";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Afterplant handles the match data used for analysis.",
};

const sections = [
  {
    title: "What we use",
    body: "Afterplant uses VALORANT match data, such as scores, rounds, agents, events, and loadouts, to provide analysis and improvement tips.",
  },
  {
    title: "Why we use it",
    body: "This information is only used to help you understand what happened in a match, spot areas to improve, and apply professional strategies next time.",
  },
  {
    title: "What we do not do",
    body: "We do not sell match data, show personalized ads, or use your analysis to make decisions about you outside the product.",
  },
  {
    title: "Images and references",
    body: "VALORANT-related images belong to Riot Games. Our recommendations are educational and do not represent a partnership with, approval from, or endorsement by Riot Games.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-[max(2rem,calc((100vw-1346px)/2))] py-[27px] text-white">
      <Header/>

      <article className="mx-auto mt-24 max-w-3xl pb-16 max-[760px]:mt-16">
        <p className="font-['Schabo_Condensed',Impact,sans-serif] text-2xl uppercase text-primary">Afterplant</p>
        <h1 className="mt-2 font-['Schabo_Condensed',Impact,sans-serif] [font-size:clamp(4rem,7vw,6rem)] leading-[0.83] uppercase">
          Privacy
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Transparency matters. This page explains, plainly, how we handle the information used to analyze your matches.
        </p>

        <div className="mt-12 grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="border border-border bg-card p-6 max-[600px]:p-5">
              <h2 className="font-['Schabo_Condensed',Impact,sans-serif] text-3xl uppercase">{section.title}</h2>
              <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-10 text-sm leading-relaxed text-muted-foreground">
          By using Afterplant, you understand that tips are suggestions based on the data available, and that the final decision on how to play is always yours.
        </p>
      </article>
    </main>
  );
}
