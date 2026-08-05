/**
 * Types for the published web package's programmatic entrypoint (`start.mjs`).
 *
 * Hand-written because the entrypoint is plain JavaScript: it ships in a
 * package whose build output is a Next.js standalone tree, with no TypeScript
 * compilation step of its own to emit declarations from.
 */
import type { ChildProcess } from 'node:child_process';

export interface StartWebOptions {
  /**
   * Origin the browser client should call, e.g. `http://127.0.0.1:3000/api/v1`.
   * Omit for hosted-style deployments, where the build-time value applies.
   */
  readonly apiUrl?: string;
  /**
   * Bind address. Defaults to loopback, so a local instance running with auth
   * bypassed is not reachable from the network.
   */
  readonly host?: string;
  /**
   * Whether to run in `MUKTI_LOCAL` mode. Defaults to true, which is the only
   * mode the published CLI uses.
   */
  readonly localMode?: boolean;
  readonly port: number;
}

/** Absolute path to the standalone server's entry script. */
export declare function webServerEntry(): string;

/** The environment the standalone server expects, derived from `options`. */
export declare function webServerEnv(options: StartWebOptions): NodeJS.ProcessEnv;

/** Starts the standalone server as a child process the caller must stop. */
export declare function startWeb(options: StartWebOptions): ChildProcess;
