"use client";

import { type EveMessage, type EveToolPart, useEveAgent } from "eve/react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CircleIcon,
  FlaskConicalIcon,
  LogOutIcon,
  RotateCcwIcon,
  SendIcon,
  SheetIcon,
  SquareIcon,
  XCircleIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { logout } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/messages";
import { getLeadResult } from "../leads/actions";
import { ScoreBadge } from "../leads/lead-badges";
import { fieldLabel, optionLabel, type LeadField } from "@eve-lead-intake-extension/core";
import type { Lead } from "@eve-lead-intake-extension/eve/desk";

// The AI test page: a simulated customer email on top, the agent's work
// below — live steps while it runs, then the saved analysis and the reply it
// would have sent. Nothing is emailed; leads from here are flagged as tests.

const DRAFT_KEY = "ai-test-draft";

type Draft = { email: string; subject: string; body: string };
const EMPTY_DRAFT: Draft = { email: "", subject: "", body: "" };

function readDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<Draft>) } : EMPTY_DRAFT;
  } catch {
    return EMPTY_DRAFT;
  }
}

function writeDraft(draft: Draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage blocked: the draft just isn't remembered.
  }
}

/** Reads back the "Type / From / Subject / body" prompt this page sends. */
function parsePrompt(text: string): Draft | null {
  const match = /^Type: .*\nFrom: (.*)\nSubject: (.*)\n\n([\s\S]*)$/.exec(text);
  return match ? { email: match[1] ?? "", subject: match[2] ?? "", body: match[3] ?? "" } : null;
}

const textOf = (message: EveMessage) =>
  message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");

type StepState = "waiting" | "running" | "done" | "error" | "skipped";

function toolState(part: EveToolPart | undefined): StepState | undefined {
  if (!part) return undefined;
  if (part.state === "completed") return "done";
  if (part.state === "failed" || part.state === "rejected" || part.state === "cancelled") return "error";
  return "running";
}

export function AiTestPage({ sessionId }: { readonly sessionId?: string }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [cancelError, setCancelError] = useState<string>();
  const [result, setResult] = useState<{ lead: Lead; fields: LeadField[] } | null>(null);

  const agent = useEveAgent({
    initialSession: sessionId === undefined ? undefined : { sessionId, streamIndex: 0 },
    resume: sessionId !== undefined,
    onSessionChange(session) {
      if (sessionId === undefined && session !== undefined) {
        // Keep the result reachable on refresh without a Next navigation
        // (which would detach the live stream).
        History.prototype.replaceState.call(
          window.history,
          window.history.state,
          "",
          `/s/${encodeURIComponent(session.sessionId)}`,
        );
      }
    },
  });

  // A fresh test starts from the last draft, so a tweak-and-retry is quick.
  useEffect(() => {
    if (sessionId === undefined) setDraft(readDraft());
  }, [sessionId]);

  const messages = agent.messages;
  const userMessage = messages.find((message) => message.role === "user");
  const assistantMessages = messages.filter((message) => message.role === "assistant");
  const sentDraft = userMessage ? parsePrompt(textOf(userMessage)) : null;
  const form = sentDraft ?? draft;

  const isBusy = agent.status === "busy";
  const isResuming = agent.status === "resuming";
  const isSent = userMessage !== undefined || isBusy;
  const turnFailure = isBusy || isResuming ? undefined : latestTurnFailure(agent.events, t.test.modelDown);
  const errorMessage = cancelError ?? agent.error?.message ?? turnFailure;

  const tools = assistantMessages.flatMap((message) =>
    message.parts.filter((part): part is EveToolPart => part.type === "tool"),
  );
  const enrichPart = tools.findLast((part) => part.name.endsWith("enrich_sender"));
  const savePart = tools.findLast((part) => part.name.endsWith("save_lead"));
  const saved =
    savePart?.state === "completed" ? (savePart.output as { id?: number; status?: string }) : undefined;
  const replyText = assistantMessages.map(textOf).join("\n\n").trim();
  const isSpam = saved?.status === "spam";

  // Load the saved analysis once save_lead reports the row id.
  const savedId = saved?.id;
  useEffect(() => {
    if (savedId === undefined) return;
    let active = true;
    void getLeadResult(savedId).then((result) => {
      if (active) setResult(result);
    });
    return () => {
      active = false;
    };
  }, [savedId]);

  const finished = isSent && !isBusy && !isResuming;
  const settle = (state: StepState | undefined, started: boolean): StepState =>
    state ?? (finished ? "skipped" : started ? "running" : "waiting");
  const enrichStep = settle(toolState(enrichPart), isSent);
  const saveStep = settle(toolState(savePart), enrichStep === "done" || enrichStep === "error");
  const replyStep: StepState =
    finished && replyText ? "done" : finished ? "skipped" : saveStep === "done" ? "running" : "waiting";

  const canSend =
    !isSent &&
    !isResuming &&
    form.email.trim().length > 0 &&
    form.subject.trim().length > 0 &&
    form.body.trim().length > 0;

  const update = (field: keyof Draft) => (value: string) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    writeDraft(next);
  };

  const send = async () => {
    if (!canSend) return;
    setCancelError(undefined);
    // Same plain-text shape the Resend channel hands the agent.
    await agent.send(
      ["Type: new-lead", `From: ${form.email.trim()}`, `Subject: ${form.subject.trim()}`, "", form.body.trim()].join(
        "\n",
      ),
    );
  };

  const cancel = () => {
    setCancelError(undefined);
    void agent.cancel().catch((error: unknown) => {
      setCancelError(error instanceof Error ? error.message : t.test.stopFailed);
    });
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 pt-4">
        <Button onClick={() => window.location.assign("/leads")} size="sm" type="button" variant="ghost">
          <SheetIcon className="size-4" />
          Leads
        </Button>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <form action={logout}>
            <Button aria-label={t.common.logout} size="sm" type="submit" variant="ghost">
              <LogOutIcon className="size-4" />
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-4 pb-16">
        <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 font-medium text-amber-700 text-xs dark:text-amber-300">
            <FlaskConicalIcon className="size-3.5" />
            {t.test.badge}
          </span>
          <h1 className="mt-3 font-semibold text-xl tracking-tight">{t.test.title}</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {t.test.introBefore}
            <strong>{t.test.introStrong}</strong>
            {t.test.introAfter}
          </p>

          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <Field label={t.test.email}>
              <Input
                className="h-10"
                disabled={isSent}
                onChange={(event) => update("email")(event.currentTarget.value)}
                placeholder="customer@example.com"
                type="email"
                value={form.email}
              />
            </Field>
            <Field label={t.test.subject}>
              <Input
                className="h-10"
                disabled={isSent}
                onChange={(event) => update("subject")(event.currentTarget.value)}
                placeholder={t.test.subjectPlaceholder}
                value={form.subject}
              />
            </Field>
            <Field label={t.test.body}>
              <Textarea
                disabled={isSent}
                onChange={(event) => update("body")(event.currentTarget.value)}
                placeholder={t.test.bodyPlaceholder}
                rows={6}
                value={form.body}
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              {isBusy ? (
                <Button onClick={cancel} type="button" variant="outline">
                  <SquareIcon className="size-3 fill-current" />
                  {t.test.stop}
                </Button>
              ) : null}
              {isSent ? (
                <Button
                  disabled={isBusy}
                  onClick={() => {
                    if (sentDraft) writeDraft(sentDraft);
                    window.location.assign("/s");
                  }}
                  type="button"
                  variant={finished ? "default" : "outline"}
                >
                  <RotateCcwIcon className="size-4" />
                  {t.test.again}
                </Button>
              ) : (
                <Button className="h-10" disabled={!canSend} type="submit">
                  <SendIcon className="size-4" />
                  {t.test.send}
                </Button>
              )}
            </div>
          </form>
        </section>

        <section aria-live="polite" className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <h2 className="font-semibold text-lg tracking-tight">{t.test.resultTitle}</h2>

          {!isSent && !isResuming ? (
            <p className="mt-2 text-muted-foreground text-sm">{t.test.resultEmpty}</p>
          ) : (
            <>
              {isBusy || isResuming ? (
                <div className="mt-2 text-muted-foreground text-sm">
                  <Shimmer duration={1.2}>{t.test.analyzing}</Shimmer>
                </div>
              ) : null}
              <ol className="mt-4 flex flex-col gap-2.5">
                <Step label={t.test.stepReceive} state={isSent ? "done" : "waiting"} />
                <Step label={t.test.stepEnrich} state={enrichStep} />
                <Step label={t.test.stepSave} state={saveStep} />
                <Step label={isSpam ? t.test.stepSpam : t.test.stepReply} state={replyStep} />
              </ol>

              {errorMessage ? (
                <p className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                  {errorMessage}
                </p>
              ) : null}

              {result ? <LeadResult fields={result.fields} lead={result.lead} /> : null}

              {replyText && !isSpam ? (
                <div className="mt-6">
                  <h3 className="font-medium text-sm">
                    {t.test.replyTitle} <span className="text-muted-foreground">{t.test.replyNote}</span>
                  </h3>
                  <div className="mt-2 rounded-lg border bg-muted/30 p-4 text-sm">
                    <MessageResponse isAnimating={isBusy}>{replyText}</MessageResponse>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function LeadResult({ lead, fields }: { readonly lead: Lead; readonly fields: readonly LeadField[] }) {
  const { locale, t } = useI18n();
  // Every field the AI is asked to fill (live list), filled or not.
  const rows = fields.map((field): [string, string] => [
    fieldLabel(field, locale),
    optionLabel(field, lead.fields[field.key] ?? "", locale),
  ]);

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {lead.status === "spam" ? (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-medium text-red-700 text-xs dark:text-red-300">
            {t.test.spam}
          </span>
        ) : (
          <ScoreBadge reason={lead.scoreReason} score={lead.score} />
        )}
        {lead.scoreReason ? <span className="text-muted-foreground text-sm">{lead.scoreReason}</span> : null}
      </div>

      {lead.status === "spam" ? null : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {rows.map(([label, value]) => (
            <div className="contents" key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value || <span className="text-muted-foreground">—</span>}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="text-sm">
        <p className="text-muted-foreground">{t.test.intent}</p>
        <p>{lead.intent || "—"}</p>
      </div>
      <div className="text-sm">
        <p className="text-muted-foreground">{t.test.company}</p>
        <p className="whitespace-pre-wrap">{lead.enrichedContext || "—"}</p>
      </div>
      <a className="w-fit text-sm underline underline-offset-2" href="/leads?view=test">
        {fmt(t.test.viewInTest, { id: lead.id })}
      </a>
    </div>
  );
}

function Step({ label, state }: { readonly label: string; readonly state: StepState }) {
  const { t } = useI18n();
  const icon = {
    waiting: <CircleIcon className="size-4 text-muted-foreground/50" />,
    running: <Spinner className="size-4" />,
    done: <CheckCircle2Icon className="size-4 text-emerald-600" />,
    error: <XCircleIcon className="size-4 text-destructive" />,
    skipped: <CircleIcon className="size-4 text-muted-foreground/50" />,
  }[state];
  return (
    <li className={cn("flex items-center gap-2.5 text-sm", state === "waiting" || state === "skipped" ? "text-muted-foreground" : "")}>
      {icon}
      {label}
      {state === "skipped" ? <span className="text-xs">{t.test.skipped}</span> : null}
      {state === "error" ? <span className="text-destructive text-xs">{t.test.stepFailed}</span> : null}
    </li>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-medium text-sm">{label}</span>
      {children}
    </label>
  );
}

function latestTurnFailure(events: ReturnType<typeof useEveAgent>["events"], modelDown: string): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.type === "turn.settled") {
      if (event.data.outcome !== "failed") return undefined;
      return event.data.error?.code === "MODEL_CALL_FAILED" ? modelDown : event.data.error?.message;
    }
    if (event.type === "delivery.consumed") return undefined;
  }
  return undefined;
}
