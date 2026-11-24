/**
 * One place for the lead extension's settings. The agent's mount (agent/extensions/lead.ts) and
 * the web pages (through lead.desk.ts) both read this, so they use the same database, secrets
 * and form links. Values come from environment variables; see .env.example.
 */

const env = (name: string) => process.env[name]?.trim() || undefined;

/** The app's public origin for links in emails: PUBLIC_APP_URL, else the Vercel production domain. */
function publicAppUrl(): string | undefined {
  const explicit = env("PUBLIC_APP_URL")?.replace(/\/+$/, "");
  if (explicit) return explicit;
  const vercel = env("VERCEL_PROJECT_PRODUCTION_URL");
  return vercel ? `https://${vercel}` : undefined;
}

export const leadIntakeConfig = {
  // POSTGRES_URL is what some Vercel integrations (e.g. Supabase) set.
  databaseUrl: env("DATABASE_URL") ?? env("POSTGRES_URL"),
  sessionSecret: env("ADMIN_SESSION_SECRET"),
  email: {
    fromAddress: env("RESEND_FROM_ADDRESS") ?? "",
    fromName: "Lead Intake Bot",
    replyTo: env("RESEND_REPLY_TO"),
    maxFollowUpsPerDay: 3,
  },
  enrichment: env("CONTEXT_API_KEY") ? { contextApiKey: env("CONTEXT_API_KEY")! } : undefined,
  form: { baseUrl: publicAppUrl(), secret: env("LEAD_FORM_SECRET"), validDays: 14 },
  dataLanguage: env("LEAD_DATA_LANGUAGE") ?? "Thai",
};
