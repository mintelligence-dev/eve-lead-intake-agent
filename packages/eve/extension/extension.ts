import { defineExtension } from "eve/extension";
import { z } from "zod";

export default defineExtension({
  config: z.object({
    /**
     * Postgres URL for leads, settings and email thread state (any provider). On serverless use
     * the provider's pooled URL. Without it, thread state is kept in memory and saving a lead fails.
     */
    databaseUrl: z.string().optional(),
    /**
     * Signs admin login cookies and, unless `form.secret` is set, customer form links. Leave out to
     * generate one on first use and keep it in the database (table app_settings).
     */
    sessionSecret: z.string().optional(),
    /** Inbound and outbound email through Resend. */
    email: z.object({
      /** The address replies are sent from. */
      fromAddress: z.string(),
      /** The sender name on replies. */
      fromName: z.string().default("Lead Intake Bot"),
      /** Where customers' replies should go (your inbound address), when it differs from `fromAddress`. */
      replyTo: z.string().optional(),
      /** Resend API key with full access. Defaults to the RESEND_API_KEY environment variable. */
      apiKey: z.string().optional(),
      /** Signing secret of the `email.received` webhook. Defaults to RESEND_WEBHOOK_SECRET. */
      webhookSecret: z.string().optional(),
      /** Most agent replies per email thread per day, a last guard against reply loops. */
      maxFollowUpsPerDay: z.number().int().min(0).max(50).default(3),
    }),
    /** Company lookup by the sender's email (context.dev). Leave out to skip it. */
    enrichment: z.object({ contextApiKey: z.string().min(1) }).optional(),
    /** The customer contact form linked from the first reply. */
    form: z
      .object({
        /** Public address of the web app that serves /f/<token>. Leave out to send no form link. */
        baseUrl: z.string().url().optional(),
        /** A separate secret for form links. */
        secret: z.string().optional(),
        /** How many days a form link works. */
        validDays: z.number().int().min(1).max(365).default(14),
      })
      .default({ validDays: 14 }),
    /** Language the agent writes lead data in (score reason, free-text fields). Replies follow the customer. */
    dataLanguage: z.string().min(1).default("Thai"),
  }),
});
