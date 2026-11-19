"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { Locale, Messages } from "./messages";

const I18nContext = createContext<{ locale: Locale; t: Messages } | null>(null);

export function I18nProvider({ locale, t, children }: { locale: Locale; t: Messages; children: ReactNode }) {
  return <I18nContext.Provider value={{ locale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): { locale: Locale; t: Messages } {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}

/**
 * Switches the language (cookie, one year). A full reload, because
 * router.refresh() can keep the cached server render in the old language.
 */
export function useSetLocale(): (locale: Locale) => void {
  return (locale) => {
    document.cookie = `lang=${locale}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };
}
