/**
 * Learner help controls (dialogue-help-controls), shared by chat, canvas node
 * dialogue and thought-map node dialogue: the help-level names, the turn-budget
 * arithmetic, and how a reply's turn kind is labelled.
 *
 * The wire types live in `@muktiai/contracts`; this file holds the runtime
 * values the web needs, which the type-only contract cannot carry.
 */
import type {
  HelpControl,
  HelpLevel,
  StreamEventPayloads,
  TurnBudgetStatus,
  TurnKind,
} from '@muktiai/contracts';

export type { HelpControl, HelpLevel, TurnBudgetStatus, TurnKind };

/** The help state a `complete` stream event carries after a learner turn. */
export type CompletedTurnHelpState = Pick<
  StreamEventPayloads['complete'],
  'budget' | 'conclusionReady' | 'scaffoldLevel' | 'turnKind'
>;

/** A control that attaches to the learner's next message. Wrap up sends at once. */
export type PendingHelpControl = Exclude<HelpControl, 'wrap_up'>;

/**
 * The message a Wrap up sends, so the transcript shows what the learner asked
 * for. Chat keeps the wording it had before help controls.
 */
export const WRAP_UP_MESSAGES = {
  chat: "Let's wrap up this conversation.",
  node: "Let's wrap up this dialogue.",
} as const;

/** The highest help level; More help cannot raise it further. */
export const MAX_HELP_LEVEL: HelpLevel = 4;

/** Bounds of a turn budget, in exchanges (the API enforces the same). */
export const TURN_BUDGET_MIN = 1;
export const TURN_BUDGET_MAX = 50;

/**
 * Each help level's short name (from the spec) and what it means for the
 * learner (from the API's scaffold-level descriptions).
 */
export const HELP_LEVELS: Record<HelpLevel, { description: string; name: string }> = {
  0: {
    description: 'Questions only, trusting you to discover the answer through reflection.',
    name: 'Questions only',
  },
  1: {
    description: 'Questions with thinking prompts, helping you become aware of your reasoning.',
    name: 'Thinking prompts',
  },
  2: {
    description: 'Guided decomposition, helping you break the problem into smaller pieces.',
    name: 'Hints',
  },
  3: {
    description: 'Analogies and examples, showing similar patterns to learn from.',
    name: 'Examples',
  },
  4: {
    description: 'Brief explanations, giving minimal context before returning to inquiry.',
    name: 'Brief explanations',
  },
};

/** Where a dialogue stands against its turn budget, for display. */
export interface TurnBudgetView {
  limit: number;
  /** Exchanges left before the limit; negative once it is exceeded. */
  remaining: number;
  /** `open` while under the limit, `used` at it, `exceeded` past it. */
  state: 'exceeded' | 'open' | 'used';
  used: number;
}

/**
 * A dialogue (conversation or node dialogue) after a turn completed: the
 * settled help level always, and the budget only when the cache does not know
 * it yet.
 *
 * @remarks
 * The job read the budget when the turn started, so a budget the learner set
 * or cleared while the reply was being written is newer than the event's.
 * Exchanges used are derived from the message count, which the message events
 * already advance.
 */
export function applyCompletedTurn<
  T extends { currentScaffoldLevel?: number; turnBudget?: null | number },
>(dialogue: T, data: CompletedTurnHelpState): T {
  return {
    ...dialogue,
    currentScaffoldLevel:
      data.scaffoldLevel === undefined ? dialogue.currentScaffoldLevel : data.scaffoldLevel,
    turnBudget:
      dialogue.turnBudget === undefined && data.budget !== undefined
        ? (data.budget?.limit ?? null)
        : dialogue.turnBudget,
  };
}

/**
 * Exchanges (user messages answered) from a dialogue's message count. Mirrors
 * the API: chat stores pairs, and a node dialogue's opening question is not an
 * exchange.
 */
export function exchangesFromMessageCount(messageCount: null | number | undefined): number {
  if (!messageCount || messageCount < 0) {
    return 0;
  }
  return Math.floor(messageCount / 2);
}

/**
 * The tag a reply carries in the message list so a learner scrolling back can
 * tell an explanation or a summary from a Socratic question. Null for
 * question-shaped replies.
 */
export function replyTagFor(
  turnKind: null | TurnKind | undefined
): 'Explanation' | 'Summary' | null {
  switch (turnKind) {
    case 'explain':
      return 'Explanation';
    case 'wrap_up':
      return 'Summary';
    default:
      return null;
  }
}

/** The turn kind of a reply, or `ordinary` for one stored before help controls. */
export function replyTurnKind(turnKind: null | TurnKind | undefined): TurnKind {
  return turnKind ?? 'ordinary';
}

/**
 * Node-dialogue message pages with the newest assistant reply (across all
 * pages) tagged with `turnKind` in its metadata, unless it already has one.
 */
export function tagNewestDialogueReply<
  M extends { metadata?: { turnKind?: TurnKind }; role: string; sequence: number },
  P extends { messages: M[] },
>(pages: P[], turnKind: TurnKind | undefined): P[] {
  if (!turnKind) {
    return pages;
  }
  let newest: M | undefined;
  for (const page of pages) {
    for (const message of page.messages) {
      if (message.role === 'assistant' && (!newest || message.sequence > newest.sequence)) {
        newest = message;
      }
    }
  }
  if (!newest || newest.metadata?.turnKind) {
    return pages;
  }
  const target = newest;
  return pages.map((page) =>
    page.messages.includes(target)
      ? {
          ...page,
          messages: page.messages.map((message) =>
            message === target
              ? { ...message, metadata: { ...message.metadata, turnKind } }
              : message
          ),
        }
      : page
  );
}

/**
 * Messages with the newest assistant reply tagged with `turnKind`, unless it
 * already carries one (the message event normally tags it first).
 *
 * @param getKind - reads a message's turn kind
 * @param setKind - returns a copy of a message with the turn kind set
 */
export function tagNewestReply<M extends { role: string; sequence: number }>(
  messages: M[],
  turnKind: TurnKind | undefined,
  getKind: (message: M) => TurnKind | undefined,
  setKind: (message: M, turnKind: TurnKind) => M
): M[] {
  if (!turnKind) {
    return messages;
  }
  let newest = -1;
  messages.forEach((message, index) => {
    if (
      message.role === 'assistant' &&
      (newest === -1 || message.sequence > messages[newest].sequence)
    ) {
      newest = index;
    }
  });
  if (newest === -1 || getKind(messages[newest])) {
    return messages;
  }
  return messages.map((message, index) =>
    index === newest ? setKind(message, turnKind) : message
  );
}

/** Any value as a valid help level (0 for missing or out-of-range data). */
export function toHelpLevel(value: unknown): HelpLevel {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(MAX_HELP_LEVEL, Math.max(0, Math.round(value))) as HelpLevel;
}

/** A turn budget as an integer from 1 to 50, or null when unset or invalid. */
export function toTurnBudget(value: unknown): null | number {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= TURN_BUDGET_MIN &&
    value <= TURN_BUDGET_MAX
    ? value
    : null;
}

/**
 * The budget view for a dialogue, from its budget and exchanges so far, or
 * null when it has no budget.
 */
export function turnBudgetView(
  turnBudget: null | number | undefined,
  exchanges: number
): null | TurnBudgetView {
  const limit = toTurnBudget(turnBudget);
  if (limit === null) {
    return null;
  }
  const remaining = limit - exchanges;
  return {
    limit,
    remaining,
    state: remaining > 0 ? 'open' : remaining === 0 ? 'used' : 'exceeded',
    used: exchanges,
  };
}
