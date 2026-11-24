"use client";

import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { LanguageToggle } from "./language-toggle";

type Theme = "light" | "dark" | "system";

// Keep in sync with THEME_INIT_SCRIPT in app/layout.tsx.
const STORAGE_KEY = "theme";

const OPTIONS = [
  { value: "light", Icon: SunIcon },
  { value: "dark", Icon: MoonIcon },
  { value: "system", Icon: MonitorIcon },
] as const;

function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function readSavedTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

/** Language (TH/EN) and theme switches, shown together in every page header. */
export function ThemeToggle({ className }: { readonly className?: string }) {
  const { t } = useI18n();
  // null until mounted, so server and first client render match.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => setTheme(readSavedTheme()), []);

  useEffect(() => {
    if (theme === null) return;
    applyTheme(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const choose = (next: Theme) => {
    setTheme(next);
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice still applies for this page view.
    }
  };

  const current = OPTIONS.find((option) => option.value === (theme ?? "system")) ?? OPTIONS[2];

  return (
    <div className={cn("pointer-events-auto flex items-center", className)}>
    <LanguageToggle />
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t.theme.label.replace("{name}", t.theme[current.value])}
          size="sm"
          title={t.theme.change}
          type="button"
          variant="ghost"
        >
          <current.Icon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {OPTIONS.map(({ value, Icon }) => (
          <DropdownMenuItem key={value} onSelect={() => choose(value)}>
            <Icon className="size-4" />
            <span className="flex-1">{t.theme[value]}</span>
            {theme === value ? <CheckIcon className="size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
}
