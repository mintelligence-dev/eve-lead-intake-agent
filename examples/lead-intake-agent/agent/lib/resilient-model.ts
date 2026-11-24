import { wrapLanguageModel } from "ai";

type WrappableModel = Parameters<typeof wrapLanguageModel>[0]["model"];
type WrappedModel = ReturnType<typeof wrapLanguageModel>;

// Gemini's free tier regularly answers 503 "model temporarily unavailable" /
// 429 rate limits. An unanswered model call fails the whole turn, so wrap the
// model: retry transient errors with backoff, then try a fallback model once.

const RETRY_DELAYS_MS = [2_000, 6_000];
const TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function isTransient(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { statusCode, isRetryable, message } = error as {
    statusCode?: number;
    isRetryable?: boolean;
    message?: string;
  };
  if (isRetryable === true) return true;
  if (statusCode !== undefined && TRANSIENT_STATUS.has(statusCode)) return true;
  return /overloaded|unavailable|rate limit|resource.?exhausted|timeout/i.test(message ?? "");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Demo/test switch (off unless set in env): SIMULATE_AI_OUTAGE=primary makes
// the primary model fail with 503 (shows retry → fallback); =all makes every
// model fail (shows the raw-first "analyzing" state and recovery).
type Role = "primary" | "fallback";
function simulatedOutage(role: Role): Error | null {
  const mode = process.env.SIMULATE_AI_OUTAGE;
  if (mode !== "all" && !(mode === "primary" && role === "primary")) return null;
  return Object.assign(new Error(`Simulated outage (SIMULATE_AI_OUTAGE=${mode}): model temporarily unavailable`), {
    statusCode: 503,
  });
}
function guarded<T>(role: Role, call: () => PromiseLike<T>): () => Promise<T> {
  return async () => {
    const outage = simulatedOutage(role);
    if (outage) {
      console.warn(`[model] ${role}: ${outage.message}`);
      throw outage;
    }
    return call();
  };
}

async function withRetry<T>(label: string, primary: () => PromiseLike<T>, fallback?: () => PromiseLike<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await primary();
    } catch (error) {
      lastError = error;
      if (!isTransient(error)) throw error;
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break;
      console.warn(`[model] ${label} transient error, retrying in ${delay}ms`, { attempt: attempt + 1 });
      await sleep(delay);
    }
  }
  if (!fallback) throw lastError;
  console.warn(`[model] ${label} primary model still failing, using fallback model`);
  return fallback();
}

export function resilientModel(primary: WrappableModel, fallback?: WrappedModel, role: Role = "primary"): WrappedModel {
  return wrapLanguageModel({
    model: primary,
    middleware: {
      wrapGenerate: ({ doGenerate, params }) =>
        withRetry(`${role} generate`, guarded(role, doGenerate), fallback && (() => fallback.doGenerate(params))),
      wrapStream: ({ doStream, params }) =>
        withRetry(`${role} stream`, guarded(role, doStream), fallback && (() => fallback.doStream(params))),
    },
  });
}
