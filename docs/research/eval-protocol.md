# Local evaluation protocol

Status: pilot protocol, not evidence of effectiveness. Freeze task statements and scoring before
recruitment. The six [task drafts](tasks/README.md) are not yet reviewed or frozen instruments.
Do not treat implementation fixtures or the maintainer's smoke test as study results.

## Question and arms

Compare bounded-task progress and next-day unaided transfer, not just satisfaction or speed:

1. `mukti`: ordinary chat with the Socratic turn engine and help controls.
2. `baseline-socratic`: fixed [published prompt](baseline-prompts.md), no engine.
3. `baseline-direct`: fixed direct prompt in the same Mukti UI, no engine.
4. `direct-cli`: actual CLI outside Mukti, recorded using the CSV template.

Use the same provider, exact model, CLI version and task budget. Record Mukti commit/version,
OS, provider, model, global rules files (including AGENTS.md), permissions, enabled tools,
context/history policy and prompt hashes in a separate study manifest outside the analysis input
folder. Hidden CLI instructions and tools remain a confound even with the same model. Baseline
arms are opt-in local chat only. Do not compare canvas or thought-map sessions as baseline chat.

## Tasks and counterbalancing

Use three types (`debugging`, `design-review`, `cs1`) with two frozen variants per type. Each
statement must include starting artifacts, allowed tools, acceptance checks and a distinct related
transfer prompt with an answer key. Review and freeze the six drafts before participant data collection.

Rotate four arm orders across participants: A B C D, B C D A, C D A B, D A B C (A=Mukti,
B=Socratic baseline, C=direct baseline, D=real CLI). Balance variant assignment independently of
arm order and publish the assignment ledger. A participant never repeats a task variant, including
practice and transfer. Six variants cannot support all four arms for every task type within one
participant. Use a balanced incomplete-block assignment across participants, or add independently
reviewed variants before a full within-person comparison. Do not conceal this limitation. The
maintainer pilot checks mechanics only and may use the same task, explicitly labelled repeated-task
smoke test with practice effects, not counterbalanced evidence.

Start with fresh history and identical starting artifacts. Predeclare a session cap (suggested
20 minutes or 12 exchanges), stopping rules and permitted help. Record every started session,
withdrawal, failure, restart and protocol deviation. Do not silently replace failed runs.

## Measures and observation ledger

Keep an observer ledger keyed by the same `source` as session-map.json, outside the input folder.
Record task variant, pseudonymous participant, assignment order, correctness check, timestamp of
first _useful_ reply (participant marks usefulness), time to correct result, stalls, restarts,
help-control use, assistance level, transfer time and rubric scores. Missing observations are
`not reported`, never inferred from transcripts. Publish this ledger only after consent review.

The automated export measures are time to first reply (not usefulness), first-to-last-message
duration (not time to correctness), answered exchanges, assistant replies, controls by turn kind,
wrap-up reached and provider-reported tokens. Record a stall when no observable progress toward
an acceptance criterion occurs for **5 consecutive exchanges or 10 minutes**, whichever occurs
first. Observer documents start/end and reason, even if the session later succeeds. A restart
means discarding context or restarting the task, not merely retrying a failed request.

Token counts are optional, never estimated or converted to money. Provider accounting differs.
Never rank or compare token totals across providers. The summary isolates token rows per provider
and excludes incomplete session totals from medians while retaining missing-reply counts.

## Next-day transfer

On the next day (record actual elapsed hours), give a novel related problem without AI, search,
notes or prior transcript. Use a predeclared time budget and acceptance checks. The scorer should
not know the arm where feasible. Two scorers independently score a subset and report disagreements.
Rubric: **0** no workable approach or fundamental misconception, **1** relevant partial approach
but major errors and no valid result, **2** substantially correct approach with a minor error or
incomplete justification, **3** correct independent result plus explanation applying the principle
to the novel variant. Publish the per-task answer keys and anchors, not just this generic rubric.
Do not substitute wrap-up, token economy or immediate task completion for transfer.

## Consent and sanitization

Obtain [written consent](templates/consent.md) before recording another person's session. Consent
for participation, metrics publication and transcript publication are separate choices. Default
to metrics-only export. Keep the participant identity key and signed forms private, separate from
exports, with restricted access and a declared deletion date. Self-study should still document
scope, private information and publication decisions.

Known sensitive values and recognizable emails, credentials and IDs can be removed from free text.
This is not universal detection, and variants, embedded secrets or uncommon formats can survive.
Remove sensitive material from inputs where possible, supply explicit redaction terms, and manually
review **both JSON and Markdown**, including configuration/model labels and filenames. Metrics-only
removes message content but is not a guarantee that every remaining string is safe.

Redaction removes listed strings from free-text values only. The export's fixed vocabulary
(enumerated values, field names, timestamps) and the `[redacted]` marker are kept so the file stays
valid against its schema. Preserve schema-valid exports for analysis, record redaction limitations
and block publication if a sensitive structured value remains.
Full transcripts require separate written permission _after_ the participant reviews the sanitized
version. Never include API keys, account identifiers, personal email, raw database IDs or the consent
identity key in published artifacts.

## Analysis input contract

Run `bun run eval:summarize <exports-dir>` from the repository. No new dependencies or network calls.
The folder contains only v1 JSON session exports, optional `direct-cli-log.csv`, and the required
`session-map.json`. Output `summary.md` and `summary.csv` are overwritten on successful analysis.
The shared API schema validator checks every JSON export against the actual published
[session-export schema](session-export.schema.json). Keep study manifests elsewhere: unrecognized
JSON files are intentionally treated as exports, not silently ignored.

Task type is **not in the export schema**. Supply an explicit sidecar, never infer it from content:

```json
{
  "sessions": [
    { "source": "mukti.json", "taskType": "debugging" },
    { "source": "socratic.json", "taskType": "debugging" },
    { "source": "direct-1", "taskType": "debugging" }
  ]
}
```

`source` is the exact JSON basename, or the direct CSV `sessionId`. All sources must be unique,
mapped exactly once, and present. Allowed task types: `debugging`, `design-review`, `cs1`. The arm
comes from validated `configuration.studyArm.name`, defaults to `mukti` when absent, or is
`direct-cli` for CSV rows. Do not add task metadata to exports and thereby invalidate the schema.
For rigorous comparison restrict inputs to the same model and setup, as documented in the manifest.

Copy [direct-cli-log.csv](templates/direct-cli-log.csv) without changing its header. One row per
session, a random local `sessionId` (not a person/account ID), provider and exact model. Use ISO
timestamps and milliseconds. `ordinary`, `more_help`, `explain`, `wrap_up` are turn-kind counts,
not subjective help ratings. Controls unavailable in direct CLI are 0, wrap-up false unless actually
reached. An exchange is a user message followed by a reply. Record only observed values. Empty,
`not_reported` and `not reported` represent missing numerical values, never zero. Tokens have
separate total/included-replies/unreported-replies columns for prompt, completion and total. Record
reply counts as integers even when usage is unavailable (0 included, all replies unreported).
Included plus unreported must equal assistantReplies. Do not derive total tokens from unavailable
components. CSV quoting supports commas, doubled quotes and embedded newlines. Use one provider
per direct session, split sessions if the provider changes and document that deviation.

Output is long-form, grouped by arm × task type, with n, median, min, max and missing-session
count per metric. A provider column scopes token rows. `replyCountsNotReported` counts missing
reply usage separately from missing session totals. Partial totals never masquerade as complete
usage. No imputations, estimated values, significance tests or causal claims are generated.
Observer measures and transfer require separate analysis of the ledger, not this export-only tool.

## Publication checklist

- [ ] Freeze and publish task statements, variants, transfer keys, budgets and assignment ledger.
- [ ] Record all configurations, versions, prompt hashes, hidden rules and deviations.
- [ ] Include every started run, stalls, negative results, restarts, missing observations and withdrawals
      consistent with consent. Explain exclusions rather than dropping them silently.
- [ ] Separate mechanical pilot fixtures from real participant results and repeated-task smoke tests.
- [ ] Run schema validation and inspect summary missing counts. Do not compare cross-provider usage.
- [ ] Manually inspect all publication files, filenames and structured metadata for sensitive data.
- [ ] Confirm metrics consent, and separate post-review transcript consent if publishing full text.
- [ ] Publish n, medians/ranges, transfer outcomes, limitations and uncertainty without efficacy claims
      from a small convenience sample. Retain private raw data only until the declared deletion date.

## Script fixtures and tests

`bun test scripts/eval/summarize.test.ts` creates a temporary fixture folder using the canonical
API fixture, two arms and a direct CLI CSV. It exercises the real command, output medians and
missing counts, schema rejection and missing mapping. Fixtures are synthetic and not study evidence.
No provider credentials are needed. `bun run docs:check` validates repository documentation rules.
