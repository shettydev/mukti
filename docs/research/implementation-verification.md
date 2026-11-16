# Session export implementation verification

## Scope

Mechanical acceptance checks on November 16, 2026, on branch
`feat/session-export-and-eval-protocol`. These are developer smoke sessions, not
participant observations, study results, or evidence of learning efficacy.

## Local four-arm dry-run

All four sessions used the Codex CLI (`codex-cli 0.167.1`) and model
`gpt-6.1-sol`, with the same short JavaScript off-by-one debugging question.
Each session produced one assistant reply and one exchange. In-Mukti sessions
used the real queue, provider adapter, persistence, and metrics-only export
endpoint against a dedicated local smoke database. The direct session used the
real CLI and its reported usage events, without Mukti's prompt or engine.

| Arm               | Exchanges | First reply (ms) | Recorded duration (ms) |
| ----------------- | --------- | ---------------- | ---------------------- |
| Mukti             | 1         | 8703             | 8703                   |
| Baseline Socratic | 1         | 9329             | 9329                   |
| Baseline direct   | 1         | 9113             | 9113                   |
| Direct CLI        | 1         | not reported     | 9748                   |

The direct CLI's first-reply timestamp was not sampled. Its total wall-clock
duration was not substituted for that missing measure. In-Mukti duration uses
persisted message timestamps, not launcher or queue-wait time. Token totals
were taken from provider reports or exact sums of reported prompt/completion
counts, never inferred from transcript length. These single, sequential runs
must not be interpreted as a performance comparison.

The three metrics-only JSON exports, direct CLI CSV, and explicit task-type
sidecar were passed to `bun run eval:summarize`. The Markdown arm overview
contained exactly four rows, one per arm. The detailed tables retained the
missing direct first-reply count and provider-specific token rows. Raw smoke
artifacts are intentionally kept outside the repository in the agent scratch
folder, not published as participant data.

## Hosted-mode download smoke

A real API process ran in hosted mode on loopback using the dedicated smoke
database and test-only JWT authentication. Chat and thought-map node dialogue
exports downloaded successfully in both JSON and Markdown. All four downloads
excluded the seeded synthetic email, recognizable key, and database identifiers.
Unauthenticated requests returned 401 and downloads had attachment headers.
This verifies hosted-mode behavior locally, not a deployed production instance.

## Remaining acceptance limitations

- Automated component tests cover export controls on all three surfaces, download
  errors, auth refresh, literal-term limits, and baseline banner/help behavior.
  Live browser verification was attempted but the installed Safari bridge did
  not respond. No visual or real-browser download acceptance is claimed.
- Task 2.4 remains open: arbitrary terms cannot be absent from every rendered
  string while preserving both fixed schema vocabulary and the literal
  `[redacted]` marker. For example, `chat` is a required surface enum and
  `redacted` occurs inside the required marker. Current sanitization covers
  free-text values and recognizable identifiers, not fixed protocol vocabulary
  or every possible secret. Full transcripts require manual review. The
  specification needs an explicit decision before this task can be closed.
