import fc from 'fast-check';

import { renderJson, renderMarkdown } from '../render-export';
import { REDACTED, sanitizeExport } from '../sanitize-export';
import { FIXTURE_EXPORT } from './fixture-export';

/**
 * Sanitization (session-export: "Export can be sanitized").
 */
describe('sanitizeExport', () => {
  it('metrics only drops every message text, the title and node label, and keeps the metadata and summary', () => {
    const model = sanitizeExport(
      {
        ...FIXTURE_EXPORT,
        configuration: {
          ...FIXTURE_EXPORT.configuration,
          dialogueTitle: 'Payments outage',
          nodeLabel: 'Seed',
        },
      },
      { mode: 'metrics', redact: [] },
    );

    expect(model.exportMode).toBe('metrics');
    expect(model.messages.every((m) => !('content' in m))).toBe(true);
    expect(model.configuration).not.toHaveProperty('dialogueTitle');
    expect(model.configuration).not.toHaveProperty('nodeLabel');
    expect(model.messages[1].reply).toEqual(FIXTURE_EXPORT.messages[1].reply);
    expect(model.summary).toEqual(FIXTURE_EXPORT.summary);
    for (const message of FIXTURE_EXPORT.messages) {
      expect(renderJson(model)).not.toContain(message.content!);
      expect(renderMarkdown(model)).not.toContain(message.content!);
    }
  });

  it('replaces each listed string, case-insensitively, with [redacted]', () => {
    const model = sanitizeExport(
      {
        ...FIXTURE_EXPORT,
        configuration: {
          ...FIXTURE_EXPORT.configuration,
          dialogueTitle: 'ACME-payments retries',
        },
        messages: [
          {
            ...FIXTURE_EXPORT.messages[0],
            content: 'Priya says acme-payments charges twice; priya agrees.',
          },
        ],
      },
      { mode: 'full', redact: ['acme-payments', 'Priya'] },
    );

    expect(model.messages[0].content).toBe(
      `${REDACTED} says ${REDACTED} charges twice; ${REDACTED} agrees.`,
    );
    expect(model.configuration.dialogueTitle).toBe(`${REDACTED} retries`);
    expect(model.redactions).toBe(2);
    expect(renderJson(model)).not.toMatch(/acme-payments|priya/i);
    expect(renderMarkdown(model)).not.toMatch(/acme-payments|priya/i);
  });

  it('preserves whitespace in literal terms instead of expanding their match', () => {
    const model = structuredClone(FIXTURE_EXPORT);
    model.messages[0].content = 'prefix secret suffix and secret-alone';
    const sanitized = sanitizeExport(model, {
      mode: 'full',
      redact: [' secret '],
    });
    expect(sanitized.messages[0].content).toBe(
      'prefix[redacted]suffix and secret-alone',
    );
    expect(() =>
      sanitizeExport(model, { mode: 'full', redact: ['x'.repeat(200) + ' '] }),
    ).toThrow();
  });

  it('never writes the redaction terms themselves into the export', () => {
    const model = sanitizeExport(FIXTURE_EXPORT, {
      mode: 'full',
      redact: ['zebra-unicorn'],
    });
    expect(renderJson(model)).not.toContain('zebra-unicorn');
  });

  it('redacts a term that is part of another listed term without leaving a fragment', () => {
    const model = sanitizeExport(
      {
        ...FIXTURE_EXPORT,
        messages: [
          { ...FIXTURE_EXPORT.messages[0], content: 'acme acme-payments' },
        ],
      },
      { mode: 'full', redact: ['acme', 'acme-payments'] },
    );
    expect(model.messages[0].content).toBe(`${REDACTED} ${REDACTED}`);
  });

  it('accepts literal punctuation and terms that also occur in the marker', () => {
    const model = sanitizeExport(
      {
        ...FIXTURE_EXPORT,
        messages: [{ ...FIXTURE_EXPORT.messages[0], content: 'a]b dact' }],
      },
      { mode: 'full', redact: ['dact', 'a]b'] },
    );
    expect(model.messages[0].content).toBe(`${REDACTED} ${REDACTED}`);
  });

  it('removes email, recognizable credentials, ObjectIds and the authenticated user name from text and labels', () => {
    const secrets = [
      'priya@example.org',
      'sk-or-v1-abcdefghijklmnopqrstuv',
      '507f1f77bcf86cd799439011',
      'Priya Shah',
      'opaque-value',
    ];
    const text = `${secrets.slice(0, 4).join(' ')} api_key=opaque-value`;
    const model = sanitizeExport(
      {
        ...FIXTURE_EXPORT,
        configuration: {
          ...FIXTURE_EXPORT.configuration,
          dialogueTitle: text,
          nodeLabel: text,
        },
        messages: [{ ...FIXTURE_EXPORT.messages[0], content: text }],
      },
      { mode: 'full', privateValues: ['Priya', 'Shah'], redact: [] },
    );
    for (const secret of secrets) {
      expect(renderJson(model)).not.toContain(secret);
      expect(renderMarkdown(model)).not.toContain(secret);
    }
  });

  // A generated private token cannot collide with fixed schema vocabulary or
  // the replacement marker. Punctuation still exercises literal escaping.
  const term = fc
    .string({ maxLength: 12, minLength: 1 })
    .map((s) => `private-${s}-secret`);

  /** Case-insensitive occurrences of `term` in `text`. */
  const occurrences = (text: string, term: string) =>
    text.toLowerCase().split(term.toLowerCase()).length - 1;

  /** Markdown backslash-escapes punctuation; compare the unescaped text. */
  const unescapeMd = (md: string) => md.replace(/\\(.)/gu, '$1');

  it('property: no redaction term survives in either rendering', () => {
    fc.assert(
      fc.property(
        fc.array(term, { maxLength: 4, minLength: 1 }),
        fc.array(fc.string({ maxLength: 40 }), { maxLength: 6, minLength: 1 }),
        fc.boolean(),
        (terms, fillers, upper) => {
          // Content made of filler text with each term spliced in, in either case
          const content = fillers
            .map(
              (f, i) =>
                `${f}${upper ? terms[i % terms.length].toUpperCase() : terms[i % terms.length]}`,
            )
            .join(' ');
          const withText = (text: string) => ({
            ...FIXTURE_EXPORT,
            configuration: {
              ...FIXTURE_EXPORT.configuration,
              dialogueTitle: text,
              nodeLabel: text,
            },
            messages: FIXTURE_EXPORT.messages.map((m) => ({
              ...m,
              content: text,
            })),
          });
          const model = sanitizeExport(withText(content), {
            mode: 'full',
            redact: terms,
          });
          for (const t of terms) {
            const jsonTerm = JSON.stringify(t).slice(1, -1);
            if (
              occurrences(renderJson(model), jsonTerm) > 0 ||
              occurrences(unescapeMd(renderMarkdown(model)), t) > 0
            ) {
              return false;
            }
          }
          return true;
        },
      ),
      { numRuns: 300 },
    );
  });
});
