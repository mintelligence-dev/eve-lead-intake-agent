import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, JetBrains_Mono, Manrope, Rubik } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import "./globals.css";

// Mintel UI fonts: Manrope for text, Rubik for headings, IBM Plex Sans Thai
// for Thai, JetBrains Mono for code. globals.css reads these variables.
const sans = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
const heading = Rubik({ variable: "--font-rubik", subsets: ["latin"], display: "swap" });
const thai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Lead Intake Bot",
  description: "AI lead intake: reads customer emails, scores and saves leads, and replies.",
};

// Runs before first paint so the page never flashes the wrong theme.
// Keep the "theme" key in sync with components/theme-toggle.tsx.
const THEME_INIT_SCRIPT = `(function(){var d=false;try{var t=localStorage.getItem("theme");d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches)}catch(e){d=matchMedia("(prefers-color-scheme: dark)").matches}document.documentElement.dataset.theme=d?"dark":"light"})()`;

export default async function RootLayout({ children }: { readonly children: ReactNode }) {
  const { locale, t } = await getI18n();
  return (
    <html className={cn(sans.variable, heading.variable, thai.variable, mono.variable)} lang={locale} suppressHydrationWarning>
      <body>
        <I18nProvider locale={locale} t={t}>
          <TooltipProvider>{children}</TooltipProvider>
        </I18nProvider>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </body>
    </html>
  );
}
