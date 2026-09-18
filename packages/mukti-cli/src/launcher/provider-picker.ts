/**
 * Asking which AI CLI to run Mukti on.
 *
 * @remarks
 * The question is only worth asking with the trade-off in view: the supported
 * CLIs differ by roughly a factor of three in time per reply, and they bill
 * different subscriptions. So every supported CLI is listed — including ones
 * that cannot be used, with the reason, so the user learns what exists — and
 * each option carries its own trade-off from the provider registry.
 *
 * Prompting is deliberately separated from deciding: the prompts are injected,
 * and {@link isInteractive} is the only thing that knows whether asking is
 * possible at all, so a launch without a terminal can never block on an
 * unanswerable question.
 */
import { confirm, isCancel, select } from '@clack/prompts';

import type { LocalCliProvider, ProviderStatus } from './providers.ts';

export interface PickedProvider {
  readonly provider: LocalCliProvider;
  /** Whether to save this as the user's default. */
  readonly remember: boolean;
}

/** The prompts the picker needs, injected so tests need no terminal. */
export interface PickerPrompts {
  readonly confirm: (options: {
    initialValue?: boolean;
    message: string;
  }) => Promise<boolean | symbol>;
  readonly isCancel: (value: unknown) => boolean;
  readonly select: (options: {
    initialValue?: string;
    message: string;
    options: readonly SelectOption[];
  }) => Promise<string | symbol>;
}

export interface SelectOption {
  /** Shown but not choosable: the CLI is missing or signed out. */
  readonly disabled?: boolean;
  readonly hint?: string;
  readonly label: string;
  readonly value: string;
}

/** The real prompts. */
const clackPrompts: PickerPrompts = {
  confirm: (options) => confirm(options),
  isCancel,
  select: (options) =>
    select({
      initialValue: options.initialValue,
      message: options.message,
      options: options.options.map((option) => ({
        disabled: option.disabled,
        hint: option.hint,
        label: option.label,
        value: option.value,
      })),
    }),
};

/**
 * Whether the user can be prompted: a terminal at both ends, and not a CI run.
 *
 * @remarks
 * `CI` is honoured as a hard no because some wrappers report a terminal with no
 * human behind it, and a launch that blocks forever on a question is worse than
 * one that picks for itself and says so.
 */
export function isInteractive(
  io: {
    env?: Record<string, string | undefined>;
    stdin?: { isTTY?: boolean };
    stdout?: { isTTY?: boolean };
  } = {}
): boolean {
  const { env = process.env, stdin = process.stdin, stdout = process.stdout } = io;
  return !env.CI && Boolean(stdin.isTTY) && Boolean(stdout.isTTY);
}

/**
 * Asks which provider to use, and whether to remember it.
 *
 * @returns the pick, or `undefined` when the user cancelled either question.
 */
export async function pickProvider(
  statuses: readonly ProviderStatus[],
  prompts: PickerPrompts = clackPrompts
): Promise<PickedProvider | undefined> {
  const options = statuses.map(toOption);
  const firstReady = statuses.find((status) => status.readiness === 'ready');

  const chosen = await prompts.select({
    initialValue: firstReady?.provider.id,
    message: 'Which AI CLI should Mukti use?',
    options,
  });
  if (prompts.isCancel(chosen)) {
    return undefined;
  }

  const picked = statuses.find((status) => status.provider.id === chosen)?.provider;
  if (!picked) {
    return undefined;
  }

  const remember = await prompts.confirm({
    initialValue: true,
    message: `Use ${picked.label} by default from now on?`,
  });
  if (prompts.isCancel(remember)) {
    return undefined;
  }

  return { provider: picked, remember: remember === true };
}

/** One row of the picker: what it is, whether it can be used, and at what cost. */
function toOption(status: ProviderStatus): SelectOption {
  const reason =
    status.readiness === 'missing'
      ? 'not installed'
      : status.readiness === 'signed-out'
        ? 'not signed in'
        : 'ready';
  return {
    disabled: status.readiness !== 'ready',
    hint: `${reason} · ${status.provider.tradeOff}`,
    label: status.provider.label,
    value: status.provider.id,
  };
}
