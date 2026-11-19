import type { Locale } from "@/lib/i18n/messages";

const options: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};
const formats: Record<Locale, Intl.DateTimeFormat> = {
  th: new Intl.DateTimeFormat("th-TH", options), // Buddhist-era year, e.g. 5 Oct 2569 10:28
  en: new Intl.DateTimeFormat("en-GB", options), // e.g. 5 Oct 2026, 10:28
};

/** A lead's date in Bangkok time, formatted for the UI language. */
export function formatLeadDate(iso: string, locale: Locale = "th"): string {
  return formats[locale].format(new Date(iso));
}
