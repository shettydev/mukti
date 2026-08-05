/**
 * The boot sequence, shared by both launcher modes.
 *
 * @remarks
 * Phase labels name the work actually being performed while they are shown.
 * That is a correctness property, not a cosmetic one: the previous launcher
 * displayed "Starting embedded MongoDB" across the entire API compile, which
 * made an 11s TypeScript build look like database cost and sent optimisation
 * effort at the wrong target. The database and API phases are concurrent here,
 * and the label says so.
 *
 * The only thing that differs between repo mode and the published CLI is the
 * `ServiceSpec`s handed in — spawning dev servers versus prebuilt artifacts.
 */
import { log, outro, spinner } from '@clack/prompts';
import { spawn } from 'node:child_process';
import pc from 'picocolors';

import { renderReadyBanner } from './banner.ts';
import { isMongoBinaryCached, MONGO_DOWNLOAD_PROGRESS } from './database.ts';
import { sleep, waitForPort } from './net.ts';
import {
  armSignalHandlers,
  flushBootLines,
  type Service,
  type ServiceSpec,
  shutdown,
  startService,
  startStreaming,
  stripControl,
  superviseAfterReady,
} from './services.ts';

export interface BootPlan {
  readonly api: ServiceSpec;
  readonly apiPort: number;
  /**
   * What the API is doing while the database starts — "compiling the API" in
   * repo mode, "starting the API" from prebuilt output. Shown to the user, so
   * it must be true of the mode it is used in.
   */
  readonly apiWork: string;
  readonly db: ServiceSpec;
  readonly dbPort: number;
  readonly logDir: string;
  /** Human-readable pointer to the log files, shown on the ready banner. */
  readonly logHint: string;
  readonly web: ServiceSpec;
  readonly webPort: number;
  readonly webUrl: string;
}

type PhaseOutcome = 'exited' | 'ready' | 'timeout';

/** Clack declares this interface but does not export the type. */
type SpinnerResult = ReturnType<typeof spinner>;

/**
 * Starts the stack and returns once the web app is reachable, having shown the
 * ready banner and opened the browser. Never returns on failure — it reports
 * which phase failed and shuts the stack down.
 */
export async function boot(plan: BootPlan): Promise<void> {
  // All three start at once. The database does not wait for the API to finish
  // starting and ask for a connection; it comes up alongside it.
  const db = startService(plan.db, plan.logDir);
  const api = startService(plan.api, plan.logDir);
  const web = startService(plan.web, plan.logDir);

  armSignalHandlers();

  const bootStart = Date.now();
  const since = (start: number): string => `${((Date.now() - start) / 1000).toFixed(1)}s`;

  const dbPhase = spinner();
  let dbPhaseActive = true;

  dbPhase.start(
    isMongoBinaryCached()
      ? `Starting the embedded database, ${plan.apiWork}`
      : `Downloading the one-time database binary (141 MB), ${plan.apiWork}`
  );

  // The database reports its own download progress; surface it live so a
  // multi-minute first run is never an unexplained stall.
  db.lineListeners.push((line) => {
    const match = MONGO_DOWNLOAD_PROGRESS.exec(stripControl(line));
    if (match && dbPhaseActive) {
      dbPhase.message(`Downloading the database binary — ${match[1]}%, ${plan.apiWork}`);
    }
  });

  let dbElapsed: string | undefined;

  const dbReady = awaitPhase(db, plan.db.readyPattern, {
    port: plan.dbPort,
    timeoutMs: 600_000,
  }).then((outcome) => {
    if (outcome === 'ready') {
      dbElapsed = since(bootStart);
      if (dbPhaseActive) {
        dbPhase.message(`Database ready in ${dbElapsed}, still ${plan.apiWork}`);
      }
    }
    return outcome;
  });

  const apiReady = awaitPhase(api, plan.api.readyPattern, {
    port: plan.apiPort,
    timeoutMs: 300_000,
  });

  // A database that never comes up must fail the boot here, rather than
  // leaving the API retrying a connection that cannot succeed.
  const raced = await Promise.race([
    apiReady.then((outcome) => ({ outcome, what: 'API startup' })),
    dbReady.then((outcome) =>
      outcome === 'ready'
        ? // Deliberately never settles: a healthy database must not win this
          // race, it only needs to be able to lose it by failing.
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          new Promise<{ outcome: PhaseOutcome; what: string }>(() => {})
        : { outcome, what: 'Embedded database startup' }
    ),
  ]);

  dbPhaseActive = false;
  if (raced.outcome !== 'ready') {
    await failPhase(dbPhase, raced.what, raced.outcome, plan.logHint);
  }

  dbPhase.stop(
    `Database ready in ${dbElapsed ?? since(bootStart)}, API ready in ${since(bootStart)}`
  );
  armSignalHandlers();

  const webPhase = spinner();
  webPhase.start(`Starting the web app on :${plan.webPort}`);
  const webOutcome = await awaitPhase(web, plan.web.readyPattern, {
    port: plan.webPort,
    timeoutMs: 180_000,
  });
  if (webOutcome !== 'ready') {
    await failPhase(webPhase, 'Web app startup', webOutcome, plan.logHint);
  }
  webPhase.stop(`Web app ready in ${since(bootStart)}`);

  // Close the clack flow first so the wordmark gets the full width, outside the
  // prompt gutter.
  outro(pc.dim('all checks passed'));

  // The last spinner is gone — re-arm before the banner, so a Ctrl-C
  // mid-animation still shuts down cleanly (and restores the cursor).
  armSignalHandlers();

  await renderReadyBanner({ logHint: plan.logHint, url: plan.webUrl });

  // Only stream once the banner has settled, so nothing repaints over it.
  startStreaming();

  openBrowser(plan.webUrl);

  superviseAfterReady(pc.red);
}

/**
 * Resolves as soon as the service reports ready (log line), its port opens
 * (fallback, in case the ready-line wording drifts between versions), it exits,
 * or the phase times out.
 */
function awaitPhase(
  service: Service,
  pattern: RegExp,
  options: { readonly port?: number; readonly timeoutMs: number }
): Promise<PhaseOutcome> {
  const races: Promise<PhaseOutcome>[] = [
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
function failPhase(
  active: SpinnerResult,
  phase: string,
  outcome: PhaseOutcome,
  logHint: string
): Promise<never> {
  active.error(`${phase} failed — ${outcome === 'exited' ? 'the process exited' : 'timed out'}`);
  flushBootLines();
  log.error(`Full logs: ${logHint}`);
  return shutdown(1);
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

function waitForLine(service: Service, pattern: RegExp): Promise<void> {
  return new Promise((resolveLine) => {
    const listener = (line: string): void => {
      if (!pattern.test(stripControl(line))) {
        return;
      }
      const index = service.lineListeners.indexOf(listener);
      if (index !== -1) {
        service.lineListeners.splice(index, 1);
      }
      resolveLine();
    };
    service.lineListeners.push(listener);
  });
}
