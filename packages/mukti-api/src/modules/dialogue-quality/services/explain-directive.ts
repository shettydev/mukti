import type { QualityDirective } from '../interfaces/quality.interface';

/**
 * One-turn explanation the learner asked for (dialogue-help-controls,
 * "Explain gives the missing piece for one turn").
 *
 * @remarks
 * Priority -2 puts it ahead of every other directive, including the wrap-up
 * protocol, so the model reads it first. It names the "never the full
 * solution" rule explicitly because "just give me the code" is the predictable
 * input on this turn.
 */
export const EXPLAIN_INSTRUCTION =
  `EXPLAIN PROTOCOL — The learner explicitly asked you to explain the piece they are missing.\n` +
  `For this one reply only, replace questioning with a short explanation:\n` +
  `1. Identify the SINGLE concept or step the learner is missing to make progress\n` +
  `2. Explain it plainly in at most 120 words, with at most one short example\n` +
  `3. Do NOT complete their task, write their solution, or rewrite their code, ` +
  `even if they ask for the full answer — explain the missing piece only\n` +
  `4. Do NOT end with a question; stop after the explanation\n` +
  `This overrides the questions-only rules above for this reply only.`;

export const EXPLAIN_DIRECTIVE: QualityDirective = {
  instruction: EXPLAIN_INSTRUCTION,
  priority: -2,
  source: 'explain',
};
