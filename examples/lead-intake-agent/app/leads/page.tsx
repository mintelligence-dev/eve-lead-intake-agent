import { DownloadIcon, FlaskConicalIcon, LogOutIcon, SearchIcon, ShieldAlertIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Locale, Messages } from "@/lib/i18n/messages";
import { logout } from "@/app/login/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AnalysisBadge } from "./analysis-badge";
import { DetailsSourceBadge, SCORE_ICONS, ScoreBadge } from "./lead-badges";
import { LeadRowActions } from "./lead-row-actions";
import { Pagination } from "./pagination";
import { formatLeadDate } from "./status";
import { fmt } from "@/lib/i18n/messages";
import { getI18n } from "@/lib/i18n/server";
import { LEAD_SCORES, SCORE_LABELS, fieldLabel, oneOf, optionLabel, tableFields, visibleFields, type LeadField, type LeadScore } from "@eve-lead-intake-extension/core";
import type { Lead, LeadView } from "@eve-lead-intake-extension/eve/desk";
import { desk } from "@/lead.desk";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<Lead["status"], string> = {
  new: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  contacted: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  won: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  lost: "bg-muted text-muted-foreground",
  spam: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export default async function LeadsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ q?: string; view?: string; score?: string; page?: string }>;
}) {
  const { q, view, score: scoreParam, page: pageParam } = await searchParams;
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);
  const search = q?.trim() ?? "";
  const leadView: LeadView = view === "spam" || view === "test" ? view : "leads";
  const spamView = leadView === "spam";
  const testView = leadView === "test";
  const score = spamView ? null : oneOf(LEAD_SCORES, scoreParam);
  const viewHref = (target: LeadView) => (target === "leads" ? "/leads" : `/leads?view=${target}`);
  let leads: Lead[] = [];
  let total = 0;
  let spamCount = 0;
  let testCount = 0;
  let error: string | undefined;
  // Fetched together: each await is a database round trip.
  const [allFields, { locale, t }] = await Promise.all([desk.getLeadFields(), getI18n()]);
  const fields = visibleFields(allFields);

  try {
    let result: { leads: Lead[]; total: number };
    let counts: { spam: number; test: number };
    [result, counts] = await Promise.all([
      desk.listLeadsPage(search, { view: leadView, score }, page, PAGE_SIZE),
      desk.countSpamAndTest(),
    ]);
    ({ leads, total } = result);
    ({ spam: spamCount, test: testCount } = counts);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Failed to load leads.";
  }

  // Export what's on screen: same search and same view (leads or spam).
  const exportParams = new URLSearchParams();
  if (search) exportParams.set("q", search);
  if (leadView !== "leads") exportParams.set("view", leadView);
  if (score) exportParams.set("score", score);
  const scoreHref = (value: LeadScore | null) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (leadView !== "leads") params.set("view", leadView);
    if (value) params.set("score", value);
    return `/leads${params.size ? `?${params}` : ""}`;
  };
  const exportHref = `/leads/export${exportParams.size ? `?${exportParams}` : ""}`;
  // Same filters as the current view; only the page number changes.
  const pageHref = (target: number) => {
    const params = new URLSearchParams(exportParams);
    if (target > 1) params.set("page", String(target));
    return `/leads${params.size ? `?${params}` : ""}`;
  };
  // Past the last page (e.g. after deleting its only row): go to page 1.
  if (!error && leads.length === 0 && page > 1) redirect(pageHref(1));

  return (
    <main className="mx-auto flex h-dvh max-w-7xl flex-col gap-4 overflow-hidden p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-medium text-2xl tracking-tight">{spamView ? t.leads.spamTitle : testView ? t.leads.testTitle : t.common.leads}</h1>
          <p className="text-muted-foreground text-sm">
            {search ? fmt(t.leads.searchResult, { q: search }) : ""}
            {fmt(t.leads.count, { n: total })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            {/* Plain anchor: the route returns a file download, not a page. */}
            <a download href={exportHref}>
              <DownloadIcon className="size-4" />
              Export Excel
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/settings/fields">
              <SlidersHorizontalIcon className="size-4" />
              {t.common.fieldSettings}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/s">
              <FlaskConicalIcon className="size-4" />
              {t.common.aiTest}
            </Link>
          </Button>
          <ThemeToggle />
          <form action={logout}>
            <Button aria-label={t.common.logout} size="sm" type="submit" variant="ghost">
              <LogOutIcon className="size-4" />
            </Button>
          </form>
        </div>
      </header>

      <form action="/leads" className="flex max-w-xl items-center gap-2" role="search">
        <div className="relative flex-1">
          <SearchIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
          <Input
            aria-label={t.leads.searchLabel}
            className="pl-9"
            defaultValue={search}
            name="q"
            placeholder={t.leads.searchPlaceholder}
          />
        </div>
        {leadView !== "leads" ? <input name="view" type="hidden" value={leadView} /> : null}
        {score ? <input name="score" type="hidden" value={score} /> : null}
        <Button size="sm" type="submit" variant="outline">
          {t.leads.search}
        </Button>
        {search ? (
          <Button asChild aria-label={t.leads.clearSearch} size="icon-sm" variant="ghost">
            <Link href={viewHref(leadView)}>
              <XIcon className="size-4" />
            </Link>
          </Button>
        ) : null}
        <Button asChild size="sm" variant="ghost">
          <Link href={viewHref(spamView ? "leads" : "spam")}>
            <ShieldAlertIcon className="size-4" />
            {spamView ? t.leads.backToLeads : fmt(t.leads.spamCount, { n: spamCount })}
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={viewHref(testView ? "leads" : "test")}>
            <FlaskConicalIcon className="size-4" />
            {testView ? t.leads.backToLeads : fmt(t.leads.testCount, { n: testCount })}
          </Link>
        </Button>
      </form>

      {spamView ? null : (
        <nav aria-label={t.leads.scoreFilter} className="-mt-1 flex flex-wrap items-center gap-1.5">
          {[null, ...LEAD_SCORES].map((value) => (
            <Button asChild key={value ?? "all"} size="xs" variant={score === value ? "default" : "outline"}>
              <Link href={scoreHref(value)}>{value ? `${SCORE_ICONS[value]} ${SCORE_LABELS[value]}` : t.leads.all}</Link>
            </Button>
          ))}
        </nav>
      )}

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium">{t.leads.loadFailed}</p>
          <p className="mt-1 text-muted-foreground">{error}</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground text-sm">
          {search ? t.leads.noMatch : spamView ? t.leads.noSpam : testView ? t.leads.noTest : t.leads.empty}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr>
                {[
                  t.leads.colDate,
                  t.leads.colScore,
                  t.leads.colContact,
                  t.leads.colEmail,
                  t.leads.colNeeds,
                  t.leads.colCompany,
                  t.leads.colStatus,
                  t.leads.colNotes,
                  "",
                ].map(
                  (label) => (
                    <th
                      className="whitespace-nowrap border-b px-3 py-2 font-medium text-muted-foreground"
                      key={label || "actions"}
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr className="odd:bg-muted/30" key={lead.id}>
                  <td className="whitespace-nowrap border-b px-3 py-2 align-top">
                    {formatLeadDate(lead.createdAt, locale)}
                  </td>
                  <td className="border-b px-3 py-2 align-top">
                    <ScoreBadge reason={lead.scoreReason} score={lead.score} />
                  </td>
                  <ContactCell fields={tableFields(fields, "contact")} lead={lead} locale={locale} sourceLabels={t.source} />
                  <td className="min-w-56 max-w-xs border-b px-3 py-2 align-top">
                    <p className="line-clamp-1 font-medium" title={lead.subject}>
                      {lead.subject}
                    </p>
                    <p className="line-clamp-3 whitespace-pre-wrap text-muted-foreground" title={lead.body}>
                      {lead.body}
                    </p>
                  </td>
                  {lead.analysisStatus === "pending" || lead.analysisStatus === "failed" ? (
                    <td className="border-b px-3 py-2 align-top">
                      <AnalysisBadge leadId={lead.id} status={lead.analysisStatus} />
                    </td>
                  ) : (
                    <NeedsCell fields={tableFields(fields, "needs")} lead={lead} locale={locale} />
                  )}
                  <Cell>{lead.enrichedContext}</Cell>
                  <td className="border-b px-3 py-2 align-top">
                    <span
                      className={cn(
                        "inline-block whitespace-nowrap rounded-full px-2 py-0.5 font-medium text-xs",
                        STATUS_STYLES[lead.status],
                      )}
                    >
                      {t.status[lead.status]}
                    </span>
                  </td>
                  <Cell cellClassName="min-w-40">{lead.notes}</Cell>
                  <td className="border-b px-2 py-1 align-top">
                    <LeadRowActions fields={fields} lead={lead} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {leads.length > 0 ? (
        <Pagination hrefFor={pageHref} labels={t.leads} page={page} pageSize={PAGE_SIZE} total={total} />
      ) : null}
    </main>
  );
}

function Cell({
  children,
  className,
  cellClassName,
}: {
  readonly children: string;
  readonly className?: string;
  readonly cellClassName?: string;
}) {
  return (
    <td className={cn("max-w-xs border-b px-3 py-2 align-top", cellClassName)}>
      <span className={cn("line-clamp-3 whitespace-pre-wrap", className)} title={children}>
        {children}
      </span>
    </td>
  );
}

// Both cells show the fields lead-schema.ts assigns to them, in its order.

/** A filled field's value: phone fields become tap-to-call links. */
function FieldValue({ field, value }: { readonly field: LeadField; readonly value: string }) {
  if (field.type !== "phone") return <>{value}</>;
  return (
    <a className="w-fit underline-offset-2 hover:underline" href={`tel:${value.replace(/[^\d+]/g, "")}`}>
      {value}
    </a>
  );
}

/** Filled fields with their display value (choices shown in the UI language). */
const filled = (lead: Lead, fields: readonly LeadField[], locale: Locale) =>
  fields.flatMap((field) => {
    const value = lead.fields[field.key];
    return value ? [{ field, value: optionLabel(field, value, locale) }] : [];
  });

type CellProps = { readonly lead: Lead; readonly fields: readonly LeadField[]; readonly locale: Locale };

function ContactCell({ lead, fields, locale, sourceLabels }: CellProps & { readonly sourceLabels: Messages["source"] }) {
  const [first, ...rest] = filled(lead, fields, locale);
  return (
    <td className="min-w-48 max-w-xs border-b px-3 py-2 align-top">
      <div className="flex flex-col gap-0.5">
        {first ? (
          <span className="font-medium">
            <FieldValue field={first.field} value={first.value} />
          </span>
        ) : null}
        {rest.map(({ field, value }) => (
          <span className="line-clamp-2" key={field.key} title={fieldLabel(field, locale)}>
            <FieldValue field={field} value={value} />
          </span>
        ))}
        <span className="break-all text-muted-foreground text-xs">{lead.fromEmail}</span>
        <DetailsSourceBadge labels={sourceLabels} lead={lead} />
      </div>
    </td>
  );
}

function NeedsCell({ lead, fields, locale }: CellProps) {
  const [first, ...rest] = filled(lead, fields, locale);
  return (
    <td className="min-w-48 max-w-xs border-b px-3 py-2 align-top">
      <div className="flex flex-col gap-0.5">
        {first ? <span className="font-medium">{first.value}</span> : null}
        {rest.length ? (
          <span className="text-xs">{rest.map(({ field, value }) => `${fieldLabel(field, locale)}: ${value}`).join(" · ")}</span>
        ) : null}
        <span className="line-clamp-2 text-muted-foreground text-xs" title={lead.intent}>
          {lead.intent}
        </span>
      </div>
    </td>
  );
}
