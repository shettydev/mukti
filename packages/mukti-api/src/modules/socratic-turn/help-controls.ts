import type { AiJsonSchemaResponseFormat } from '../ai/types/ai-response-format.interface';

import {
  SOCRATIC_EXPLANATION_FORMAT,
  SOCRATIC_QUESTION_FORMAT,
  SOCRATIC_SUMMARY_FORMAT,
} from '../ai/types/ai-response-format.interface';

/**
 * A control the learner can attach to one message (dialogue-help-controls).
 * At most one per message.
 */
export const HELP_CONTROLS = ['more_help', 'explain', 'wrap_up'] as const;
export type HelpControl = (typeof HELP_CONTROLS)[number];

/** What kind of reply this turn produces, after the budget is applied. */
export type TurnKind = 'ordinary' | HelpControl;

/** Bounds for a dialogue's optional turn budget, in exchanges. */
export const TURN_BUDGET_MIN = 1;
export const TURN_BUDGET_MAX = 50;

/**
 * Where a dialogue stands against its turn budget.
 *
 * `used` counts exchanges including the current one once it is sent.
 */
export interface TurnBudgetStatus {
  limit: number;
  used: number;
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
