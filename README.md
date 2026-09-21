<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="packages/mukti-web/public/mukti-enso/mukti-inverted-no-bg.png" />
    <source media="(prefers-color-scheme: light)" srcset="packages/mukti-web/public/mukti-enso-inverted/mukti-no-bg.png" />
    <img alt="Mukti logo" src="packages/mukti-web/public/mukti-enso-inverted/mukti-inverted.png" width="320" />
  </picture>

  <h1>mukti</h1>
  <p><strong>Liberation from AI Dependency</strong></p>
  <p><em>Mukti (mook-tee /ˈmʊkti/) — "Liberation" in Hindi</em></p>

  <p>
    <a href="https://www.npmjs.com/package/muktiai"><img src="https://img.shields.io/npm/v/muktiai.svg" alt="npm" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" /></a>
    <img src="https://img.shields.io/badge/Built%20with-Nx-143055.svg" alt="Nx" />
    <img src="https://img.shields.io/badge/Backend-NestJS-E0234E.svg" alt="NestJS" />
    <img src="https://img.shields.io/badge/Frontend-Next.js-000000.svg" alt="Next.js" />
    <img src="https://img.shields.io/badge/Runtime-Bun-f472b6.svg" alt="Bun" />
    <img src="https://img.shields.io/badge/Language-TypeScript-3178c6.svg" alt="TypeScript" />
  </p>

  <p>
    <a href="#try-it-in-30-seconds">Quickstart</a> |
    <a href="docs/local-mode.md">Local Mode</a> |
    <a href="DEVELOPMENT.md">Development</a> |
    <a href="docs/reference/architecture/overview.md">Architecture</a> |
    <a href="packages/mukti-api/README.md">API</a> |
    <a href="mukti-mcp-server/README.md">MCP Server</a>
  </p>
</div>

---

## Try it in 30 seconds

```bash
npx muktiai
```

That's it — Mukti opens at [http://localhost:3001](http://localhost:3001).
**No Docker, no API keys, no signup.** The AI runs through a CLI you already use, on your own
subscription.

**You need:** Node 20.11+ and one of these AI CLIs, installed and signed in:

- [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) (`claude login`)
- [Antigravity CLI](https://antigravity.google/docs/cli/reference) (run `agy` once and follow the prompts)

> [!NOTE]
> **Coming soon:** Codex, OpenCode, Pi, Grok, and more AI CLIs.

The first run downloads a one-time embedded MongoDB binary, so it takes a little longer.
Run `npx muktiai --help` for all options, or see [Local Mode](docs/local-mode.md) for details.

## What is Mukti?

Mukti is a thinking workspace powered by a Socratic assistant. Instead of giving you answers, it
responds with better questions — guiding you through problems with structured canvases, reflection
loops, and inquiry paths so **you** produce the insights.

- Turns vague prompts into clearer problem statements
- Gives you canvases to break work into assumptions, options, and tradeoffs
- Builds inquiry paths that keep investigation focused
- Suggests relevant resources and follow-up reading
- Prompts reflection so decisions are explicit and reviewable

**Example** — you ask: _"I'm getting `TypeError: NoneType object is not iterable` in Python."_

Mukti responds with a compact sequence:

1. "Which variable is `None` at the failure point?"
2. "What input path can produce that `None` value?"
3. "Can you add a guard and a focused test for that path?"
4. "Here is a debugging reference for this exact error class."

> [!IMPORTANT]
> Mukti is not a shortcut machine. If you want final answers without reflection, this product will
> feel uncomfortable — by design.

<!--## Demo

<video src="https://github.com/shettydev/mukti/releases/download/assets-v1/demo-01.mp4" width="100%" controls></video>

<video src="https://github.com/shettydev/mukti/releases/download/assets-v1/demo-02.mp4" width="100%" controls></video>-->

## Ways to run Mukti

| I want to…                    | Use                                                      | Needs                              |
| ----------------------------- | -------------------------------------------------------- | ---------------------------------- |
| Try Mukti                     | [`npx muktiai`](#try-it-in-30-seconds)                   | Node 20.11+, `claude` or `agy` CLI |
| Run the full hosted stack     | [`docker compose up -d`](#full-stack-docker)             | Docker, an OpenRouter key          |
| Hack on the code (hot reload) | [`bun run dev`](#development)                            | Bun, Docker (for MongoDB + Redis)  |
| Run from source, no Docker    | [`bun run start:local`](#run-from-source-without-docker) | Bun, `claude` or `agy` CLI         |

### Choosing the AI CLI

With more than one CLI ready, Mukti asks which to use on the first run and offers to remember it.
To override:

```bash
npx muktiai --choose                          # ask again
npx muktiai --provider agy --save     # set the default, no prompt
```

|                | Claude Code                   | Antigravity                                                   |
| -------------- | ----------------------------- | ------------------------------------------------------------- |
| Time per reply | about 13–20 seconds           | about 30–60 seconds                                           |
| Tokens         | Mukti's prompt + conversation | about 15–25k per reply (includes agy's own agent prompt)      |
| Side effects   | —                             | Keeps a ~1 MB record per reply in `~/.gemini/antigravity-cli` |

> [!WARNING]
> With Antigravity, your global agy rules apply to Mukti's replies, and each prompt is passed as a
> command-line argument (visible to other local processes via `ps`). Read the
> [full comparison and privacy notes](docs/local-mode.md#claude-code-vs-antigravity) before choosing it.

Your data lives in `~/.mukti/` (change it with `--data-dir` or `MUKTI_HOME`).

## Full stack (Docker)

For the full hosted stack — auth, subscriptions, OpenRouter models.

**You need:** [Docker](https://docs.docker.com/get-docker/) with Docker Compose, and
[Git](https://git-scm.com/).

```bash
git clone https://github.com/shettydev/mukti.git
cd mukti
cp .env.example .env        # then set OPENROUTER_API_KEY
docker compose up -d
```

Get a free key at [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys). Everything
else in `.env` has sensible defaults for local development.

Open [http://localhost:3001](http://localhost:3001) and log in with a seeded account:

| Email              | Password            |
| ------------------ | ------------------- |
| `test@mukti.app`   | `testpassword123`   |
| `admin@mukti.chat` | `muktifrombrainrot` |

<details>
<summary>Services, useful commands, and resetting the seed</summary>

| Service | Description                | Port  |
| ------- | -------------------------- | ----- |
| MongoDB | Database                   | 27017 |
| Redis   | Cache and queues           | 6379  |
| Seed    | One-shot DB seeder (exits) | —     |
| API     | NestJS backend             | 3000  |
| Web     | Next.js frontend           | 3001  |

The seed step is idempotent and runs automatically before the API starts.

```bash
docker compose up -d --build   # Rebuild and restart
docker compose down            # Stop everything
docker compose logs -f api     # Tail API logs
docker compose up seed         # Re-run seed manually
```

If you previously seeded the old `admin@mukti.live` user, reset the database with
`docker compose down -v && docker compose up -d` to pick up the new seed.

</details>

## Development

For running services individually with hot reload, see [DEVELOPMENT.md](DEVELOPMENT.md).

```bash
bun install                         # Install dependencies
docker compose up -d mongodb redis  # Start only databases
bun run dev                         # Start API + Web in watch mode
```

### Run from source without Docker

To run your checkout in local mode — same as `npx muktiai`, but built from source:

```bash
git clone https://github.com/shettydev/mukti.git
cd mukti
bun install
bun run start:local                 # pass flags after --, e.g. bun run start:local -- --choose
```

Without Bun, `npm install && npm run start:local` also works (Node 22.18+, using Node's built-in
TypeScript support). Every other workspace script assumes Bun. Data is stored in
`.mukti/local-db/` in the repo. See [Local Mode](docs/local-mode.md) for how it works.

## Troubleshooting

- **First run is slow** — a one-time embedded MongoDB download. Later starts are fast.
- **AI CLI not detected** — make sure `claude` or `agy` is on your `PATH` and signed in.
  Mukti never picks a CLI you haven't signed in to.
- **Port already in use** — `npx muktiai --port 4001 --api-port 4000`.
- **More** — see [Local Mode → Troubleshooting](docs/local-mode.md#troubleshooting).

## Why?

AI tools are useful, but easy to overuse. When every task gets auto-completed, people slowly lose
the habit of asking better questions, testing assumptions, and building original ideas.

Mukti is built around a different default: use AI as a thought partner, not a replacement for
thought. The goal is not to ban AI — it's to stay intellectually in the loop while still
benefiting from modern tooling.

> A relevant reference: MIT's [Your Brain on ChatGPT](https://arxiv.org/pdf/2506.08872) explores
> how AI assistance patterns can affect cognitive effort.

### How it works (Socratic method)

Mukti uses dialogue to push thinking forward without taking control of your work:

- **Probing questions** — surfaces missing context, constraints, and assumptions
- **Self-discovery prompts** — helps you generate and compare your own options
- **Iterative dialogue** — each turn builds on your latest answer
- **Guided autonomy** — provides hints and resources without solving everything
- **Reflection loops** — asks you to summarize decisions and reasoning before moving on

## MCP Server

Mukti's Socratic reasoning is also available as MCP tools (`socratic_inquiry`, `explore_paths`,
`explain_approach`) for any MCP-compatible client. See [mukti-mcp-server](mukti-mcp-server/README.md).

## Repo Structure

```text
.
├── packages/mukti-cli        # `npx muktiai` launcher
├── packages/mukti-web        # Next.js frontend
├── packages/mukti-api        # NestJS backend
├── mukti-mcp-server          # MCP server (standalone)
└── docs/                     # Local mode, RFCs, and technical docs
```

## Contributing

Contributions are welcome. Start with [DEVELOPMENT.md](DEVELOPMENT.md) for setup, and
[RELEASE.md](RELEASE.md) for how releases are cut.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

Inspired by my mentor [Shaik Noorullah](https://github.com/shaiknoorullah) and the Socratic
tradition of inquiry.

_"The only true wisdom is in knowing you know nothing."_ — Socrates
