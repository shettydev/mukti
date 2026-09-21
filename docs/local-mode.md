# Local Mode

Local mode runs Mukti on your machine through an AI CLI you already have: **no Docker, no
Redis, no OpenRouter key**. The AI runs through that CLI, on your own subscription.

You can start it two ways:

```bash
npx muktiai                # prebuilt packages, no checkout
bun run start:local        # from a clone of this repo
```

Both share the same launcher, preflight checks, and saved settings.

## Supported AI CLIs

| CLI                                                                            | Provider id   | Status      |
| ------------------------------------------------------------------------------ | ------------- | ----------- |
| [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) (`claude`) | `claude-code` | Supported   |
| [Antigravity](https://antigravity.google/docs/cli/reference) (`agy`)           | `antigravity` | Supported   |
| Codex, OpenCode, Pi, Grok, and more                                            | —             | Coming soon |

Sign in first: `claude login`, or run `agy` once and follow the prompts.

## Choosing the AI CLI

The first time you start Mukti with more than one CLI ready, it asks which to use and offers to
remember your answer:

```
◇  Which AI CLI should Mukti use?
│  ● Claude CLI       ready · about 13-20 seconds per reply
│  ○ Antigravity CLI  ready · about 30-60 seconds and 15-25k tokens per reply
│
◇  Use Claude CLI by default from now on?  Yes
```

Every supported CLI is listed, including ones you have not installed or signed in to, so you can
see what the alternatives are. After that, launches use your saved choice without asking, and say
so. To change it, or to decide without being asked:

```bash
npx muktiai --choose                          # ask again, and offer to remember
npx muktiai --provider antigravity            # just this once
npx muktiai --provider antigravity --save     # set the default, no prompt
```

From a checkout, pass the same flags after `--`: `bun run start:local -- --choose`.

The launcher decides in this order: `--provider`, then the `AI_PROVIDER` environment variable,
then your saved choice, then whichever CLIs are ready — installed _and_ signed in. A CLI you have
not signed in to is never chosen for you. It always reports which provider it used and why.

Your choice is saved in `~/.mukti/config.json` (or under `--data-dir`/`MUKTI_HOME`), and the same
choice is used whether you run from a checkout or through `npx`. Delete that file to forget it.
Without a terminal — piped output, or CI — Mukti never asks: it uses the first ready CLI and tells
you how to choose another.

## Claude Code vs. Antigravity

The two are not equivalent, and the difference is worth knowing before you choose:

|                           | Claude Code (`claude-code`)                               | Antigravity (`antigravity`)                                                                                                                                               |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Time per reply (measured) | about 13–20 seconds                                       | about 30–60 seconds                                                                                                                                                       |
| Prompt size per reply     | Mukti's own prompt and your conversation                  | about 15–25k input tokens: the same, plus agy's own ~14k-token coding-agent prompt, which cannot be replaced                                                              |
| Stored outside Mukti      | whatever Claude Code itself records for a `claude -p` run | a conversation record (about 1 MB) per reply in your Antigravity history (`~/.gemini/antigravity-cli`), filed under a `mukti-socratic` project. Mukti never deletes these |

### Antigravity: privacy and behavior notes

- Your **global** agy rules and hooks (`~/.gemini/config/`) apply to Mukti's replies too, and a
  global rule can change what a reply says. Your project-level agy customizations do not apply:
  agy runs from `~/.mukti/mukti-socratic`, never from your projects.
- Each reply's full prompt, including your conversation so far, is passed to `agy` as a
  command-line argument, so other processes on your machine can see it (for example with `ps`).
- Every so often a reply takes two agy runs instead of one, while Mukti refreshes which concepts
  the conversation is about.

## Models

Pick a model from the model picker in the app. The list comes from the CLI you are running —
Claude Code's Sonnet / Opus / Haiku aliases, or whatever `agy models` reports — and the selection
is passed to that CLI's `--model`.

## What local mode does

- Sets `MUKTI_LOCAL=1` and `AI_PROVIDER` to the chosen CLI
- Replaces MongoDB with an embedded, file-backed instance (data persists across restarts)
- Processes conversations inline — no Redis
- Generates ephemeral secrets on boot
- Signs you in as a seeded local user — no login required

## Where your data lives

| Started with          | Database and logs                      | Saved settings         |
| --------------------- | -------------------------------------- | ---------------------- |
| `npx muktiai`         | `~/.mukti/local-db/`, `~/.mukti/logs/` | `~/.mukti/config.json` |
| `bun run start:local` | `.mukti/local-db/` in the repo         | `~/.mukti/config.json` |

For `npx muktiai`, `--data-dir <path>` or the `MUKTI_HOME` environment variable moves the data
directory.

## CLI reference

```text
npx muktiai [options]

  --port, --web-port <n>  Port for the web app (default 3001)
  --api-port <n>          Port for the API (default 3000)
  --data-dir <path>       Where to keep the database and logs (default ~/.mukti, or $MUKTI_HOME)
  --provider <name>       AI CLI to run on: claude-code or antigravity
  --save                  Save --provider as your default for later runs
  --choose                Ask which AI CLI to use, and offer to save it
  -h, --help              Show help
```

## Troubleshooting

- **First run is slow.** Mukti downloads a one-time embedded MongoDB binary (via
  `mongodb-memory-server`). Later starts are fast.
- **"CLI not signed in".** Run `claude login`, or run `agy` once and finish its prompts, then
  start Mukti again. Mukti never picks a CLI that is not signed in.
- **Port 3000 or 3001 is busy.** `npx muktiai` moves to the next free port on its own.
  To pick one yourself: `npx muktiai --port 4001 --api-port 4000`.
- **Start over.** Delete the data directory (`~/.mukti/local-db/` for npx, `.mukti/local-db/` in a
  checkout). Delete `~/.mukti/config.json` to forget your saved AI CLI.
