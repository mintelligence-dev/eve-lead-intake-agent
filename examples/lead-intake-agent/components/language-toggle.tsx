"use client";

import { Button } from "@/components/ui/button";
import { useI18n, useSetLocale } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** TH / EN switch; the choice is kept in a cookie. */
export function LanguageToggle({ className }: { readonly className?: string }) {
  const { locale, t } = useI18n();
  const setLocale = useSetLocale();
  const next = locale === "th" ? "en" : "th";
  return (
    <Button
      aria-label={`${t.common.language}: ${locale.toUpperCase()}`}
      className={cn("font-medium text-xs", className)}
      onClick={() => setLocale(next)}
      size="sm"
      title={next === "en" ? "English" : "ภาษาไทย"}
      type="button"
      variant="ghost"
    >
      {locale === "th" ? "TH" : "EN"}
      <span className="text-muted-foreground">/ {next.toUpperCase()}</span>
    </Button>
  );
}
