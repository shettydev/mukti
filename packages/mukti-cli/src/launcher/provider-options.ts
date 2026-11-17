/**
 * The shared launch flags, parsed once for both launch modes.
 *
 * @remarks
 * `npx muktiai` and `start:local` take different options otherwise, so this
 * pulls out the flags they share and hands back the rest for each mode's
 * own parser. Contradictions are refused rather than resolved by precedence:
 * naming a provider *and* asking to be shown the choice means the user has two
 * different things in mind, and guessing which is worse than saying so.
 */
export interface ProviderOptions {
  /** Show the picker, ignoring `AI_PROVIDER` and the saved default. */
  readonly choose: boolean;
  readonly provider?: string;
  /** Save the named provider as the default, once preflight passes. */
  readonly save: boolean;
  /** Explicit for this launch only, never a saved provider default. */
  readonly studyArm?: StudyArm;
}

export const STUDY_ARMS = ['baseline-socratic', 'baseline-direct'] as const;
export type ProviderOptionsResult =
  | { readonly kind: 'error'; readonly message: string }
  | {
      readonly kind: 'ok';
      readonly options: ProviderOptions;
      /** Arguments belonging to the calling launcher. */
      readonly rest: readonly string[];
    };

export type StudyArm = (typeof STUDY_ARMS)[number];

export function parseProviderOptions(argv: readonly string[]): ProviderOptionsResult {
  let choose = false;
  let provider: string | undefined;
  let save = false;
  let studyArm: StudyArm | undefined;
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    switch (argv[i]) {
      case '--choose':
        choose = true;
        break;
      case '--provider': {
        const value = argv[i + 1];
        if (value === undefined || value.startsWith('-')) {
          return { kind: 'error', message: '--provider needs a value, such as --provider agy.' };
        }
        provider = value;
        i += 1;
        break;
      }
      case '--save':
        save = true;
        break;
      case '--study-arm': {
        const value = argv[i + 1];
        if (!STUDY_ARMS.includes(value as StudyArm)) {
          return {
            kind: 'error',
            message: `--study-arm needs one of: ${STUDY_ARMS.join(', ')}.`,
          };
        }
        studyArm = value as StudyArm;
        i += 1;
        break;
      }
      default:
        rest.push(argv[i]);
    }
  }

  if (save && provider === undefined) {
    return {
      kind: 'error',
      message: '--save sets the default to a named provider, so it needs --provider <id> as well.',
    };
  }
  if (choose && provider !== undefined) {
    return {
      kind: 'error',
      message:
        '--choose asks which provider to use, so it cannot be combined with --provider <id>. Use one or the other.',
    };
  }

  return {
    kind: 'ok',
    options: { choose, provider, save, ...(studyArm ? { studyArm } : {}) },
    rest,
  };
}
