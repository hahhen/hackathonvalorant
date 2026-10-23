import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Afterplant", template: "%s · Afterplant" },
  description: "Análise pós-partida de VALORANT.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${GeistSans.variable} motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:transition-none`}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
