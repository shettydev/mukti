import {
  assembleExport,
  type SourceDialogue,
  type SourceMessage,
} from '../assemble-export';

const at = (seconds: number) => new Date(Date.UTC(2026, 10, 16, 9, 0, seconds));

const stamp = {
  exportedAt: new Date('2026-11-16T10:00:00.000Z'),
  exportId: 'export-1',
};

const dialogue = (
  messages: SourceMessage[],
  extra: Partial<SourceDialogue> = {},
): SourceDialogue => ({
  messages,
  mode: 'local',
  muktiVersion: '0.1.1',
  surface: 'chat',
  technique: 'elenchus',
  ...extra,
});

const user = (content: string, seconds: number): SourceMessage => ({
  content,
  role: 'user',
  timestamp: at(seconds),
});

const reply = (
  content: string,
  seconds: number,
  meta: SourceMessage['meta'] = {},
): SourceMessage => ({
  content,
  meta: {
    completionTokens: 10,
    latencyMs: 1000,
    model: 'sonnet',
    promptTokens: 100,
    provider: 'claude-code',
    scaffoldLevel: 1,
    totalTokens: 110,
    turnKind: 'ordinary',
    ...meta,
  },
  role: 'assistant',
  timestamp: at(seconds),
});

describe('assembleExport', () => {
  it('summarizes a short session: 4 exchanges, one Explain and one wrap-up', () => {
    const model = assembleExport(
      dialogue([
        user('q1', 0),
        reply('a1', 2),
        user('q2', 10),
        reply('a2', 12, { turnKind: 'explain' }),
        user('q3', 20),
        reply('a3', 22),
        user('q4', 30),
        reply('a4', 33, { turnKind: 'wrap_up' }),
      ]),
      stamp,
    );

    expect(model.summary).toMatchObject({
      assistantReplies: 4,
      endedAt: at(33).toISOString(),
      exchanges: 4,
      startedAt: at(0).toISOString(),
      timeToFirstReplyMs: 2000,
      totalDurationMs: 33000,
      turnKinds: { explain: 1, more_help: 0, ordinary: 2, wrap_up: 1 },
      wrapUpReached: true,
    });
    expect(model.summary.tokens.total).toEqual({
      repliesIncluded: 4,
      repliesNotReported: 0,
      total: 440,
    });
  });

  it('marks unreported tokens not reported, never zero, and totals only the replies that reported', () => {
    const model = assembleExport(
      dialogue([
        user('q1', 0),
        reply('a1', 2),
        user('q2', 10),
        reply('a2', 12, {
          completionTokens: undefined,
          promptTokens: undefined,
          totalTokens: undefined,
        }),
      ]),
      stamp,
    );

    expect(model.messages[3].reply).toMatchObject({
      completionTokens: 'not_reported',
      promptTokens: 'not_reported',
      totalTokens: 'not_reported',
    });
    expect(model.summary.tokens.total).toEqual({
      repliesIncluded: 1,
      repliesNotReported: 1,
      total: 110,
    });
  });

  it('exports a reply written before per-reply metadata with every gap not reported', () => {
    const legacy: SourceMessage = {
      content: 'an old reply',
      meta: { latencyMs: 800, model: 'openai/gpt-5-mini', totalTokens: 50 },
      role: 'assistant',
      timestamp: at(2),
    };
    const model = assembleExport(dialogue([user('q', 0), legacy]), stamp);

    expect(model.messages[1].reply).toEqual({
      completionTokens: 'not_reported',
      helpLevel: 'not_reported',
      latencyMs: 800,
      model: 'openai/gpt-5-mini',
      promptTokens: 'not_reported',
      provider: 'not_reported',
      totalTokens: 50,
      // Replies stored before help controls were ordinary
      turnKind: 'ordinary',
    });
  });

  it('exports a reply with no metadata at all', () => {
    const bare: SourceMessage = {
      content: 'bare',
      role: 'assistant',
      timestamp: at(1),
    };
    const reply = assembleExport(dialogue([user('q', 0), bare]), stamp)
      .messages[1].reply!;

    expect(
      Object.values(reply).filter((v) => v === 'not_reported'),
    ).toHaveLength(7);
    expect(reply.turnKind).toBe('ordinary');
  });

  it('keeps the level a reply was written at, whatever the dialogue is at now', () => {
    const model = assembleExport(
      dialogue([user('q', 0), reply('hint', 2, { scaffoldLevel: 2 })]),
      stamp,
    );

    expect(model.messages[1].reply!.helpLevel).toBe(2);
  });

  it('merges archived and recent chat messages into one timeline with sequence numbers, not ids', () => {
    const recent = [user('q2', 10), reply('a2', 12)];
    const archived = [user('q1', 0), reply('a1', 2)];
    const model = assembleExport(dialogue([...recent, ...archived]), stamp);

    expect(model.messages.map((m) => [m.sequence, m.content])).toEqual([
      [1, 'q1'],
      [2, 'a1'],
      [3, 'q2'],
      [4, 'a2'],
    ]);
    expect(JSON.stringify(model)).not.toMatch(/"_?id"/);
  });

  it('keeps stored order for a user message and reply that share a timestamp', () => {
    const model = assembleExport(
      dialogue([user('q', 5), reply('a', 5)]),
      stamp,
    );
    expect(model.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
  });

  it('drops system messages and lists distinct providers and models in first-use order', () => {
    const model = assembleExport(
      dialogue([
        { content: 'system prompt', role: 'system', timestamp: at(0) },
        user('q', 1),
        reply('a', 2, { model: 'sonnet', provider: 'claude-code' }),
        user('q', 3),
        reply('a', 4, { model: 'gpt-5', provider: 'codex' }),
        user('q', 5),
        reply('a', 6, { model: 'sonnet', provider: 'claude-code' }),
      ]),
      stamp,
    );

    expect(model.messages).toHaveLength(6);
    expect(model.configuration.providers).toEqual(['claude-code', 'codex']);
    expect(model.configuration.models).toEqual(['sonnet', 'gpt-5']);
  });

  it('reports no exchanges and no reply time for a dialogue that only has an opening question', () => {
    const model = assembleExport(
      dialogue([reply('opening?', 0, { turnKind: undefined })], {
        surface: 'thought_map_node',
      }),
      stamp,
    );

    expect(model.summary.exchanges).toBe(0);
    expect(model.summary.timeToFirstReplyMs).toBeNull();
  });

  it('handles an empty dialogue', () => {
    const model = assembleExport(dialogue([]), stamp);

    expect(model.summary).toMatchObject({
      endedAt: null,
      exchanges: 0,
      startedAt: null,
      totalDurationMs: null,
      wrapUpReached: false,
    });
  });
});
