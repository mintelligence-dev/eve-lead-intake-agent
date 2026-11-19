import { claimStuckAnalyses, type StuckAnalysis } from "./leads-db";

// Email leads are saved raw before the agent runs (see channels/resend.ts). If
// the agent never completes one (model outage, crash), it is dispatched again:
// on the next inbound email and by the daily schedule. After MAX_ATTEMPTS it is
// marked "failed" — still visible on /leads with a retry button.

export const MAX_ANALYSIS_ATTEMPTS = 3;
const STALE_MINUTES = 10;

/** The plain-text message shape the agent's instructions expect. */
export function leadPrompt(email: {
  readonly type: "new-lead" | "follow-up";
  readonly fromEmail: string;
  readonly subject: string;
  readonly body: string;
  readonly leadId?: number;
}): string {
  return [
    `Type: ${email.type}`,
    ...(email.leadId !== undefined ? [`Lead-Id: ${email.leadId}`] : []),
    `From: ${email.fromEmail}`,
    `Subject: ${email.subject}`,
    "",
    email.body,
  ].join("\n");
}

/**
 * Re-sends stuck analyses to the agent through `dispatch` (a channel send into
 * the original email thread, so the reply still goes to the customer).
 * Never throws.
 */
export async function redispatchStuckAnalyses(
  dispatch: (row: StuckAnalysis, prompt: string) => Promise<unknown>,
  limit = 3,
): Promise<number> {
  let sent = 0;
  try {
    const rows = await claimStuckAnalyses(MAX_ANALYSIS_ATTEMPTS, STALE_MINUTES, limit);
    for (const row of rows) {
      try {
        await dispatch(
          row,
          leadPrompt({ type: "new-lead", fromEmail: row.fromEmail, subject: row.subject, body: row.body, leadId: row.id }),
        );
        sent++;
        console.info("[lead-intake] re-dispatched stuck analysis", { leadId: row.id });
      } catch (error) {
        console.error("[lead-intake] re-dispatch failed", { leadId: row.id, error });
      }
    }
  } catch (error) {
    console.error("[lead-intake] stuck-analysis sweep failed", error);
  }
  return sent;
}
