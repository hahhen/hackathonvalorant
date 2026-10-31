import Image from "next/image";
import Link from "next/link";
import wordmark from "@/app/icon_typo.svg";
import Header from "@/components/layout/header";

export default function Page() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background px-[max(2rem,calc((100vw-1346px)/2))] py-[27px] text-white">
      <Header/>

      <section id="inicio" className="mt-48 max-w-165 max-[760px]:mt-24">
        <h1 className="font-['Schabo_Condensed',Impact,sans-serif] text-[clamp(4rem,6.67vw,6rem)] leading-24 uppercase">
          <span className="text-primary">Outclass </span>Your enemies<br />
          <span className="text-primary">Master</span> your gameplay<br />
          Become <span className="bg-[linear-gradient(0deg,#fff0da_1%,#94641e_3%,#fff2db_56%,#eac885_77%,#bd9a4b_87%,#ecd8a3_95%,#fbf5d1_98%)] bg-clip-text text-transparent">Valorant</span>
        </h1>
        <p className="mt-3 max-w-161.75 text-muted-foreground text-xl leading-normal tracking-[-1px] max-[760px]:text-base">
          Get access to professional-sourced tips and strategies based on your matches, find out what went wrong, and understand how to do better next time. For free!
        </p>
        <Link className="mt-8.75 inline-flex min-h-19 min-w-63.5 items-center justify-center bg-primary font-['Schabo_Condensed',Impact,sans-serif] text-[44px] leading-none text-background uppercase hover:brightness-110" href="/app">Join now</Link>
      </section>

      <footer className="mt-auto flex items-end justify-between gap-6 pt-10 font-mono text-sm tracking-[-0.7px] max-[540px]:flex-col max-[540px]:items-start">
        <Link className="underline" href="/privacy">privacy</Link>
        <p id="contato" className="text-right max-[540px]:text-left">made with &lt;3 by team mmmd<br />images © Riot Games</p>
      </footer>
      <span id="sobre" className="sr-only">Afterplant helps players understand and improve their Valorant matches.</span>
    </main>
  );
}
