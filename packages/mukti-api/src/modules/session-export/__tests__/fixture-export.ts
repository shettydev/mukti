import type { SessionExport } from '../session-export.types';

/**
 * A complete, hand-written v1 export: two exchanges in chat, one reply from a
 * provider that reported no tokens, one wrap-up. Used to prove the published
 * schema accepts what the types describe.
 */
export const FIXTURE_EXPORT: SessionExport = {
  configuration: {
    mode: 'local',
    models: ['sonnet'],
    muktiVersion: '0.1.1',
    providers: ['claude-code'],
    surface: 'chat',
    technique: 'elenchus',
  },
  exportedAt: '2026-11-16T10:00:00.000Z',
  exportId: '7c1f0d2e-3b7a-4f61-9a55-1f0c2d3e4b5a',
  exportMode: 'full',
  messages: [
    {
      content: 'My retry handler charges twice.',
      role: 'user',
      sequence: 1,
      timestamp: '2026-11-16T09:00:00.000Z',
    },
    {
      content: 'What happens on the second call?',
      reply: {
        completionTokens: 9,
        helpLevel: 0,
        latencyMs: 1800,
        model: 'sonnet',
        promptTokens: 120,
        provider: 'claude-code',
        totalTokens: 129,
        turnKind: 'ordinary',
      },
      role: 'assistant',
      sequence: 2,
      timestamp: '2026-11-16T09:00:02.000Z',
    },
    {
      content: 'Wrap up please.',
      role: 'user',
      sequence: 3,
      timestamp: '2026-11-16T09:01:00.000Z',
    },
    {
      content: 'You found that the handler is not idempotent.',
      reply: {
        completionTokens: 'not_reported',
        helpLevel: 0,
        latencyMs: 2100,
        model: 'sonnet',
        promptTokens: 'not_reported',
        provider: 'claude-code',
        totalTokens: 'not_reported',
        turnKind: 'wrap_up',
      },
      role: 'assistant',
      sequence: 4,
      timestamp: '2026-11-16T09:01:03.000Z',
    },
  ],
  redactions: 0,
  schemaVersion: 1,
  summary: {
    assistantReplies: 2,
    endedAt: '2026-11-16T09:01:03.000Z',
    exchanges: 2,
    startedAt: '2026-11-16T09:00:00.000Z',
    timeToFirstReplyMs: 2000,
    tokens: {
      completion: { repliesIncluded: 1, repliesNotReported: 1, total: 9 },
      prompt: { repliesIncluded: 1, repliesNotReported: 1, total: 120 },
      total: { repliesIncluded: 1, repliesNotReported: 1, total: 129 },
    },
    totalDurationMs: 63000,
    turnKinds: { explain: 0, more_help: 0, ordinary: 1, wrap_up: 1 },
    wrapUpReached: true,
  },
};
