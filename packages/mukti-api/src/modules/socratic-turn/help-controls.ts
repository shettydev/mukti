import type {
  HelpControl,
  TurnBudgetStatus,
  TurnKind,
} from '@muktiai/contracts';

import type { AiJsonSchemaResponseFormat } from '../ai/types/ai-response-format.interface';

import {
  SOCRATIC_EXPLANATION_FORMAT,
  SOCRATIC_QUESTION_FORMAT,
  SOCRATIC_SUMMARY_FORMAT,
} from '../ai/types/ai-response-format.interface';

/**
 * The help-control vocabulary is part of the web/API wire contract, so the
 * types live in `@muktiai/contracts`; re-exported here for API code.
 */
export type { HelpControl, TurnBudgetStatus, TurnKind };

/**
 * Every control the learner can attach to one message (dialogue-help-controls).
 * At most one per message. Send-message DTOs validate against this list.
 */
export const HELP_CONTROLS = [
  'more_help',
  'explain',
  'wrap_up',
] as const satisfies readonly HelpControl[];

/** Bounds for a dialogue's optional turn budget, in exchanges. */
export const TURN_BUDGET_MIN = 1;
export const TURN_BUDGET_MAX = 50;

/** Budget status after this exchange, or null when no budget is set. */
export function budgetStatus(
  turnBudget: null | number | undefined,
  exchangesBefore: number,
): null | TurnBudgetStatus {
  if (!turnBudget) {
    return null;
  }
  return { limit: turnBudget, used: exchangesBefore + 1 };
}

/**
 * Exchanges (user messages answered) in a dialogue, from its message count.
 *
 * @remarks
 * Chat stores each exchange as a user/assistant pair. A node dialogue may also
 * start with one assistant opening question, which `floor` leaves out. So no
 * separate counter is needed (design D6).
 */
export function exchangesFromMessageCount(
  messageCount: null | number | undefined,
): number {
  if (!messageCount || messageCount < 0) {
    return 0;
  }
  return Math.floor(messageCount / 2);
}

/**
 * Normalises a stored or requested turn budget: an integer from
 * {@link TURN_BUDGET_MIN} to {@link TURN_BUDGET_MAX}, or null for none.
 * Anything else (a corrupt preference, an old document) means no budget.
 */
export function normaliseTurnBudget(value: unknown): null | number {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= TURN_BUDGET_MIN &&
    value <= TURN_BUDGET_MAX
    ? value
    : null;
}

/**
 * Decides the turn kind: a budget reached by this exchange wins over any
 * control (so the learner always gets the summary they asked to be capped
 * with); otherwise the learner's control, or an ordinary turn.
 *
 * @param exchangesBefore - exchanges completed before this message
 */
export function resolveTurnKind(input: {
  exchangesBefore: number;
  helpControl?: HelpControl;
  turnBudget?: null | number;
}): TurnKind {
  const { exchangesBefore, helpControl, turnBudget } = input;
  if (turnBudget && exchangesBefore + 1 === turnBudget) {
    return 'wrap_up';
  }
  return helpControl ?? 'ordinary';
}

/**
 * The learner-facing response shape for a turn kind. Decided only by the
 * learner's choices, never by the help level (ai-response-format).
 */
export function responseFormatForTurn(
  kind: TurnKind,
): AiJsonSchemaResponseFormat {
  switch (kind) {
    case 'explain':
      return SOCRATIC_EXPLANATION_FORMAT;
    case 'wrap_up':
      return SOCRATIC_SUMMARY_FORMAT;
    default:
      return SOCRATIC_QUESTION_FORMAT;
  }
}
