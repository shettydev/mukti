import { createHash } from 'crypto';

import type { ConversationStudyArm } from '../../schemas/conversation.schema';

import { isLocalMode } from './local-mode';

export const BASELINE_PROMPTS = {
  'baseline-direct':
    'You are a helpful assistant. Answer the user clearly and directly. Explain your reasoning when useful, and ask for clarification when needed.',
  'baseline-socratic':
    'You are a Socratic tutor. Help the user think through their problem by asking thoughtful questions. Encourage them to examine assumptions, explain their reasoning, and discover answers for themselves rather than giving the answer directly.',
} as const;

export function baselineStudyArm(
  name: keyof typeof BASELINE_PROMPTS,
): ConversationStudyArm {
  return {
    name,
    promptSha256: createHash('sha256')
      .update(BASELINE_PROMPTS[name])
      .digest('hex'),
  };
}

/** Validate at boot, and when stamping new conversations. Never persisted as a launch default. */
export function configuredStudyArm(
  env: NodeJS.ProcessEnv = process.env,
): ConversationStudyArm | undefined {
  const name = env.MUKTI_STUDY_ARM;
  if (name === undefined) {
    return undefined;
  }
  if (!['1', 'true'].includes(env.MUKTI_LOCAL?.toLowerCase() ?? '')) {
    throw new Error('MUKTI_STUDY_ARM requires local mode (MUKTI_LOCAL=1)');
  }
  if (name !== 'baseline-direct' && name !== 'baseline-socratic') {
    throw new Error(
      'MUKTI_STUDY_ARM must be baseline-socratic or baseline-direct',
    );
  }
  return baselineStudyArm(name);
}

/** Fail closed if a restart would silently use a different prompt. */
export function promptForStudyArm(arm: ConversationStudyArm): string {
  if (!isLocalMode()) {
    throw new Error('MUKTI_STUDY_ARM conversations require local mode');
  }
  if (
    !Object.prototype.hasOwnProperty.call(BASELINE_PROMPTS, arm.name) ||
    baselineStudyArm(arm.name).promptSha256 !== arm.promptSha256
  ) {
    throw new Error(
      'Study arm prompt hash mismatch: the recorded baseline prompt is unavailable',
    );
  }
  return BASELINE_PROMPTS[arm.name];
}
