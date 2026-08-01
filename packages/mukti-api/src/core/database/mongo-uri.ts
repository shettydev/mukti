import { mkdirSync } from 'fs';
import { resolve } from 'path';

import { isLocalMode, LOCAL_DB_PATH } from '../../common/config/local-mode';

/**
 * Resolving the MongoDB URI in local mode, and owning the embedded server.
 *
 * @remarks
 * The launcher starts the embedded database itself (concurrently with API
 * boot) and hands the URI over via `MUKTI_LOCAL_MONGO_URI`; the API then just
 * connects. Running the API directly (`nest start`, no launcher) leaves the
 * variable unset, and the API starts its own file-backed server as before.
 *
 * Lifecycle ownership follows whichever process started the server: the API
 * stops the embedded server on shutdown only when it started one here, never
 * one the launcher owns. `mongodb-memory-server` stays behind a dynamic
 * import so hosted builds never load it.
 */

/**
 * The embedded server this process started, held for shutdown. `unknown`
 * avoids importing the type when the optional dependency is absent.
 */
let localMongoServer: undefined | { stop(): Promise<boolean> };

/**
 * Whether this process started an embedded server (and therefore owns its
 * shutdown). Exposed for tests and for ownership-aware logging.
 */
export function ownsEmbeddedMongo(): boolean {
  return localMongoServer !== undefined;
}

/**
 * Resolves the MongoDB connection URI. Local mode uses the injected or
 * embedded local database; hosted mode uses the configured URI.
 */
export async function resolveMongoUri(config: {
  get(key: string): string | undefined;
}): Promise<string> {
  if (isLocalMode()) {
    return resolveLocalMongoUri();
  }

  return config.get('MONGODB_URI') ?? 'mongodb://localhost:27017/mukti';
}

/**
 * Stops the embedded server if — and only if — this process started one.
 * Returns whether a server was stopped, so the caller can log accurately.
 */
export async function stopEmbeddedMongoIfOwned(): Promise<boolean> {
  if (!localMongoServer) {
    return false;
  }
  const server = localMongoServer;
  localMongoServer = undefined;
  await server.stop();
  return true;
}

/**
 * Resolves the local-mode MongoDB URI: the externally supplied one when
 * present, otherwise a freshly started embedded, file-backed server under
 * `.mukti/local-db/` so data survives restarts with no Docker.
 */
async function resolveLocalMongoUri(): Promise<string> {
  const injected = process.env.MUKTI_LOCAL_MONGO_URI;
  if (injected) {
    return injected;
  }

  // The launcher passes MUKTI_LOCAL_DB_PATH so data lands at the repo root
  // regardless of the process cwd; fall back to cwd-relative otherwise.
  const dbPath =
    process.env.MUKTI_LOCAL_DB_PATH ?? resolve(process.cwd(), LOCAL_DB_PATH);
  mkdirSync(dbPath, { recursive: true });

  // Dynamic import keeps the optional dependency out of the hosted path.
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const server = await MongoMemoryServer.create({
    instance: { dbName: 'mukti', dbPath, storageEngine: 'wiredTiger' },
  });
  localMongoServer = server;
  return server.getUri();
}
