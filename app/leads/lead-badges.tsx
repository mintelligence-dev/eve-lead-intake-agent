import { BotIcon, CheckCircle2Icon, HourglassIcon } from "lucide-react";
import { type LeadScore, SCORE_LABELS } from "../../agent/lib/lead-details";
import type { Lead } from "../../agent/lib/leads-db";
import type { Messages } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

export const SCORE_STYLES: Record<LeadScore, string> = {
  hot: "bg-red-500/15 text-red-700 dark:text-red-300",
  warm: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  cold: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
};
export const SCORE_ICONS: Record<LeadScore, string> = { hot: "🔥", warm: "🟠", cold: "🔵" };

export function ScoreBadge({ score, reason }: { readonly score: LeadScore | null; readonly reason: string }) {
  if (!score) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span
      className={cn("inline-block whitespace-nowrap rounded-full px-2 py-0.5 font-medium text-xs", SCORE_STYLES[score])}
      title={reason || undefined}
    >
      {SCORE_ICONS[score]} {SCORE_LABELS[score]}
    </span>
  );
}

/** Where the contact details came from: customer form, waiting for it, or the AI. */
export function DetailsSourceBadge({ lead, labels }: { readonly lead: Lead; readonly labels: Messages["source"] }) {
  if (lead.detailsSource === "customer") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700 text-xs dark:text-emerald-300" title={labels.customerTitle}>
        <CheckCircle2Icon className="size-3.5" />
        {labels.customer}
      </span>
    );
  }
  if (lead.formSentAt) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs" title={labels.waitingTitle}>
        <HourglassIcon className="size-3.5" />
        {labels.waiting}
      </span>
    );
  }
  if (lead.detailsSource === "ai") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs" title={labels.aiTitle}>
        <BotIcon className="size-3.5" />
        {labels.ai}
      </span>
    );
  }
  return null;
}
