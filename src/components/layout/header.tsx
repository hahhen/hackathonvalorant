import Link from "next/link";
import Image from "next/image";
import wordmark from "@/app/icon_typo.svg";

export default function Header() {

    return(
        <header className="flex items-start justify-between gap-8" aria-label="Navegação principal">
        <div className="flex items-center gap-12">
          <Link href="/" aria-label="Afterplant, início">
            <Image src={wordmark} alt="Afterplant" width={131} height={40} priority />
          </Link>
          <nav className="flex items-center gap-12 max-[760px]:hidden" aria-label="Links institucionais">
            <a className="font-['Schabo_Condensed',Impact,sans-serif] text-2xl leading-[1.2] uppercase" href="#inicio">Home</a>
            <Link className="font-['Schabo_Condensed',Impact,sans-serif] text-2xl leading-[1.2] uppercase" href="/privacy">Privacy</Link>
            <a className="font-['Schabo_Condensed',Impact,sans-serif] text-2xl leading-[1.2] uppercase" href="#sobre">About</a>
            <a className="font-['Schabo_Condensed',Impact,sans-serif] text-2xl leading-[1.2] uppercase" href="#contato">Contact</a>
          </nav>
        </div>
        <Link className="bg-primary px-6 py-2 font-['Schabo_Condensed',Impact,sans-serif] text-2xl text-background uppercase hover:brightness-80" href="/app">Enter the app</Link>
      </header>
    )
}