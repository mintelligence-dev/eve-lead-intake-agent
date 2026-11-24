# @eve-lead-intake-extension/eve

An [eve](https://eve.dev) extension that reads inbound customer emails, scores and saves each lead (Hot / Warm / Cold), and replies with a short acknowledgment and a contact-form link. Leads, settings and email thread state live in Postgres; email goes through [Resend](https://resend.com).

> Not published to npm yet. Use it through the [repository's](https://github.com/mintelligence-dev/eve-lead-intake-extension) npm workspace for now.

## Mount it

```ts
// agent/extensions/lead.ts
import lead from "@eve-lead-intake-extension/eve";

export default lead({
  databaseUrl: process.env.DATABASE_URL,
  email: { fromAddress: "leads@mail.example.com", replyTo: "inbox@example.com" },
  enrichment: { contextApiKey: process.env.CONTEXT_API_KEY! },
  form: { baseUrl: "https://leads.example.com" },
  dataLanguage: "English",
});
```

The file name is the prefix. Mounted as `lead.ts`, the agent gets:

| Contribution | Name | What it does |
|---|---|---|
| Channel | `lead__resend` | Resend webhook at `/eve/v1/resend`. Saves each email before the model runs, skips automated mail, dedupes webhook retries, never replies to spam, caps replies per thread per day, and appends the form link to the first reply. |
| Tool | `lead__enrich_sender` | Company lookup by the sender's email (context.dev). Says so when it isn't set up. |
| Tool | `lead__save_lead` | Saves the lead: intent, score, reason and the configured fields. Completes the row the channel saved. |
| Instructions | `1-workflow.md`, `2-lead-fields.ts` | The intake workflow, the scoring rubric, the untrusted-input rules, and the live field list. They don't set the agent's identity. |
| Channel | `lead__lead-admin` | `POST /eve/v1/lead-admin/reanalyze/:leadId` for a signed-in admin. |
| Schedule | `lead__daily-maintenance` | Daily at 02:00 UTC: re-runs stuck analyses and deletes expired thread state. |

## Settings

| Setting | Default | |
|---|---|---|
| `databaseUrl` | none | Postgres URL. Tables are created on first use. Without it, thread state is in memory and saving fails. |
| `sessionSecret` | generated | Signs admin cookies and form links. Generated once and kept in `app_settings` when left out. |
| `email.fromAddress` | required | Sender address of replies. |
| `email.fromName` | `"Lead Intake Bot"` | |
| `email.replyTo` | none | Your inbound address, so customer replies come back. |
| `email.apiKey`, `email.webhookSecret` | `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` | Read by the Resend adapter when left out. |
| `email.maxFollowUpsPerDay` | `3` | |
| `enrichment.contextApiKey` | none | Leave `enrichment` out to skip the company lookup. |
| `form.baseUrl` | none | Public origin of the page that serves `/f/<token>`. Leave out to send no form link. |
| `form.secret`, `form.validDays` | session secret, `14` | |
| `dataLanguage` | `"Thai"` | Language of the lead data the model writes. Replies follow the customer. |

## The desk

Code that runs outside the agent, like the web pages that list leads or show the customer form, uses the desk with the same settings:

```ts
import { openLeadDesk } from "@eve-lead-intake-extension/eve/desk";

export const desk = openLeadDesk({ databaseUrl, sessionSecret, form });

await desk.listLeadsPage(search, { view: "leads" }, 1, 10);
await desk.verifyFormToken(token);
```

Anyone who can call the desk can read and change every lead. Check your own sign-in first, for example with `desk.isAdminRequest(request)`. The [example app](../../examples/lead-intake-agent) shows the full setup: one config module shared by the mount and the desk.

## Limits

- Email-first: mounting the extension always adds the Resend channel.
- One database per process.
- Resend only. `channels/resend.ts` relies on internals of `@resend/chat-sdk-adapter` 0.3.
