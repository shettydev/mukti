#!/usr/bin/env bun
/**
 * One-command local runtime for Mukti.
 *
 * Boots the API (in MUKTI_LOCAL mode, Claude Code provider) and the web app with
 * zero external services — no Docker, no Redis, no OpenRouter key. Runs preflight
 * checks first and refuses to start a partial stack on failure.
 *
 * The dev servers are spawned directly (`nest start --watch`, `next dev`) rather
 * than through nx, so the task runner's graph/daemon cost stays off the launcher's
 * critical path. Their output is piped, line-buffered, prefixed per service and
 * teed to `.mukti/logs/` so the terminal stays readable and scrollback survives.
 *
 * Usage: bun run start:local
 */
import { intro, log, note, outro, spinner, type SpinnerResult } from '@clack/prompts';
import { type ChildProcess, spawn, spawnSync } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, type WriteStream } from 'fs';
import { createConnection } from 'net';
import { join, relative, resolve } from 'path';
import pc from 'picocolors';

const API_PORT = 3000;
const WEB_PORT = 3001;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const REPO_ROOT = process.cwd();
const BIN_DIR = resolve(REPO_ROOT, 'node_modules/.bin');
const LOG_DIR = resolve(REPO_ROOT, '.mukti/logs');

/** Boot-phase output held back so it cannot garble the active spinner. */
const MAX_BUFFERED_BOOT_LINES = 400;

// ── Service definitions ────────────────────────────────────────────────────

interface ServiceSpec {
  /** Args passed to the binary — mirrors the nx `serve`/`dev` target commands. */
  readonly args: readonly string[];
  /** Binary resolved from the workspace bin dir. */
  readonly bin: string;
  readonly cwd: string;
  readonly name: string;
  readonly port: number;
  /** Log line printed once the server has finished booting. */
  readonly readyPattern: RegExp;
  readonly tint: (text: string) => string;
}

const API_SPEC: ServiceSpec = {
  args: ['start', '--watch'],
  bin: 'nest',
  cwd: resolve(REPO_ROOT, 'packages/mukti-api'),
  name: 'api',
  port: API_PORT,
  readyPattern: /Nest application successfully started|API listening at/i,
  tint: pc.cyan,
};

const WEB_SPEC: ServiceSpec = {
  args: ['dev', '-p', String(WEB_PORT)],
  bin: 'next',
  cwd: resolve(REPO_ROOT, 'packages/mukti-web'),
  name: 'web',
  port: WEB_PORT,
  readyPattern: /Ready in|started server on/i,
  tint: pc.magenta,
};

/**
 * The API logs "Connecting to MongoDB at …" immediately after the embedded
 * server has booted and handed back its URI — so this marks the end of the
 * (first-run, binary-downloading) database phase. Mongoose's own `connected`
 * event is not usable here: it can fire before Nest attaches its listener.
 * The API's ready line is accepted too, in case the wording ever drifts.
 */
const MONGO_READY = /Connecting to MongoDB at|Nest application successfully started/i;

interface Service {
  readonly child: ChildProcess;
  /** Resolves when the child exits, so a boot phase can fail fast. */
  readonly exited: Promise<number | null>;
  readonly lineListeners: Array<(line: string) => void>;
  readonly logFile: WriteStream;
  readonly spec: ServiceSpec;
}

// ── Small helpers ──────────────────────────────────────────────────────────

/** Unref'd so a pending timeout never keeps the process alive on shutdown. */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => {
    setTimeout(r, ms).unref?.();
  });
}

/** Resolves true if something is already listening on the port. */
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolvePort) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.on('connect', () => {
      socket.destroy();
      resolvePort(true);
    });
    socket.on('error', () => resolvePort(false));
  });
}

async function waitForPort(port: number, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortInUse(port)) return true;
    await sleep(500);
  }
  return false;
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(cmd, [url], {
    detached: true,
    shell: process.platform === 'win32',
    stdio: 'ignore',
  }).unref();
}

/**
 * Resolves a workspace binary without assuming a shell or a particular hoisting
 * layout. Falls back to `bun x <bin>`, which resolves the local install itself.
 */
function resolveBin(bin: string): { args: string[]; command: string; shell: boolean } {
  const isWindows = process.platform === 'win32';
  for (const candidate of isWindows ? [`${bin}.cmd`, `${bin}.exe`, bin] : [bin]) {
    const full = join(BIN_DIR, candidate);
    if (!existsSync(full)) continue;
    // `.cmd` shims are only executable through a shell on Windows.
    const needsShell = isWindows && candidate.endsWith('.cmd');
    return { args: [], command: needsShell ? `"${full}"` : full, shell: needsShell };
  }
  return { args: ['x', bin], command: 'bun', shell: false };
}

// ── Log rendering ──────────────────────────────────────────────────────────

/**
 * Cursor-movement, erase, scroll and screen-reset sequences. SGR colour codes
 * (`ESC[…m`) are deliberately left alone so each server's own colouring survives;
 * stripping only the repaint codes is what preserves native scrollback.
 */
const CONTROL_SEQUENCES = [
  /\u001B\[[0-9;]*[ABCDEFGHJKSTfsu]/g, // cursor move / erase / scroll / save-restore
  /\u001B\[\?[0-9;]*[hl]/g, // private modes, e.g. hide/show cursor
  /\u001B\][^\u0007\u001B]*(?:\u0007|\u001B\\)/g, // OSC, e.g. window title
  /\u001Bc/g, // full terminal reset
];

function stripControl(text: string): string {
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
    for (const line of lines) onLine(line);
  };
}

let streaming = false;
const bufferedBootLines: string[] = [];

function emit(spec: ServiceSpec, raw: string): void {
  const content = stripControl(raw).trimEnd();
  if (!content.trim()) return;
  const line = `${spec.tint(`[${spec.name}]`)} ${content}`;
  if (streaming) {
    process.stdout.write(`${line}\n`);
    return;
  }
  bufferedBootLines.push(line);
  if (bufferedBootLines.length > MAX_BUFFERED_BOOT_LINES) bufferedBootLines.shift();
}

/** Surfaces the output held back during boot, so a boot failure is diagnosable. */
function flushBootLines(): void {
  for (const line of bufferedBootLines) process.stdout.write(`${line}\n`);
  bufferedBootLines.length = 0;
}

// ── Preflight ──────────────────────────────────────────────────────────────

intro(pc.inverse(pc.cyan(' mukti ')));

const preflight = spinner();
preflight.start('Running preflight checks');

/** Fails the active spinner, prints remediation, and exits before anything boots. */
function failPreflight(headline: string, remediation: string): never {
  preflight.error(`Preflight failed — ${headline}`);
  log.error(remediation);
  process.exit(1);
}

const version = spawnSync('claude', ['--version'], { encoding: 'utf8' });
if (version.error || version.status !== 0) {
  failPreflight(
    'the `claude` CLI was not found on PATH',
    'Install Claude Code: https://docs.claude.com/en/docs/claude-code/overview'
  );
}
const claudeVersion = version.stdout.trim();

preflight.message('Checking Claude CLI authentication');
const status = spawnSync('claude', ['auth', 'status'], { encoding: 'utf8' });
let loggedIn = false;
try {
  loggedIn = (JSON.parse(status.stdout) as { loggedIn?: boolean }).loggedIn === true;
} catch {
  loggedIn = false;
}
if (!loggedIn) {
  failPreflight('the `claude` CLI is not authenticated', 'Run `claude login` and try again.');
}

preflight.message('Checking ports');
for (const port of [API_PORT, WEB_PORT]) {
  if (await isPortInUse(port)) {
    failPreflight(
      `port ${port} is already in use`,
      `Stop the process using port ${port} (or free the port) and retry.`
    );
  }
}

preflight.stop(
  `Preflight passed — Claude CLI ${claudeVersion}, ports ${API_PORT}/${WEB_PORT} free`
);

// ── Boot ───────────────────────────────────────────────────────────────────

mkdirSync(LOG_DIR, { recursive: true });

const env = {
  ...process.env,
  AI_PROVIDER: 'claude-code',
  MUKTI_LOCAL: '1',
  // Client-visible local-mode signal for the Next.js web process (read by
  // middleware.ts and client components via isLocalMode()).
  NEXT_PUBLIC_MUKTI_LOCAL: '1',
  // Keep the embedded DB at the repo root regardless of each child's cwd.
  MUKTI_LOCAL_DB_PATH: resolve(REPO_ROOT, '.mukti/local-db'),
};

function startService(spec: ServiceSpec): Service {
  const { args, command, shell } = resolveBin(spec.bin);
  const logFile = createWriteStream(join(LOG_DIR, `${spec.name}.log`));
  const child = spawn(command, [...args, ...spec.args], {
    cwd: spec.cwd,
    // Own process group, so shutdown can signal the CLI wrapper *and* the
    // server it spawns. Without this, `nest`/`next` grandchildren survive and
    // keep holding the ports.
    detached: process.platform !== 'win32',
    env,
    shell,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const lineListeners: Array<(line: string) => void> = [];
  for (const stream of [child.stdout, child.stderr]) {
    if (!stream) continue;
    stream.setEncoding('utf8');
    const read = createLineReader((line) => {
      emit(spec, line);
      // Copy: a ready-line listener removes itself while we iterate.
      for (const listener of [...lineListeners]) listener(line);
    });
    stream.on('data', (chunk: string) => {
      logFile.write(chunk); // tee the raw output, control codes and all
      read(chunk);
    });
  }

  const exited = new Promise<number | null>((resolveExit) => {
    child.once('exit', (code) => resolveExit(code));
  });

  return { child, exited, lineListeners, logFile, spec };
}

const services: Service[] = [startService(API_SPEC), startService(WEB_SPEC)];
const [api, web] = services as [Service, Service];

// ── Shutdown ───────────────────────────────────────────────────────────────

let shuttingDown = false;

/** Signals a child and everything it spawned. */
function killTree(service: Service, signal: NodeJS.Signals): void {
  const { pid } = service.child;
  if (pid === undefined) return;
  try {
    // A negative pid targets the whole process group (see `detached` above).
    if (process.platform === 'win32') service.child.kill(signal);
    else process.kill(-pid, signal);
  } catch {
    // Already gone — nothing to signal.
  }
}

async function shutdown(code = 0): Promise<never> {
  // A second Ctrl-C while shutting down means "just get me out".
  if (!shuttingDown) {
    shuttingDown = true;
    for (const service of services) killTree(service, 'SIGINT');
    await Promise.race([Promise.all(services.map((s) => s.exited)), sleep(5_000)]);
    for (const service of services) {
      killTree(service, 'SIGKILL');
      service.logFile.end();
    }
  }
  process.exit(code);
}

function onSignal(): void {
  void shutdown(0);
}

/**
 * (Re)arms the shutdown handlers. Clack's spinner registers its own SIGINT /
 * SIGTERM listeners and drops them again on `stop()` — and under Bun that
 * `removeListener` restores the *default* signal disposition even though our
 * listener is still registered, so a later Ctrl-C would kill the launcher
 * outright and orphan both dev servers. Re-arming after every spinner keeps
 * shutdown in our hands.
 */
function armSignalHandlers(): void {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.removeListener(signal, onSignal);
    process.on(signal, onSignal);
  }
}

armSignalHandlers();

// ── Phase tracking ─────────────────────────────────────────────────────────

type PhaseOutcome = 'exited' | 'ready' | 'timeout';

function waitForLine(service: Service, pattern: RegExp): Promise<void> {
  return new Promise((resolveLine) => {
    const listener = (line: string): void => {
      if (!pattern.test(stripControl(line))) return;
      const index = service.lineListeners.indexOf(listener);
      if (index !== -1) service.lineListeners.splice(index, 1);
      resolveLine();
    };
    service.lineListeners.push(listener);
  });
}

/**
 * Resolves as soon as the service reports ready (log line), its port opens
 * (fallback, in case the ready-line wording drifts between versions), it exits,
 * or the phase times out.
 */
function awaitPhase(
  service: Service,
  pattern: RegExp,
  options: { port?: number; timeoutMs: number }
): Promise<PhaseOutcome> {
  const races: Array<Promise<PhaseOutcome>> = [
    waitForLine(service, pattern).then<PhaseOutcome>(() => 'ready'),
    service.exited.then<PhaseOutcome>(() => 'exited'),
    sleep(options.timeoutMs).then<PhaseOutcome>(() => 'timeout'),
  ];
  if (options.port !== undefined) {
    races.push(
      waitForPort(options.port, options.timeoutMs).then<PhaseOutcome>((up) =>
        up ? 'ready' : 'timeout'
      )
    );
  }
  return Promise.race(races);
}

/** Fails the phase's spinner, shows the held-back output, and tears down. */
function failPhase(active: SpinnerResult, phase: string, outcome: PhaseOutcome): Promise<never> {
  active.error(`${phase} failed — ${outcome === 'exited' ? 'the process exited' : 'timed out'}`);
  flushBootLines();
  log.error(`Full logs: ${relative(REPO_ROOT, LOG_DIR)}/api.log, web.log`);
  return shutdown(1);
}

async function runPhase(
  message: string,
  doneMessage: string,
  service: Service,
  pattern: RegExp,
  options: { port?: number; timeoutMs: number }
): Promise<void> {
  const active = spinner();
  active.start(message);
  const outcome = await awaitPhase(service, pattern, options);
  if (outcome !== 'ready') await failPhase(active, message, outcome);
  active.stop(doneMessage);
  armSignalHandlers();
}

await runPhase(
  'Starting embedded MongoDB (first run downloads a one-time binary)',
  'Embedded MongoDB ready',
  api,
  MONGO_READY,
  { timeoutMs: 300_000 }
);

await runPhase(`Waiting for the API on :${API_PORT}`, 'API ready', api, API_SPEC.readyPattern, {
  port: API_PORT,
  timeoutMs: 180_000,
});

await runPhase(
  `Waiting for the web app on :${WEB_PORT}`,
  'Web app ready',
  web,
  WEB_SPEC.readyPattern,
  {
    port: WEB_PORT,
    timeoutMs: 180_000,
  }
);

// ── Ready ──────────────────────────────────────────────────────────────────

note(
  [
    `${pc.green('▲')} ${pc.bold(WEB_URL)}`,
    '',
    `${pc.dim('logs')}  ${relative(REPO_ROOT, LOG_DIR)}/api.log, web.log`,
    `${pc.dim('stop')}  Ctrl-C`,
  ].join('\n'),
  'Mukti is ready'
);
outro(pc.dim('streaming logs…'));

// Only stream once the last spinner is gone, so frames never interleave.
bufferedBootLines.length = 0;
streaming = true;

// The ready banner's spinner is the last one — re-arm before handing over.
armSignalHandlers();

openBrowser(WEB_URL);

// From here on, a child exiting on its own tears the whole stack down.
for (const service of services) {
  service.child.once('exit', (code) => {
    if (shuttingDown) return;
    process.stdout.write(
      pc.red(`\n${service.spec.name} exited (code ${code ?? 'unknown'}); shutting down.\n`)
    );
    void shutdown(1);
  });
}
