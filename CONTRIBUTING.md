# Contributing

Thanks for helping. Issues and pull requests are welcome in English or Thai.

## Before you start

- **A bug or a small fix:** open a pull request directly.
- **A new feature or a change in behaviour:** open an issue first, so we can agree on the shape before you write it.
- **A security problem:** do not open an issue. See [SECURITY.md](SECURITY.md).

## What this project will not accept

The rules below are the point of the project. A change that weakens one will be declined, however useful it is otherwise.

- Every inbound email is saved before the model runs, so an AI outage never loses a lead.
- The subject and body of an email are untrusted data. The agent never follows instructions written in them.
- The agent replies with a short acknowledgment only. It never quotes prices or makes promises.
- Spam, bots and automated mail are never answered.
- Fields are filled only from what the email or the customer says. Nothing is guessed.
- Test and sample data are made up. Do not add real email addresses, real companies' leads or real customer messages.

## Set up

Needs Node 24 or newer.

```bash
git clone https://github.com/mintelligence-dev/eve-lead-intake-extension.git
cd eve-lead-intake-extension
npm install
npm test
```

The repository is an npm workspace:

| Folder | What it is |
|---|---|
| `packages/core` | The rules: lead fields, scores, automated-email detection, signed tokens. No runtime dependencies. |
| `packages/eve` | The eve extension: the Resend channel, the tools, the intake instructions and the daily job. |
| `examples/lead-intake-agent` | The example app: leads table, field settings, customer form and AI test page. |

Run the example locally with `npm run dev`. Its README lists the environment variables it needs.

## Before you open a pull request

```bash
npm run typecheck
npm test
npm run build
```

- Add or update a test for any change to the rules in `packages/core` or `packages/eve`.
- If you change how something behaves, update the README that describes it. `README.th.md` mirrors `README.md`: update both, or say in the pull request that the Thai text needs doing.
- Say in the pull request what you tested and what you could not test.
- Never commit keys or `.env.local`.

## Style

- Code, comments, commit messages and pull requests are in English.
- Text shown to end users is in Thai first, with English where the audience needs it.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org): `feat(eve): …`, `fix(core): …`, `docs: …`.

## Releases

Maintainers publish `@eve-lead-intake-extension/core` and `@eve-lead-intake-extension/eve` to npm, then tag the commit `v<version>` and create a GitHub Release. Versions follow [Semantic Versioning](https://semver.org); while they are below 1.0, a minor version may change behaviour. `eve` pins the exact `core` version it was tested with.

## Conduct

Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
