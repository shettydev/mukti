/**
 * Runs the prebuilt API in its own process.
 *
 * @remarks
 * The CLI supervises the API the same way it supervises the web app and the
 * database — separate process, log teeing, process-group teardown — so it
 * needs something spawnable. `@mukti/api` exposes `startApi()` rather than a
 * process entry, and it is CommonJS, hence the default-import interop below.
 *
 * Shipped alongside the bundled CLI rather than bundled into it, because
 * `@mukti/api` is deliberately kept external: it is large, changes on its own
 * cadence, and npm should cache it independently of the CLI.
 */
import api from '@mukti/api';

const { startApi } = api;

await startApi({
  // Loopback only: local mode runs with the auth guard bypassed for a seeded
  // user, so the API must not be reachable from the network.
  host: process.env.MUKTI_BIND_HOST ?? '127.0.0.1',
  port: Number(process.env.PORT),
});
