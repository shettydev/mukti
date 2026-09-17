/**
 * Preflight checks, shared by both launcher modes.
 *
 * @remarks
 * An installed, signed-in AI CLI is a hard prerequisite in both: Mukti's local
 * runtime uses it as its AI provider, so starting a stack without it produces an
 * app that looks fine until the first question and then fails. Checking up
 * front, with remediation, is the difference between a clear message and a
 * confusing one. Which CLI, and how it is checked, belongs to the selected
 * provider (see `providers.ts`) — the checks here never assume Claude Code.
 *
 * Mode-specific checks (free ports in repo mode, a usable Node for the
 * database daemon) are passed in rather than hardcoded, because the two modes
 * genuinely differ: repo mode refuses when its fixed ports are taken, while
 * the published CLI falls forward to another port instead.
 */
import { log, spinner } from '@clack/prompts';

import type { LocalCliProvider, RunCommand } from './providers.ts';

import { runCommand } from './providers.ts';

export interface PreflightCheck {
  /** Shown on the spinner while the check runs. */
  readonly message: string;
  readonly run: () => PreflightFailure | Promise<PreflightFailure | undefined> | undefined;
}

export interface PreflightFailure {
  readonly headline: string;
  readonly remediation: string;
}

/** What preflight verified, for the launcher's success line and logs. */
export interface PreflightResult {
  readonly provider: LocalCliProvider;
  /** The CLI's reported version. */
  readonly version: string;
}

/**
 * Runs the selected provider's install and sign-in probes plus any
 * mode-specific checks, and exits non-zero with remediation on the first
 * failure — before anything is started.
 */
export async function runPreflight(options: {
  readonly checks?: readonly PreflightCheck[];
  readonly provider: LocalCliProvider;
  readonly run?: RunCommand;
}): Promise<PreflightResult> {
  const { checks = [], provider, run = runCommand } = options;
  const active = spinner();
  active.start('Running preflight checks');

  const fail = (failure: PreflightFailure): never => {
    active.error(`Preflight failed — ${failure.headline}`);
    log.error(failure.remediation);
    process.exit(1);
  };

  const version =
    provider.version(run) ??
    fail({
      headline: `the \`${provider.binary}\` CLI was not found on PATH`,
      remediation: provider.installRemediation,
    });

  active.message(`Checking ${provider.label} sign-in`);
  if (!provider.isAuthenticated(run)) {
    fail({
      headline: `the \`${provider.binary}\` CLI is not signed in`,
      remediation: provider.signInRemediation,
    });
  }

  for (const check of checks) {
    active.message(check.message);
    const failure = await check.run();
    if (failure) {
      fail(failure);
    }
  }

  active.stop(`Preflight passed — ${provider.label} ${version}`);
  return { provider, version };
}
