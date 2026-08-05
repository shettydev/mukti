/**
 * Spawning, log rendering and teardown for the launcher's child processes.
 *
 * @remarks
 * This is the half of the launcher that is identical in both modes. Repo mode
 * spawns dev servers (`nest start --watch`, `next dev`); the published CLI
 * spawns prebuilt artifacts with no compiler and no watcher. Everything after
 * the spawn — line buffering, per-service prefixes, teeing to log files,
 * process-group teardown — is the same, so it lives here and only the
 * `ServiceSpec`s differ.
 */
import { type ChildProcess, spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs';
import { join } from 'node:path';

import { SHOW_CURSOR } from './banner.ts';
import { sleep } from './net.ts';

/** Boot-phase output held back so it cannot garble the active spinner. */
const MAX_BUFFERED_BOOT_LINES = 400;

export interface Service {
  readonly child: ChildProcess;
  /** Resolves when the child exits, so a boot phase can fail fast. */
  readonly exited: Promise<null | number>;
  readonly lineListeners: ((line: string) => void)[];
  readonly logFile: WriteStream;
  readonly spec: ServiceSpec;
}

export interface ServiceSpec {
  /** Args passed to the command. */
  readonly args: readonly string[];
  /** Command to run, already resolved to something spawnable. */
  readonly command: string;
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly name: string;
  /** Log line printed once the server has finished booting. */
  readonly readyPattern: RegExp;
  /** Whether the command needs a shell (Windows `.cmd` shims). */
  readonly shell?: boolean;
  readonly tint: (text: string) => string;
}

/**
 * Cursor-movement, erase, scroll and screen-reset sequences. SGR colour codes
 * (`ESC[…m`) are deliberately left alone so each server's own colouring survives;
 * stripping only the repaint codes is what preserves native scrollback.
 */
// Matching control characters is the entire job here: these patterns exist to
// strip terminal escape sequences out of child-process output.
/* eslint-disable no-control-regex */
const CONTROL_SEQUENCES = [
  /\u001B\[[0-9;]*[ABCDEFGHJKSTfsu]/g, // cursor move / erase / scroll / save-restore
  /\u001B\[\?[0-9;]*[hl]/g, // private modes, e.g. hide/show cursor
  /\u001B\][^\u0007\u001B]*(?:\u0007|\u001B\\)/g, // OSC, e.g. window title
  /\u001Bc/g, // full terminal reset
];
/* eslint-enable no-control-regex */

export function stripControl(text: string): string {
  return CONTROL_SEQUENCES.reduce((acc, pattern) => acc.replace(pattern, ''), text);
}

/**
 * Splits a byte stream into lines, carrying a partial line across chunks. A bare
 * `\r` counts as a boundary so `next dev`'s compile-spinner repaints flush as
 * ordinary lines instead of sitting in the buffer forever.
 */
function createLineReader(onLine: (line: string) => void): (chunk: string) => void {
  let buffer = '';
  return (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r\n|\r|\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      onLine(line);
    }
  };
}

let streaming = false;
const bufferedBootLines: string[] = [];

/** Surfaces the output held back during boot, so a boot failure is diagnosable. */
export function flushBootLines(): void {
  for (const line of bufferedBootLines) {
    process.stdout.write(`${line}\n`);
  }
  bufferedBootLines.length = 0;
}

/** Switches from held-back boot output to live streaming, once the banner has settled. */
export function startStreaming(): void {
  bufferedBootLines.length = 0;
  streaming = true;
}

function emit(spec: ServiceSpec, raw: string): void {
  const content = stripControl(raw).trimEnd();
  if (!content.trim()) {
    return;
  }
  const line = `${spec.tint(`[${spec.name}]`)} ${content}`;
  if (streaming) {
    process.stdout.write(`${line}\n`);
    return;
  }
  bufferedBootLines.push(line);
  if (bufferedBootLines.length > MAX_BUFFERED_BOOT_LINES) {
    bufferedBootLines.shift();
  }
}

/** Every service started in this process, in start order. */
const services: Service[] = [];

export function startService(spec: ServiceSpec, logDir: string): Service {
  mkdirSync(logDir, { recursive: true });
  const logFile = createWriteStream(join(logDir, `${spec.name}.log`));
  const child = spawn(spec.command, [...spec.args], {
    cwd: spec.cwd,
    // Own process group, so shutdown can signal a CLI wrapper *and* the server
    // it spawns. Without this, `nest`/`next` grandchildren survive and keep
    // holding the ports.
    detached: process.platform !== 'win32',
    env: spec.env,
    shell: spec.shell ?? false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const lineListeners: ((line: string) => void)[] = [];
  for (const stream of [child.stdout, child.stderr]) {
    if (!stream) {
      continue;
    }
    stream.setEncoding('utf8');
    const read = createLineReader((line) => {
      emit(spec, line);
      // Copy: a ready-line listener removes itself while we iterate.
      for (const listener of [...lineListeners]) {
        listener(line);
      }
    });
    stream.on('data', (chunk: string) => {
      logFile.write(chunk); // tee the raw output, control codes and all
      read(chunk);
    });
  }

  const exited = new Promise<null | number>((resolveExit) => {
    child.once('exit', (code) => resolveExit(code));
  });

  const service: Service = { child, exited, lineListeners, logFile, spec };
  services.push(service);
  return service;
}

let shuttingDown = false;

/**
 * (Re)arms the shutdown handlers. Clack's spinner registers its own SIGINT /
 * SIGTERM listeners and drops them again on `stop()` — and under Bun that
 * `removeListener` restores the *default* signal disposition even though our
 * listener is still registered, so a later Ctrl-C would kill the launcher
 * outright and orphan the servers. Re-arming after every spinner keeps
 * shutdown in our hands.
 */
export function armSignalHandlers(): void {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.removeListener(signal, onSignal);
    process.on(signal, onSignal);
  }
}

/**
 * Stops every started service — including the embedded database, which is a
 * service like any other — and exits. Safe to call twice: a second Ctrl-C
 * while shutting down means "just get me out".
 */
export async function shutdown(code = 0): Promise<never> {
  if (!shuttingDown) {
    shuttingDown = true;
    // The banner hides the cursor while it animates; never leave it hidden.
    if (process.stdout.isTTY) {
      process.stdout.write(SHOW_CURSOR);
    }
    for (const service of services) {
      killTree(service, 'SIGINT');
    }
    await Promise.race([Promise.all(services.map((s) => s.exited)), sleep(5_000)]);
    for (const service of services) {
      killTree(service, 'SIGKILL');
      service.logFile.end();
    }
  }
  process.exit(code);
}

/**
 * After this point a child exiting on its own tears the whole stack down,
 * rather than leaving a half-running stack that looks healthy.
 */
export function superviseAfterReady(tint: (text: string) => string): void {
  for (const service of services) {
    service.child.once('exit', (code) => {
      if (shuttingDown) {
        return;
      }
      process.stdout.write(
        tint(`\n${service.spec.name} exited (code ${code ?? 'unknown'}); shutting down.\n`)
      );
      void shutdown(1);
    });
  }
}

/** Signals a child and everything it spawned. */
function killTree(service: Service, signal: NodeJS.Signals): void {
  const { pid } = service.child;
  if (pid === undefined) {
    return;
  }
  try {
    // A negative pid targets the whole process group (see `detached` above).
    if (process.platform === 'win32') {
      service.child.kill(signal);
    } else {
      process.kill(-pid, signal);
    }
  } catch {
    // Already gone — nothing to signal.
  }
}

function onSignal(): void {
  void shutdown(0);
}
