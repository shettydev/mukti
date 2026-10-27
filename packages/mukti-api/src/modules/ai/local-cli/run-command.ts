/**
 * Runs a probe command for the provider catalogue.
 *
 * @remarks
 * Part of the shared `local-cli` folder: Node built-ins only at runtime (see
 * `provider-catalog.ts` for why).
 */
import { spawn } from 'node:child_process';

import type { CommandResult, RunCommand } from './provider-catalog';

/** Long enough for agy's model listing, short enough to not hang a launch. */
const PROBE_TIMEOUT_MS = 30_000;

/**
 * Runs a probe with stdin closed. `agy` waits on an open stdin, so a probe with
 * a pipe attached would hang until killed.
 */
export const runCommand: RunCommand = (command, args) =>
  new Promise<CommandResult>((resolve) => {
    let child: ReturnType<typeof spawn>;
    let stdout = '';
    let stderr = '';

    try {
      child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      resolve({ error: error as Error, status: null, stderr: '', stdout: '' });
      return;
    }

    const deadline = setTimeout(() => {
      stderr += `\n${command} did not finish within ${PROBE_TIMEOUT_MS / 1000}s`;
      child.kill('SIGTERM');
    }, PROBE_TIMEOUT_MS);

    child.stdout?.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('error', (error) => {
      clearTimeout(deadline);
      resolve({ error, status: null, stderr, stdout });
    });
    child.on('close', (status) => {
      clearTimeout(deadline);
      resolve({ status, stderr, stdout });
    });
  });
