import { google } from "@ai-sdk/google";
import { gateway } from "ai";

// Which models the agent uses, chosen by env so a deployment can pick any
// provider without code changes:
//   AI_MODEL / AI_FALLBACK_MODEL = "provider/model" ids, e.g.
//   "anthropic/claude-haiku-5.5", "openai/gpt-5.5", "google/gemini-3.5-flash".
// Routing: "google/…" ids go straight to Gemini when GOOGLE_GENERATIVE_AI_API_KEY
// is set (also covers Gemini models that aren't in the AI Gateway catalog);
// everything else goes through Vercel AI Gateway (AI_GATEWAY_API_KEY, or the
// deployment's OIDC token on Vercel).

const hasGoogleKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

// Defaults: with a Gemini key, keep the original Gemini pair; otherwise a cheap
// Gateway model with a fallback from a different provider (one outage can't
// take down both).
const DEFAULT_PRIMARY = hasGoogleKey ? "google/gemini-3.6-flash" : "anthropic/claude-haiku-5.5";
const DEFAULT_FALLBACK = hasGoogleKey ? "google/gemini-flash-latest" : "google/gemini-3.5-flash-lite";

/** Older deployments set GEMINI_FALLBACK_MODEL to a bare Gemini model name. */
function legacyFallback(): string | undefined {
  const value = process.env.GEMINI_FALLBACK_MODEL?.trim();
  if (!value) return undefined;
  return value.includes("/") ? value : `google/${value}`;
}

export const primaryModelId = process.env.AI_MODEL?.trim() || DEFAULT_PRIMARY;
export const fallbackModelId = process.env.AI_FALLBACK_MODEL?.trim() || legacyFallback() || DEFAULT_FALLBACK;

const isDirectGoogle = (id: string) => id.startsWith("google/") && hasGoogleKey;

export function languageModel(id: string) {
  return isDirectGoogle(id) ? google(id.slice("google/".length)) : gateway(id);
}

/**
 * Context window for compaction. Our turns are a single email, so this only
 * needs to be a safe lower bound; override with AI_CONTEXT_WINDOW_TOKENS.
 */
export const contextWindowTokens =
  Number(process.env.AI_CONTEXT_WINDOW_TOKENS) || (isDirectGoogle(primaryModelId) ? 1_000_000 : 200_000);
