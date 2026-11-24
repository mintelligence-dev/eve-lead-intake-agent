# @eve-lead-intake/core

The lead intake rules on their own, with no framework and no runtime dependencies. [`@eve-lead-intake/eve`](../eve) and the example app use them.

- **Lead fields:** `DEFAULT_LEAD_FIELDS`, `normalizeField`, `fieldListError`, `cleanFieldValues` and helpers for labels and views.
- **Scores and statuses:** `LEAD_SCORES` (`hot`, `warm`, `cold`), `LEAD_STATUSES`, `SCORE_LABELS`.
- **Automated email:** `isAutomatedEmail({ from, headers, ownAddress })` flags auto-replies, bounces, mailing lists and no-reply senders.
- **Prompt format:** `leadPrompt()` and `parseLeadPrompt()`, the email shape the extension's instructions read.
- **Signed tokens:** `createFormToken` / `verifyFormToken` for customer form links bound to one lead, `createSessionToken` / `verifySessionToken` for admin cookies. They use Web Crypto only.

```ts
import { isAutomatedEmail, leadPrompt } from "@eve-lead-intake/core";
```
