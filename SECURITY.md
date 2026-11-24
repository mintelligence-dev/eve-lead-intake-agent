# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through GitHub: on the repository's **Security** tab choose **Report a vulnerability**
([direct link](https://github.com/mintelligence-dev/eve-lead-intake-extension/security/advisories/new)).
Only the maintainers see the report. Include what is affected, how to reproduce it and what an attacker could do with it.
Use made-up email addresses and lead data: never paste a real customer's details into a report.

We aim to reply within 5 working days, and will keep you informed until a fix is released.

## What is in scope

- **Inbound email.** A forged or replayed Resend webhook that is accepted, or an email that makes the agent do more than save the lead and send a short acknowledgment: quote a price, make a promise, reveal another lead's details, or follow instructions written in the email.
- **Replies.** Anything that makes the agent answer spam, bots or automated mail, reply more than the daily cap, or put tool output, ids or internal notes into an email.
- **Customer form links.** A link that can be forged, used for another lead, or used after it expires.
- **The example app.** Reaching the leads page, the export or the field settings without signing in, or reading or changing leads you should not.
- **Lead data.** Anything that sends lead data somewhere it was not configured to go.

Supported versions are the latest release of each package on npm and the `main` branch.

## Known and by design

- **A form link is a key.** Whoever holds a customer's form link can view and change that lead's contact details until it expires (14 days).
- **One admin login.** The example app has a single username and password from the environment. Put your own sign-in in front of it for a team.
- **Company lookup sends the sender's domain** to [context.dev](https://context.dev) when `CONTEXT_API_KEY` is set.

## If you host your own copy

- Set `RESEND_WEBHOOK_SECRET`, so only Resend can deliver email to the agent.
- Use long random values for `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` and `LEAD_FORM_SECRET`.
- Keep keys in environment variables, never in the repository.
- Give the AI Gateway key a spending limit.
