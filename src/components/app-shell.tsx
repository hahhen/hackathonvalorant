import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Crosshair,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import wordmark from "@/app/icon_typo.svg";
import icon from "@/app/icon.svg";

const navItem =
  "flex w-full items-center gap-3 rounded-md px-3.5 py-3 text-left text-[14px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground max-[1000px]:justify-center max-[1000px]:[&>span]:hidden";
const activeItem =
  "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground";

export function AppShell({
  children,
  section = "matches",
  onView,
  activeView,
}: {
  children: React.ReactNode;
  section?: "matches" | "review" | "catalog";
  onView?: (view: "overview" | "rounds" | "catalog") => void;
  activeView?: string;
}) {
  return (
    <div className="workspace min-h-screen">
      <aside className="sidebar fixed inset-y-0 left-0 z-20 flex w-56 flex-col border-r border-border bg-sidebar px-3.5 py-4.5 max-[1000px]:w-18 max-[1000px]:px-2.5 max-[650px]:hidden">
        <Link
          href="/"
          className="brand mb-9.5 flex h-16 items-center justify-center max-[1000px]:mb-7"
          aria-label="Afterplant, partidas"
        >
          <Image
            className="wordmark h-16 w-full object-contain max-[1000px]:hidden"
            src={wordmark}
            alt="Afterplant"
            width={206}
            height={64}
            priority
          />
          <Image
            className="compact-logo hidden size-9 max-[1000px]:block"
            src={icon}
            alt=""
            width={35}
            height={35}
          />
        </Link>
        <nav className="grid gap-2" aria-label="Navegação principal">
          <Link
            href="/"
            aria-label="Partidas"
            className={cn(navItem, section === "matches" && activeItem)}
            aria-current={section === "matches" ? "page" : undefined}
          >
            <LayoutGrid size={17} />
            <span>Partidas</span>
          </Link>
          <Link
            href="/catalogo"
            aria-label="Catálogo tático"
            className={cn(navItem, section === "catalog" && activeItem)}
            aria-current={section === "catalog" ? "page" : undefined}
          >
            <BookOpen size={17} />
            <span>Catálogo tático</span>
          </Link>
          {section === "review" && onView && (
            <div className="review-nav mt-7 grid gap-1 border-t border-border pt-6 max-[1000px]:mt-5 max-[1000px]:pt-3.5">
              <span className="sidebar-label px-3.5 pb-3 text-[12px] font-semibold tracking-widest text-muted-foreground max-[1000px]:hidden">
                PARTIDA SELECIONADA
              </span>
              <button
                aria-label="Visão geral"
                onClick={() => onView("overview")}
                className={cn(navItem, activeView === "overview" && activeItem)}
              >
                <LayoutGrid size={16} />
                <span>Visão geral</span>
              </button>
              <button
                aria-label="Inspetor de rounds"
                onClick={() => onView("rounds")}
                className={cn(navItem, activeView === "rounds" && activeItem)}
              >
                <Crosshair size={16} />
                <span>Rounds e eventos</span>
              </button>
            </div>
          )}
        </nav>
      </aside>
      <div className="main-shell ml-56 max-[1000px]:ml-18 max-[650px]:ml-0">
        <header className="topbar flex h-18 items-center justify-between gap-3.5 border-b border-border px-9 max-[1000px]:px-6 max-[650px]:h-16 max-[650px]:px-4.5">
          <div className="breadcrumb flex items-center gap-3 text-sm text-muted-foreground max-[650px]:gap-2 max-[650px]:text-[12px]">
            <Link
              href="/"
              className="mobile-brand hidden max-[650px]:block"
              aria-label="Afterplant, partidas"
            >
              <Image src={icon} alt="" width={27} height={27} />
            </Link>
            {section === "review" ? (
              <>
                <Link
                  href="/"
                  className="back-link inline-flex items-center gap-2 hover:text-foreground"
                >
                  <ArrowLeft size={14} />
                  Partidas
                </Link>
                <ChevronRight size={12} />
                <span>Análise da partida</span>
              </>
            ) : (
              <span>
                {section === "catalog" ? "Catálogo tático" : "Partidas"}
              </span>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-395 px-9 pt-8.5 pb-7 max-[1000px]:px-6 max-[650px]:px-4.5 max-[650px]:pt-6">
          {children}
        </main>
        <footer className="app-footer mx-auto flex max-w-395 justify-between gap-3 px-9 pb-5.5 text-[12px] text-muted-foreground max-[1000px]:px-6 max-[650px]:px-4.5">
          <span>AFTERPLANT</span>
          <span>Imagens © Riot Games</span>
        </footer>
      </div>
    </div>
  );
}
