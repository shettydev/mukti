import { EXPLAIN_DIRECTIVE } from '../../../dialogue-quality/services/explain-directive';
import {
  appendQualityGuardrails,
  EXPLAIN_TURN_NOTICE,
} from '../prompt-builder';

const BASE = 'You are a Socratic questioner. Never provide direct answers.';

describe('appendQualityGuardrails', () => {
  it('returns the prompt unchanged when there are no directives', () => {
    expect(appendQualityGuardrails(BASE)).toBe(BASE);
    expect(appendQualityGuardrails(BASE, { directives: [] })).toBe(BASE);
  });

  it('appends directives under QUALITY GUARDRAILS without a notice on ordinary turns', () => {
    const prompt = appendQualityGuardrails(BASE, {
      directives: [
        {
          instruction: 'Ask one question.',
          priority: 5,
          source: 'single-question',
        },
      ],
    });

    expect(prompt.startsWith(BASE)).toBe(true);
    expect(prompt).toContain('QUALITY GUARDRAILS\n---\n- Ask one question.');
    expect(prompt).not.toContain(EXPLAIN_TURN_NOTICE);
  });

  it('announces an Explain turn before the questions-only rules it overrides', () => {
    const prompt = appendQualityGuardrails(BASE, {
      directives: [EXPLAIN_DIRECTIVE],
    });

    expect(prompt.startsWith(EXPLAIN_TURN_NOTICE)).toBe(true);
    expect(prompt.indexOf(EXPLAIN_TURN_NOTICE)).toBeLessThan(
      prompt.indexOf(BASE),
    );
    expect(prompt).toContain('EXPLAIN PROTOCOL');
    expect(EXPLAIN_TURN_NOTICE).toMatch(/do not end with a question/i);
    expect(EXPLAIN_TURN_NOTICE).toMatch(
      /never write the learner's full solution/i,
    );
  });
});
