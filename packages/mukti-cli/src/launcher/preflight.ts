/**
 * Preflight checks, shared by both launcher modes.
 *
 * @remarks
 * Claude Code is a hard prerequisite in both: Mukti's local runtime uses the
 * `claude` CLI as its AI provider, so starting a stack without it produces an
 * app that looks fine until the first question and then fails. Checking up
 * front, with remediation, is the difference between a clear message and a
 * confusing one.
 *
 * Mode-specific checks (free ports in repo mode, a usable Node for the
 * database daemon) are passed in rather than hardcoded, because the two modes
 * genuinely differ: repo mode refuses when its fixed ports are taken, while
 * the published CLI falls forward to another port instead.
 */
import { log, spinner } from '@clack/prompts';
import { spawnSync } from 'node:child_process';

export interface PreflightFailure {
  readonly headline: string;
  readonly remediation: string;
}

export interface PreflightCheck {
  /** Shown on the spinner while the check runs. */
  readonly message: string;
  readonly run: () => Promise<PreflightFailure | undefined> | PreflightFailure | undefined;
}

/**
 * Runs the Claude Code checks plus any mode-specific ones, and exits non-zero
 * with remediation on the first failure — before anything is started.
 *
 * @returns the reported `claude` version, for the success line.
 */
export async function runPreflight(
  checks: readonly PreflightCheck[] = []
): Promise<{ claudeVersion: string }> {
  const active = spinner();
  active.start('Running preflight checks');

  const fail = (failure: PreflightFailure): never => {
    active.error(`Preflight failed — ${failure.headline}`);
    log.error(failure.remediation);
    process.exit(1);
  };

  const version = spawnSync('claude', ['--version'], { encoding: 'utf8' });
  if (version.error || version.status !== 0) {
    fail({
      headline: 'the `claude` CLI was not found on PATH',
      remediation: 'Install Claude Code: https://docs.claude.com/en/docs/claude-code/overview',
    });
  }
  const claudeVersion = version.stdout.trim();

  active.message('Checking Claude CLI authentication');
  const status = spawnSync('claude', ['auth', 'status'], { encoding: 'utf8' });
  let loggedIn = false;
  try {
    loggedIn = (JSON.parse(status.stdout) as { loggedIn?: boolean }).loggedIn === true;
  } catch {
    loggedIn = false;
  }
  if (!loggedIn) {
    fail({
      headline: 'the `claude` CLI is not authenticated',
      remediation: 'Run `claude login` and try again.',
    });
  }

  for (const check of checks) {
    active.message(check.message);
    const failure = await check.run();
    if (failure) fail(failure);
  }

  active.stop(`Preflight passed — Claude CLI ${claudeVersion}`);
  return { claudeVersion };
}
