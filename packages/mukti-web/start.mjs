/**
 * Programmatic entrypoint for the prebuilt web app.
 *
 * @remarks
 * The published CLI starts the web app through this rather than `next start` —
 * the package ships a Next.js standalone server and carries neither the Next
 * CLI nor a build step.
 *
 * The server runs as a child process rather than in-process: Next's standalone
 * `server.js` starts listening on import and offers no handle to stop it, and
 * the CLI needs to supervise, log-tee and tear it down like any other service.
 *
 * The resolved API origin is passed as `MUKTI_API_URL`, which the app's
 * middleware mirrors into a script-readable cookie so the browser client calls
 * the port the API actually bound — see `src/lib/runtime-config.ts`. This is
 * what lets one published bundle survive port fallback with no rebuild.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = dirname(fileURLToPath(import.meta.url));

/**
 * Absolute path to the standalone server's entry script, for a caller that
 * would rather spawn and supervise the process itself.
 *
 * @returns {string}
 */
export function webServerEntry() {
  const entry = resolve(PACKAGE_ROOT, 'standalone', 'packages', 'mukti-web', 'server.js');
  if (!existsSync(entry)) {
    throw new Error(
      `@muktiai/web is missing its standalone build (looked for ${entry}). ` +
        'This package must be published with `node scripts/assemble-standalone.mjs` run after `next build`.'
    );
  }
  return entry;
}

/**
 * Builds the environment the standalone server expects.
 *
 * @param {StartWebOptions} options
 * @returns {NodeJS.ProcessEnv}
 */
export function webServerEnv(options) {
  const { apiUrl, host = '127.0.0.1', localMode = true, port } = options;
  return {
    ...process.env,
    HOSTNAME: host,
    // Read per request by middleware.ts and handed to the browser client.
    ...(apiUrl ? { MUKTI_API_URL: apiUrl } : {}),
    ...(localMode ? { NEXT_PUBLIC_MUKTI_LOCAL: '1' } : {}),
    PORT: String(port),
  };
}

/**
 * Starts the standalone server as a child process.
 *
 * @param {StartWebOptions} options
 * @returns {import('node:child_process').ChildProcess} the spawned server;
 *   the caller owns its lifetime and must stop it.
 */
export function startWeb(options) {
  return spawn(process.execPath, [webServerEntry()], {
    cwd: join(PACKAGE_ROOT, 'standalone', 'packages', 'mukti-web'),
    env: webServerEnv(options),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * @typedef {object} StartWebOptions
 * @property {string} [apiUrl] Origin the browser client should call, e.g.
 *   `http://127.0.0.1:3000/api/v1`. Omitted for hosted-style deployments,
 *   where the build-time value applies.
 * @property {string} [host] Bind address. Defaults to loopback, so a local
 *   instance running with auth bypassed is not reachable from the network.
 * @property {boolean} [localMode] Whether to run in `MUKTI_LOCAL` mode.
 *   Defaults to true, which is the only mode the published CLI uses.
 * @property {number} port Port to listen on.
 */
