#!/usr/bin/env node
/**
 * `npx muktiai` — the whole Mukti stack from one command, no checkout.
 *
 * @remarks
 * Starts prebuilt artifacts: `@muktiai/api` compiled to JavaScript and
 * `@muktiai/web` as a Next.js standalone build. Nothing is compiled on the
 * user's machine, and no file watcher runs — that is the entire point of the
 * published path, and it is what separates a 2.5–6 minute first try from a
 * fast one.
 *
 * Everything except how services are spawned is shared with the contributor
 * launcher (`scripts/start-local.ts`): preflight, phase rendering, log teeing
 * and shutdown all come from `./launcher/`, so the two modes cannot drift.
 */
import { intro, log } from '@clack/prompts';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';

import { resolveMuktiHome } from './home.ts';
import { boot } from './launcher/boot.ts';
import { createDatabaseSpec, mongoUri } from './launcher/database.ts';
import { findFreePort, reserveFreePort } from './launcher/net.ts';
import { runPreflight } from './launcher/preflight.ts';

const DEFAULT_API_PORT = 3000;
const DEFAULT_WEB_PORT = 3001;

/** Files shipped next to the bundled CLI (see `esbuild.config.mjs`). */
const HERE = dirname(fileURLToPath(import.meta.url));

interface Options {
  readonly apiPort: number;
  readonly dataDir?: string;
  readonly webPort: number;
}

function parseArgs(argv: readonly string[]): Options {
  let apiPort = DEFAULT_API_PORT;
  let webPort = DEFAULT_WEB_PORT;
  let dataDir: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = (): string => {
      const next = argv[i + 1];
      if (next === undefined) {
        process.stderr.write(`muktiai: ${arg} needs a value\n`);
        process.exit(1);
      }
      i++;
      return next;
    };
    switch (arg) {
      case '--api-port':
        apiPort = Number(value());
        break;
      case '--data-dir':
        dataDir = value();
        break;
      case '--help':
      case '-h':
        process.stdout.write(HELP);
        process.exit(0);
        break;
      case '--port':
      case '--web-port':
        webPort = Number(value());
        break;
      default:
        process.stderr.write(`muktiai: unknown option ${arg}\n\n${HELP}`);
        process.exit(1);
    }
  }

  return { apiPort, dataDir, webPort };
}

const HELP = `
  muktiai — run Mukti locally

  Usage
    npx muktiai [options]

  Options
    --port, --web-port <n>  Port for the web app (default ${DEFAULT_WEB_PORT})
    --api-port <n>          Port for the API (default ${DEFAULT_API_PORT})
    --data-dir <path>       Where to keep the database and logs
                            (default ~/.mukti, or $MUKTI_HOME)
    -h, --help              Show this

  Requires an installed and authenticated Claude Code CLI.
`;

/**
 * Picks a port, falling forward when the default is taken. Port 3000 being
 * busy is routine on a machine someone is only trying Mukti out on, and
 * refusing to start over it would be hostile for a one-command try-it-out.
 */
async function choosePort(
  preferred: number,
  taken: readonly number[],
  what: string
): Promise<number> {
  const port = await findFreePort(preferred, { taken });
  if (port === undefined) {
    log.error(`No free port for the ${what} near ${preferred}. Free one and try again.`);
    process.exit(1);
  }
  if (port !== preferred) {
    log.info(`Port ${preferred} is in use — running the ${what} on ${port} instead.`);
  }
  return port;
}

intro(pc.inverse(pc.cyan(' mukti ')));

const options = parseArgs(process.argv.slice(2));

await runPreflight();

const home = resolveMuktiHome(options.dataDir);

const apiPort = await choosePort(options.apiPort, [], 'API');
const webPort = await choosePort(options.webPort, [apiPort], 'web app');
const dbPort = await reserveFreePort();

const apiUrl = `http://127.0.0.1:${apiPort}/api/v1`;
const webUrl = `http://localhost:${webPort}`;

// `@muktiai/web` is resolved at runtime rather than bundled: it carries the
// whole standalone tree, and npm should cache it independently of the CLI.
const web = (await import('@muktiai/web')) as {
  webServerEntry(): string;
  webServerEnv(options: {
    apiUrl?: string;
    host?: string;
    localMode?: boolean;
    port: number;
  }): NodeJS.ProcessEnv;
};

const webEntry = web.webServerEntry();

const baseEnv: NodeJS.ProcessEnv = {
  ...process.env,
  AI_PROVIDER: 'claude-code',
  MUKTI_LOCAL: '1',
  // The launcher owns the database; the API connects to this rather than
  // starting one of its own.
  MUKTI_LOCAL_MONGO_URI: mongoUri(dbPort),
};

await boot({
  api: {
    args: [join(HERE, 'run-api.mjs')],
    command: process.execPath,
    cwd: HERE,
    env: {
      ...baseEnv,
      // The web app's origin has to be allowed explicitly, because port
      // fallback means it is not necessarily the built-in default.
      CORS_ORIGINS: `http://localhost:${webPort},http://127.0.0.1:${webPort}`,
      MUKTI_BIND_HOST: '127.0.0.1',
      PORT: String(apiPort),
    },
    name: 'api',
    readyPattern: /Nest application successfully started|API listening at/i,
    tint: pc.cyan,
  },
  apiPort,
  apiWork: 'starting the API',
  db: createDatabaseSpec({
    cwd: HERE,
    daemon: join(HERE, 'embedded-mongo.mjs'),
    dbPath: home.dbPath,
    env: baseEnv,
    nodeBin: process.execPath,
    port: dbPort,
  }),
  dbPort,
  logDir: home.logDir,
  logHint: `${home.logDir}/db.log · api.log · web.log`,
  web: {
    args: [webEntry],
    command: process.execPath,
    cwd: dirname(webEntry),
    env: {
      ...baseEnv,
      // Last, so the server's own PORT/HOSTNAME and the runtime API origin win.
      ...web.webServerEnv({ apiUrl, host: '127.0.0.1', port: webPort }),
    },
    name: 'web',
    readyPattern: /Ready in|started server on/i,
    tint: pc.magenta,
  },
  webPort,
  webUrl,
});
