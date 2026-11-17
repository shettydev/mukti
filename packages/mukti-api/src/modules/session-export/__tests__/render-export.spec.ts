import { renderJson, renderMarkdown } from '../render-export';
import { validateAgainstSchema } from '../schema-validator';
import { SESSION_EXPORT_SCHEMA_VERSION } from '../session-export.types';
import { FIXTURE_EXPORT } from './fixture-export';
import { loadPublishedSchema } from './load-published-schema';

/**
 * Every key path in a JSON value, with array items collapsed to `[]`, so the
 * shape can be compared without the data.
 */
function shapeOf(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.flatMap((item) => shapeOf(item, `${path}[]`)))];
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => [
      `${path}.${key}`,
      ...shapeOf(child, `${path}.${key}`),
    ]);
  }
  return [];
}

/**
 * The v1 shape. If this test fails because the export gained, lost or
 * renamed a field, bump SESSION_EXPORT_SCHEMA_VERSION, update the published
 * schema, then update this list.
 */
const V1_SHAPE = [
  '.configuration',
  '.configuration.mode',
  '.configuration.models',
  '.configuration.muktiVersion',
  '.configuration.providers',
  '.configuration.surface',
  '.configuration.technique',
  '.exportId',
  '.exportMode',
  '.exportedAt',
  '.messages',
  '.messages[].content',
  '.messages[].reply',
  '.messages[].reply.completionTokens',
  '.messages[].reply.helpLevel',
  '.messages[].reply.latencyMs',
  '.messages[].reply.model',
  '.messages[].reply.promptTokens',
  '.messages[].reply.provider',
  '.messages[].reply.totalTokens',
  '.messages[].reply.turnKind',
  '.messages[].role',
  '.messages[].sequence',
  '.messages[].timestamp',
  '.redactions',
  '.schemaVersion',
  '.summary',
  '.summary.assistantReplies',
  '.summary.endedAt',
  '.summary.exchanges',
  '.summary.startedAt',
  '.summary.timeToFirstReplyMs',
  '.summary.tokens',
  '.summary.tokens.completion',
  '.summary.tokens.completion.repliesIncluded',
  '.summary.tokens.completion.repliesNotReported',
  '.summary.tokens.completion.total',
  '.summary.tokens.prompt',
  '.summary.tokens.prompt.repliesIncluded',
  '.summary.tokens.prompt.repliesNotReported',
  '.summary.tokens.prompt.total',
  '.summary.tokens.total',
  '.summary.tokens.total.repliesIncluded',
  '.summary.tokens.total.repliesNotReported',
  '.summary.tokens.total.total',
  '.summary.totalDurationMs',
  '.summary.turnKinds',
  '.summary.turnKinds.explain',
  '.summary.turnKinds.more_help',
  '.summary.turnKinds.ordinary',
  '.summary.turnKinds.wrap_up',
  '.summary.wrapUpReached',
];

describe('renderJson', () => {
  it('writes the model as stable, key-sorted JSON that matches the snapshot', () => {
    expect(renderJson(FIXTURE_EXPORT)).toMatchSnapshot();
  });

  it('is deterministic', () => {
    expect(renderJson(FIXTURE_EXPORT)).toBe(
      renderJson(JSON.parse(JSON.stringify(FIXTURE_EXPORT))),
    );
  });

  it('round-trips to a document the published schema accepts', () => {
    const parsed: unknown = JSON.parse(renderJson(FIXTURE_EXPORT));
    expect(validateAgainstSchema(parsed, loadPublishedSchema())).toEqual([]);
  });

  it('keeps the v1 shape, or the schema version must change', () => {
    const shape = [...new Set(shapeOf(JSON.parse(renderJson(FIXTURE_EXPORT))))];

    expect(SESSION_EXPORT_SCHEMA_VERSION).toBe(1);
    expect(shape.sort()).toEqual([...V1_SHAPE].sort());
    // Includes optional fields not present in the transcript fixture.
    expect(loadPublishedSchema()).toMatchSnapshot('published v1 schema');
  });
});

describe('renderMarkdown', () => {
  it('renders a readable transcript that matches the snapshot', () => {
    expect(renderMarkdown(FIXTURE_EXPORT)).toMatchSnapshot();
  });

  it('says not reported, never 0, for unreported tokens', () => {
    const md = renderMarkdown(FIXTURE_EXPORT);

    expect(md).toContain(
      'tokens: not reported in / not reported out / not reported total',
    );
    expect(md).toContain(
      '| Total tokens | 129 over 1 of 2 replies (1 not reported) |',
    );
  });

  it('escapes user text so it cannot add headings or break the table', () => {
    const md = renderMarkdown({
      ...FIXTURE_EXPORT,
      configuration: {
        ...FIXTURE_EXPORT.configuration,
        dialogueTitle: '# Hijack | cell',
      },
      messages: [
        {
          ...FIXTURE_EXPORT.messages[0],
          content: '## Fake heading\n[link](http://x)',
        },
      ],
    });

    expect(md).not.toMatch(/^#{1,2} (Hijack|Fake)/m);
    expect(md).toContain('\\# Hijack \\| cell');
    expect(md).toContain('> \\#\\# Fake heading');
    expect(md).toContain('> \\[link\\]\\(http://x\\)');
  });

  it('notes omitted text in a metrics-only export', () => {
    const md = renderMarkdown({
      ...FIXTURE_EXPORT,
      exportMode: 'metrics',
      messages: FIXTURE_EXPORT.messages.map(({ content: _c, ...m }) => m),
    });

    expect(md).toContain('_Message text omitted (metrics only)._');
    expect(md).toContain('metrics only (no message text)');
  });

  it('labels a study-arm export', () => {
    const md = renderMarkdown({
      ...FIXTURE_EXPORT,
      configuration: {
        ...FIXTURE_EXPORT.configuration,
        studyArm: { name: 'baseline-socratic', promptSha256: 'abc123' },
      },
    });

    expect(md).toContain('Study arm: **baseline-socratic**');
    expect(md).toContain('| Baseline prompt SHA-256 | `abc123` |');
  });
});
