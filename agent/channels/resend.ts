import { createResendAdapter } from "@resend/chat-sdk-adapter";
import type { ResendRawMessage } from "@resend/chat-sdk-adapter";
import type { Message, Thread } from "chat";
import { chatSdkChannel } from "eve/channels/chat-sdk";
import { leadPrompt, redispatchStuckAnalyses } from "../lib/analysis-retry";
import { createChatState } from "../lib/chat-state";
import { formUrl } from "../lib/form-token";
import { claimFormLink, recordInboundEmail, subjectForThread, threadLeadIsSpam } from "../lib/leads-db";

// Thread state lives in Postgres next to the leads (see chat-state.ts).
const state = createChatState();

const resend = createResendAdapter({
  fromAddress: process.env.RESEND_FROM_ADDRESS!,
  fromName: "Lead Intake Bot",
});

export const { bot, channel, send } = chatSdkChannel({
  userName: "Lead Intake Bot",
  adapters: { resend },
  state,
  // Email delivers one reply per turn; there is nothing to stream-edit.
  streaming: false,
});

// eve sends the agent's reply from a later step that rebuilds the thread
// without going through a webhook, so the Chat instance there was never
// initialized and the adapter has no state wired in: the reply loses
// "Re: <subject>" and its In-Reply-To headers. Initialize first (idempotent).
const initializeBot = () =>
  (bot as unknown as { ensureInitialized(): Promise<void> }).ensureInitialized();

// Customer replies must reach the inbound address. The sender address
// (e.g. onboarding@resend.dev while the domain is unverified) doesn't route
// back to us, so set Reply-To on every outgoing email when configured.
const replyTo = process.env.RESEND_REPLY_TO;
type EmailsClient = { send(payload: Record<string, unknown>, options?: unknown): Promise<unknown> };
let replyToApplied = false;
const applyReplyTo = () => {
  if (!replyTo || replyToApplied) return;
  const client = (resend as unknown as { getResend(): { emails: EmailsClient } }).getResend();
  const sendEmail = client.emails.send.bind(client.emails);
  client.emails.send = (payload, options) => sendEmail({ ...payload, replyTo }, options);
  replyToApplied = true;
};

// Never email spam. The agent saves spam with status "spam" and ends with an
// internal note instead of a reply; both are caught here before sending.
const SPAM_NOTE = "saved as spam";
const SPAM_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

const postMessage = resend.postMessage.bind(resend);
resend.postMessage = async (threadId, message) => {
  await initializeBot();
  const { toAddress } = resend.decodeThreadId(threadId);
  if (JSON.stringify(message).includes(SPAM_NOTE) || (await threadLeadIsSpam(threadId, toAddress, SPAM_LOOKBACK_MS))) {
    console.info("[lead-intake] reply suppressed: lead is spam", { threadId });
    return {
      id: `suppressed-${Date.now()}`,
      threadId,
      raw: { id: "suppressed", messageId: "", from: "", to: [toAddress], subject: "", createdAt: new Date().toISOString() },
    };
  }
  applyReplyTo();
  await restoreThreadSubject(threadId);
  return postMessage(threadId, await withFormLink(threadId, message));
};

// The first reply to a new lead carries a link to the contact form, so the
// customer can confirm name/phone/company themselves. Added here (not by the
// model) so the URL is always exact. Never blocks the reply.
type PostableMessage = Parameters<typeof postMessage>[1];
async function withFormLink(threadId: string, message: PostableMessage): Promise<PostableMessage> {
  try {
    if (typeof message !== "string" && !("markdown" in message) && !("raw" in message)) return message;
    const leadId = await claimFormLink(threadId);
    const url = leadId === null ? null : await formUrl(leadId);
    if (!url) return message;
    const footer =
      `\n\n---\n\nเพื่อให้ทีมติดต่อกลับได้สะดวกและรวดเร็ว รบกวนกรอกข้อมูลติดต่อสั้นๆ (ประมาณ 1 นาที):\n` +
      `[กรอกข้อมูลติดต่อกลับ](${url})\n\n` +
      `To help us get back to you faster, please share your contact details (about 1 minute): ${url}`;
    if (typeof message === "string") return { markdown: message + footer };
    if ("markdown" in message) return { ...message, markdown: message.markdown + footer };
    return { markdown: message.raw + footer };
  } catch (error) {
    console.warn("[lead-intake] could not add form link", { threadId, error });
    return message;
  }
}

// The adapter keeps each thread's subject in state for 30 days; without it the
// reply goes out as "New message". Fall back to the subject saved with the lead.
const SUBJECT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
async function restoreThreadSubject(threadId: string) {
  try {
    const key = `resend:thread-subject:${threadId}`;
    if (await state.get(key)) return;
    const subject = await subjectForThread(threadId);
    if (subject) await state.setIfNotExists(key, subject, SUBJECT_TTL_MS);
  } catch (error) {
    console.warn("[lead-intake] could not restore thread subject", { threadId, error });
  }
}

function toLeadPrompt(message: Message, type: "new-lead" | "follow-up", leadId?: number): string {
  const raw = message.raw as ResendRawMessage;
  return leadPrompt({
    type,
    fromEmail: message.author.email ?? raw.from,
    subject: raw.subject,
    body: message.text,
    leadId,
  });
}

// Auto-replies (out-of-office), bounces, mailing lists and no-reply senders must
// never reach the agent: answering them can start a bot-to-bot reply loop.
const AUTOMATED_SENDER = /^(mailer-daemon|postmaster|no-?reply|do-?not-?reply|bounces?)([+._-].*)?@/i;
function isAutomatedEmail(message: Message): boolean {
  const raw = message.raw as ResendRawMessage;
  const headers = Object.fromEntries(
    Object.entries(raw.headers ?? {}).map(([key, value]) => [key.toLowerCase(), String(value).toLowerCase()]),
  );
  const autoSubmitted = headers["auto-submitted"];
  return (
    (autoSubmitted !== undefined && autoSubmitted !== "no") ||
    ["bulk", "junk", "list", "auto_reply"].includes(headers.precedence ?? "") ||
    "list-id" in headers ||
    "list-unsubscribe" in headers ||
    "x-autoreply" in headers ||
    "x-autorespond" in headers ||
    AUTOMATED_SENDER.test(message.author.email ?? raw.from) ||
    (message.author.email ?? "").toLowerCase() === (process.env.RESEND_FROM_ADDRESS ?? "").toLowerCase()
  );
}

// Cap agent replies per thread per day, as a last guard against reply loops
// with senders the header check doesn't recognize.
const MAX_FOLLOW_UPS_PER_DAY = 3;
async function underFollowUpLimit(thread: Thread): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const key = `lead-intake:follow-ups:${thread.id}:${day}`;
  const count = Number((await state.get(key)) ?? 0);
  if (count >= MAX_FOLLOW_UPS_PER_DAY) return false;
  await state.set(key, count + 1, 2 * 24 * 60 * 60 * 1000);
  return true;
}

// Resend retries webhooks; handle each inbound email once so a retry can't
// save the lead twice or send a second reply.
const SEEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
function firstDelivery(message: Message): Promise<boolean> {
  const raw = message.raw as ResendRawMessage;
  return state.setIfNotExists(`lead-intake:seen:${raw.id}`, true, SEEN_TTL_MS);
}

bot.onNewMention(async (thread: Thread, message: Message) => {
  if (!(await firstDelivery(message))) return;
  if (isAutomatedEmail(message)) {
    console.info("[lead-intake] skipped automated email", { from: message.author.email });
    return;
  }
  await thread.subscribe();
  const raw = message.raw as ResendRawMessage;
  // Save the email before the agent runs, so a model outage can't lose the lead.
  let leadId: number | undefined;
  try {
    leadId = await recordInboundEmail({
      resendEmailId: raw.id,
      threadId: thread.id,
      fromEmail: message.author.email ?? raw.from,
      subject: raw.subject,
      body: message.text,
    });
  } catch (error) {
    console.error("[lead-intake] could not save inbound email before analysis", error);
  }
  await send(toLeadPrompt(message, "new-lead", leadId), { thread, title: raw.subject });
  // Give earlier emails whose analysis never finished another run.
  await redispatchStuckAnalyses((row, prompt) => send(prompt, { thread: row.threadId, adapterName: "resend" }));
});

bot.onSubscribedMessage(async (thread: Thread, message: Message) => {
  if (!(await firstDelivery(message))) return;
  if (isAutomatedEmail(message)) {
    console.info("[lead-intake] skipped automated email", { from: message.author.email });
    return;
  }
  if (!(await underFollowUpLimit(thread))) {
    console.info("[lead-intake] follow-up limit reached", { threadId: thread.id });
    return;
  }
  await send(toLeadPrompt(message, "follow-up"), { thread });
});

export default channel;
