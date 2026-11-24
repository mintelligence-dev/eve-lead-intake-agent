"use client";

import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n/client";
import type { AnalysisStatus } from "@eve-lead-intake/eve/desk";


// Shown in place of the intent while an email lead's AI analysis is pending or
// has failed. The raw email is already saved, so the team can act on it anyway.
// The "re-analyze" button hands the email back to the agent right away; when it
// finishes, the row is updated and the reply email goes out.
export function AnalysisBadge({ leadId, status }: { readonly leadId: number; readonly status: AnalysisStatus }) {
  const router = useRouter();
  const { t } = useI18n();
  const [sending, setSending] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [error, setError] = useState<string>();

  // After a dispatch, refresh the table until the analysis lands (or ~2 min).
  useEffect(() => {
    if (!dispatched) return;
    let ticks = 0;
    const timer = setInterval(() => {
      router.refresh();
      if (++ticks >= 24) {
        clearInterval(timer);
        setDispatched(false);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [dispatched, router]);

  async function reanalyze() {
    setSending(true);
    setError(undefined);
    try {
      const response = await fetch(`/eve/v1/lead-admin/reanalyze/${leadId}`, { method: "POST" });
      if (response.ok) setDispatched(true);
      else
        setError(
          response.status === 401 ? t.common.loginAgain : response.status === 409 ? t.analysis.tooSoon : t.analysis.retryFailed,
        );
    } catch {
      setError(t.analysis.retryFailed);
    } finally {
      setSending(false);
    }
  }

  const failed = status === "failed" && !dispatched;

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap text-xs">
      {failed ? (
        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
          <AlertTriangleIcon className="size-3.5" />
          {t.analysis.failed}
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-1 text-muted-foreground"
          title={t.analysis.analyzingTitle}
        >
          <Spinner className="size-3" />
          {t.analysis.analyzing}
        </span>
      )}
      {!dispatched && (
        <Button
          disabled={sending}
          onClick={reanalyze}
          size="xs"
          title={error ?? t.analysis.retryTitle}
          type="button"
          variant="outline"
        >
          {sending ? <Spinner className="size-3" /> : <RefreshCwIcon />}
          {t.analysis.retry}
        </Button>
      )}
      {error && <span className="text-destructive">{error}</span>}
    </div>
  );
}
