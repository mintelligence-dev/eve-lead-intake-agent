import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import "./globals.css";

const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

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
    <html className={cn(sans.variable, mono.variable)} lang={locale} suppressHydrationWarning>
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
