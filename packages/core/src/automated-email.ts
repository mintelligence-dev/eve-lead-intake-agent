// Auto-replies (out-of-office), bounces, mailing lists and no-reply senders
// must never reach the agent: answering them can start a bot-to-bot reply loop.

const AUTOMATED_SENDER = /^(mailer-daemon|postmaster|no-?reply|do-?not-?reply|bounces?)([+._-].*)?@/i;

export type InboundHeaders = Readonly<Record<string, unknown>> | undefined;

/**
 * True for an email that a machine sent: auto-replies, bounces, mailing lists,
 * no-reply senders, and mail from our own sending address.
 */
export function isAutomatedEmail(email: {
  readonly from: string;
  readonly headers?: InboundHeaders;
  /** Our own sending address; mail from it is never a lead. */
  readonly ownAddress?: string;
}): boolean {
  const headers = Object.fromEntries(
    Object.entries(email.headers ?? {}).map(([key, value]) => [key.toLowerCase(), String(value).toLowerCase()]),
  );
  const autoSubmitted = headers["auto-submitted"];
  const from = email.from.toLowerCase();
  return (
    (autoSubmitted !== undefined && autoSubmitted !== "no") ||
    ["bulk", "junk", "list", "auto_reply"].includes(headers.precedence ?? "") ||
    "list-id" in headers ||
    "list-unsubscribe" in headers ||
    "x-autoreply" in headers ||
    "x-autorespond" in headers ||
    AUTOMATED_SENDER.test(from) ||
    (email.ownAddress !== undefined && email.ownAddress !== "" && from === email.ownAddress.toLowerCase())
  );
}
