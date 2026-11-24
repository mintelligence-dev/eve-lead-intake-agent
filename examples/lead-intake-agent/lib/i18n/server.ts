import { cookies, headers } from "next/headers";
import { LOCALES, type Locale, MESSAGES, type Messages } from "./messages";

export const LOCALE_COOKIE = "lang";

/** The visitor's language: the "lang" cookie, else the browser's Accept-Language (Thai by default). */
export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (LOCALES.includes(saved as Locale)) return saved as Locale;
  const accept = (await headers()).get("accept-language") ?? "";
  const first = accept.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("en") ? "en" : "th";
}

export async function getI18n(): Promise<{ locale: Locale; t: Messages }> {
  const locale = await getLocale();
  return { locale, t: MESSAGES[locale] };
}
