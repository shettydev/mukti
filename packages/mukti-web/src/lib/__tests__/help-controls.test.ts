import type { TurnKind } from '@muktiai/contracts';

import {
  applyCompletedTurn,
  exchangesFromMessageCount,
  HELP_LEVELS,
  replyTagFor,
  tagNewestDialogueReply,
  tagNewestReply,
  toHelpLevel,
  toTurnBudget,
  turnBudgetView,
} from '../help-controls';

describe('help-controls helpers', () => {
  describe('exchangesFromMessageCount (mirrors the API)', () => {
    it.each([
      [0, 0],
      [1, 0], // a node dialogue's opening question only
      [2, 1],
      [3, 1], // opening question + 1 exchange
      [9, 4],
      [10, 5],
      [undefined, 0],
      [null, 0],
      [-4, 0],
    ])('counts %p messages as %p exchanges', (messages, exchanges) => {
      expect(exchangesFromMessageCount(messages)).toBe(exchanges);
    });
  });

  describe('turnBudgetView', () => {
    it('is null without a budget', () => {
      expect(turnBudgetView(null, 3)).toBeNull();
      expect(turnBudgetView(undefined, 3)).toBeNull();
      expect(turnBudgetView(0, 3)).toBeNull();
    });

    it.each([
      [5, 2, 'open', 3],
      [5, 5, 'used', 0],
      [5, 6, 'exceeded', -1],
    ])('a budget of %i after %i exchanges is %s', (limit, used, state, remaining) => {
      expect(turnBudgetView(limit, used)).toEqual({ limit, remaining, state, used });
    });
  });

  it('names every level as the spec does', () => {
    expect([0, 1, 2, 3, 4].map((level) => HELP_LEVELS[level as 0].name)).toEqual([
      'Questions only',
      'Thinking prompts',
      'Hints',
      'Examples',
      'Brief explanations',
    ]);
  });

  it.each([
    [2, 2],
    [undefined, 0],
    [7, 4],
    [-1, 0],
    [Number.NaN, 0],
  ])('reads a help level of %p as %p', (value, level) => {
    expect(toHelpLevel(value)).toBe(level);
  });

  it.each([
    [10, 10],
    [0, null],
    [51, null],
    [2.5, null],
    [null, null],
  ])('reads a turn budget of %p as %p', (value, budget) => {
    expect(toTurnBudget(value)).toBe(budget);
  });

  it.each([
    ['explain', 'Explanation'],
    ['wrap_up', 'Summary'],
    ['more_help', null],
    ['ordinary', null],
    [undefined, null],
  ] as const)('tags a %s reply as %p', (turnKind, tag) => {
    expect(replyTagFor(turnKind)).toBe(tag);
  });

  describe('applyCompletedTurn', () => {
    it('applies the settled help level', () => {
      expect(
        applyCompletedTurn({ currentScaffoldLevel: 1, turnBudget: null }, { scaffoldLevel: 2 })
      ).toEqual({ currentScaffoldLevel: 2, turnBudget: null });
    });

    it('keeps the level when the event has none (not a learner turn)', () => {
      expect(applyCompletedTurn({ currentScaffoldLevel: 3 }, {}).currentScaffoldLevel).toBe(3);
    });

    it('fills an unknown budget from the event', () => {
      const unknown: { turnBudget?: null | number } = {};
      expect(applyCompletedTurn(unknown, { budget: { limit: 5, used: 2 } }).turnBudget).toBe(5);
      expect(applyCompletedTurn(unknown, { budget: null }).turnBudget).toBeNull();
    });

    it('never overwrites a known budget, which may be newer than the turn', () => {
      // The learner cleared the budget while this reply was being written
      expect(
        applyCompletedTurn({ turnBudget: null }, { budget: { limit: 5, used: 2 } }).turnBudget
      ).toBeNull();
      expect(applyCompletedTurn({ turnBudget: 8 }, { budget: null }).turnBudget).toBe(8);
    });
  });

  describe('tagNewestReply', () => {
    const messages = [
      { role: 'user', sequence: 1 },
      { role: 'assistant', sequence: 2 },
      { role: 'user', sequence: 3 },
      { role: 'assistant', sequence: 4 },
    ] as { role: string; sequence: number; turnKind?: 'explain' }[];
    const get = (m: (typeof messages)[number]) => m.turnKind;
    const set = (m: (typeof messages)[number], turnKind: 'explain') => ({ ...m, turnKind });

    it('tags only the newest assistant reply', () => {
      const tagged = tagNewestReply(messages, 'explain', get, set as never);
      expect(tagged.map((m) => m.turnKind)).toEqual([undefined, undefined, undefined, 'explain']);
    });

    it('leaves a reply that is already tagged alone', () => {
      const already = [...messages.slice(0, 3), { ...messages[3], turnKind: 'explain' as const }];
      expect(tagNewestReply(already, 'explain', get, set as never)).toBe(already);
    });

    it('does nothing without a turn kind', () => {
      expect(tagNewestReply(messages, undefined, get, set as never)).toBe(messages);
    });
  });

  it('tags the newest dialogue reply across pages, in its metadata', () => {
    type PageMessage = {
      metadata?: { tokens?: number; turnKind?: TurnKind };
      role: string;
      sequence: number;
    };
    const pages: { messages: PageMessage[] }[] = [
      {
        messages: [
          { metadata: { tokens: 3 }, role: 'assistant', sequence: 0 },
          { role: 'user', sequence: 1 },
          { role: 'assistant', sequence: 2 },
        ],
      },
      { messages: [{ role: 'user', sequence: 3 }] },
    ];

    const tagged = tagNewestDialogueReply(pages, 'wrap_up');

    expect(tagged[0].messages[2]).toEqual({
      metadata: { turnKind: 'wrap_up' },
      role: 'assistant',
      sequence: 2,
    });
    expect(tagged[0].messages[0]).toBe(pages[0].messages[0]);
    expect(tagged[1]).toBe(pages[1]);
  });
});
