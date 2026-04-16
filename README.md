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
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" /></a>
    <img src="https://img.shields.io/badge/Built%20with-Nx-143055.svg" alt="Nx" />
    <img src="https://img.shields.io/badge/Backend-NestJS-E0234E.svg" alt="NestJS" />
    <img src="https://img.shields.io/badge/Frontend-Next.js-000000.svg" alt="Next.js" />
    <img src="https://img.shields.io/badge/Runtime-Bun-f472b6.svg" alt="Bun" />
    <img src="https://img.shields.io/badge/Language-TypeScript-3178c6.svg" alt="TypeScript" />
  </p>

  <p>
    <a href="DEVELOPMENT.md">Setup</a> |
    <a href="docs/reference/architecture/overview.md">Architecture</a> |
    <a href="RELEASE.md">Release</a> |
    <a href="packages/mukti-api/README.md">API</a> |
    <a href="mukti-mcp-server/README.md">MCP Server</a>
  </p>
</div>

---

## What is Mukti?

Mukti is a thinking workspace powered by a Socratic assistant. Instead of giving you answers, it responds with better questions — guiding you through problems with structured canvases, reflection loops, and inquiry paths so **you** produce the insights.

- Turns vague prompts into clearer problem statements
- Gives you canvases to break work into assumptions, options, and tradeoffs
- Builds inquiry paths that keep investigation focused
- Suggests relevant resources and follow-up reading
- Prompts reflection so decisions are explicit and reviewable

> [!IMPORTANT]
> Mukti is not a shortcut machine. If you want final answers without reflection, this product will feel uncomfortable — by design.

## Demo

<video src="packages/mukti-web/public/demo/demo-01.mp4" width="100%" controls></video>

<video src="packages/mukti-web/public/demo/demo-02.mp4" width="100%" controls></video>

## Why?

AI tools are useful, but easy to overuse. When every task gets auto-completed, people slowly lose the habit of asking better questions, testing assumptions, and building original ideas.

Mukti is built around a different default: use AI as a thought partner, not a replacement for thought. The goal is not to ban AI — it's to stay intellectually in the loop while still benefiting from modern tooling.

> A relevant reference: MIT's [Your Brain on ChatGPT](https://arxiv.org/pdf/2506.08872) explores how AI assistance patterns can affect cognitive effort.

## How It Works (Socratic Method)

Mukti uses dialogue to push thinking forward without taking control of your work:

- **Probing questions** — surfaces missing context, constraints, and assumptions
- **Self-discovery prompts** — helps you generate and compare your own options
- **Iterative dialogue** — each turn builds on your latest answer
- **Guided autonomy** — provides hints and resources without solving everything
- **Reflection loops** — asks you to summarize decisions and reasoning before moving on

**Example**

You ask: _"I'm getting `TypeError: NoneType object is not iterable` in Python."_

Mukti responds with a compact sequence:

1. "Which variable is `None` at the failure point?"
2. "What input path can produce that `None` value?"
3. "Can you add a guard and a focused test for that path?"
4. "Here is a debugging reference for this exact error class."

## Quickstart

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Git](https://git-scm.com/)

### 1. Clone the repo

```bash
git clone https://github.com/shettydev/mukti.git
cd mukti
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set your `OPENROUTER_API_KEY` — this powers all AI/Socratic features.
Get a free key at [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys).

Everything else has sensible defaults for local development.

### 3. Start everything

```bash
docker compose up -d
```

This boots the full stack:

| Service | Description                | Port  |
| ------- | -------------------------- | ----- |
| MongoDB | Database                   | 27017 |
| Redis   | Cache and queues           | 6379  |
| Seed    | One-shot DB seeder (exits) | —     |
| API     | NestJS backend             | 3000  |
| Web     | Next.js frontend           | 3001  |

The seed step is idempotent and runs automatically before the API starts.

### 4. Open Mukti

Navigate to [http://localhost:3001](http://localhost:3001) in your browser.

### 5. Log in

Use one of the seeded accounts:

| Email              | Password            |
| ------------------ | ------------------- |
| `test@mukti.app`   | `testpassword123`   |
| `admin@mukti.chat` | `muktifrombrainrot` |

> If you previously seeded the old `admin@mukti.live` user, reset the database with
> `docker compose down -v && docker compose up -d` to pick up the new seed.

### Useful commands

```bash
docker compose up -d --build   # Rebuild and restart
docker compose down            # Stop everything
docker compose logs -f api     # Tail API logs
docker compose up seed         # Re-run seed manually
```

## Development (without Docker)

For running services individually with hot-reload, see [DEVELOPMENT.md](DEVELOPMENT.md).

```bash
bun install                         # Install dependencies
docker compose up -d mongodb redis  # Start only databases
bun run dev                         # Start API + Web in watch mode
```

## Repo Structure

```text
.
├── packages/mukti-web        # Next.js frontend
├── packages/mukti-api        # NestJS backend
├── mukti-mcp-server          # MCP server (standalone)
└── docs/                     # RFCs and technical docs
```

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

Inspired by my mentor [Shaik Noorullah](https://github.com/shaiknoorullah) and the Socratic tradition of inquiry.

_"The only true wisdom is in knowing you know nothing."_ — Socrates
