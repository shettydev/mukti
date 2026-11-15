# Hosted mode: your data and costs

Hosted mode runs replies through **OpenRouter**, which routes each request to the model's
provider. Inference is not on your device. For the CLI-based alternative, read [Local Mode](local-mode.md).

The in-app **Your data and costs** panel describes your current configuration. Open it from
Settings or your profile menu. The sign-up page links to the public hosted free-tier view.
`GET /api/v1/data-disclosure` is authenticated and reflects your saved key. The public
`GET /api/v1/data-disclosure/hosted` describes the free tier without looking up an account.
Neither endpoint returns API keys or conversation contents.

## Who pays and what limits apply

- **Without your own key:** you get 10 replies a day on Mukti's OpenRouter key. The allowance
  resets at **00:00 UTC**. The panel shows the next reset time.
- **With your own key:** Socratic replies and resolved-key auxiliary calls use your OpenRouter
  account. Mukti's free daily allowance does not apply. Provider credits, rate limits and model
  availability still apply. Mukti stores the key encrypted and displays only its last four characters.
- **Platform-only auxiliary calls:** misconception detection always uses Mukti's key, even if you
  have saved your own key.

Usage-limit messages distinguish the daily free allowance, exhausted OpenRouter credits and
OpenRouter rate limits. A provider limit is not a request to sign in again. A failed message can
be retried after the limit clears. Adding a key does not promise unlimited provider access.

## What each model call sends

These entries are checked against the endpoint's surface descriptors by `hosted-docs.spec.ts`.
A changed surface, history window or key statement requires an update here.

For entries marked **resolved key**, the key statement is **Your key.** when you bring a key,
or **Mukti's key.** otherwise. Platform-only entries state **Always Mukti's key, never yours.**
All calls also include instructions specific to the requested task.

### Chat

Resolved key.

- Mukti's Socratic instructions for the conversation's technique, help level and dialogue rules.
- Up to the last 50 messages of the conversation; older ones are archived and not sent.
- Your new message.

### Canvas node chat

Resolved key.

- Mukti's Socratic instructions, with the node's label and type.
- The canvas's problem statement, constraints and assumptions.
- Up to the last 50 messages of that node's dialogue, and your new message.

### Thought-map node chat

Resolved key.

- Mukti's Socratic instructions, with the map's title and the node's label and type.
- Up to the last 50 messages of that node's dialogue, and your new message.

### Concept extraction

Resolved key. This is an auxiliary call, not an extra visible reply.

- Your message alone, and only when Mukti's keyword match finds fewer than 2 known concepts in it.

### Misconception detection

Platform only. Always Mukti's key, never yours.

- Your message, the last 3 turns of the dialogue, and the concepts detected in it.

This call is not run in local CLI mode.

### Thought-map extraction

Resolved key. Requested when you turn a conversation into a map.

- The conversation's title and its recent messages (the ones kept on the conversation), when you turn it into a thought map.

### Branch suggestions

Resolved key. Requested when you ask for map branches.

- The label and type of the node you're expanding, and the labels already on the map so suggestions don't repeat them.

## What Mukti stores

Mukti's hosted database holds:

- Conversations, including recent and archived messages.
- Canvas sessions, their nodes and node dialogues.
- Thought maps, their nodes and share links you create.
- Learner-model state, including tracked concepts and demonstrated understanding.
- Usage events, including model, token counts and timing, plus daily aggregates.
- Your account, preferences, sessions and encrypted key if you save one.

Requests leave Mukti for OpenRouter and the model provider. Their retention policies apply.
Deleting data in Mukti does not remove copies held by these services. This technical guide does
not promise a provider's retention period or replace its privacy policy.

## Delete your data or account

In **Settings → Your data and costs**, the danger zone requires typing `DELETE` before either action.

- **Delete all my Mukti data** calls `DELETE /me/data` with `{ "confirm": "DELETE" }`. It removes
  your conversations and archives, canvases and dialogues, maps and share links, learner-model
  state and usage history. Your account, preferences, encrypted key and sign-in remain.
- **Delete my account** calls hosted-only `DELETE /me` with the same confirmation. It removes
  your data first, then account and subscription/rate-limit records and sign-in sessions and tokens.
  You are signed out. This action is not available in local mode.

The API returns per-category results. A partial failure is shown rather than reported as success.
Retry to finish: deletion is idempotent, and parents are retained if their children could not be
removed. An account is retained when its data could not be fully deleted.

Data deletion invalidates share links. It does not delete another user's data, provider-side
copies, operator backups or existing service logs. The application-level delete endpoints do not
make a backup-retention guarantee.

For local database locations, CLI-held history and its removal instructions, see
[Local Mode](local-mode.md#your-data-and-costs).
