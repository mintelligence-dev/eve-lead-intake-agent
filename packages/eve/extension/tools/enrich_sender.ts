import { defineTool } from "eve/tools";
import { z } from "zod";
import { useMountedConfig } from "../lib/shared";

const API_BASE = "https://api.context.dev/v1";

function authHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export default defineTool({
  description:
    "Enrich a lead's sender in one call: look up their company/brand profile by email " +
    "(context.dev). Free/disposable providers (gmail.com, outlook.com, etc.) come back flagged " +
    "as generic instead of a company match. When no brand match is found, falls back to a web " +
    "search on the sender's domain so you still have something to summarize. Call this exactly " +
    "once per new lead email.",
  inputSchema: z.object({
    fromEmail: z.string().describe("The lead's email address to enrich"),
  }),
  label: {
    start: ({ fromEmail }) => `Enrich sender ${fromEmail}`,
  },
  async execute({ fromEmail }) {
    const apiKey = useMountedConfig().enrichment?.contextApiKey;
    if (!apiKey) {
      return { kind: "unavailable", note: "Company lookup is not set up. Summarize from the email alone." };
    }
    const domain = fromEmail.split("@")[1];

    const brandRes = await fetch(`${API_BASE}/brand/retrieve`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({ type: "by_email", email: fromEmail }),
    });

    if (brandRes.ok) {
      const { brand } = (await brandRes.json()) as { brand?: unknown };
      return { kind: "brand", brand };
    }

    if (brandRes.status === 422) {
      return {
        kind: "generic",
        note: "Free or disposable email provider — no company profile applies to this address.",
      };
    }

    if (!domain) {
      return { kind: "error", message: `Brand lookup failed (${brandRes.status}) and no domain to fall back on.` };
    }

    const searchRes = await fetch(`${API_BASE}/web/search`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({ query: domain, numResults: 3 }),
    });

    if (!searchRes.ok) {
      return {
        kind: "error",
        message: `Brand lookup failed (${brandRes.status}) and the web search fallback also failed (${searchRes.status}).`,
      };
    }

    const { results } = (await searchRes.json()) as {
      results?: readonly { url: string; title: string; description: string }[];
    };
    return { kind: "search_fallback", domain, results: results?.slice(0, 3) ?? [] };
  },
});
