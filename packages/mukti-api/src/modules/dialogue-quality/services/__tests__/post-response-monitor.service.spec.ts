import { PostResponseMonitorService } from '../post-response-monitor.service';

describe('PostResponseMonitorService', () => {
  let service: PostResponseMonitorService;

  beforeEach(() => {
    service = new PostResponseMonitorService();
  });

  it('should count zero questions in a statement', () => {
    const result = service.monitor('This is a statement with no questions.');

    expect(result.questionCount).toBe(0);
    expect(result.violations).toHaveLength(0);
  });

  it('should count exactly one question', () => {
    const result = service.monitor('What do you think about this?');

    expect(result.questionCount).toBe(1);
    expect(result.violations).toHaveLength(0);
  });

  it('should detect multiple questions as a violation', () => {
    const result = service.monitor(
      'What do you think? How does this relate? Why is that?',
    );

    expect(result.questionCount).toBe(3);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain('multiple-questions:3');
  });

  it('should handle empty string', () => {
    const result = service.monitor('');

    expect(result.questionCount).toBe(0);
    expect(result.violations).toHaveLength(0);
  });

  describe('explain and wrap-up turns', () => {
    it('accepts a short explanation with no question', () => {
      const result = service.monitor(
        'Idempotency means repeating a call has the same effect as making it once.',
        'explain',
      );
      expect(result.violations).toEqual([]);
    });

    it('flags an explanation that ends with a question', () => {
      const result = service.monitor(
        'A closure keeps its scope. Does that make sense?',
        'explain',
      );
      expect(result.violations).toContain('explain-ends-with-question');
    });

    it('flags a long explanation as a possible solution leak', () => {
      const result = service.monitor('word '.repeat(181), 'explain');
      expect(result.violations).toContain('explain-too-long:181');
    });

    it('flags a long code block in an explanation', () => {
      const code = [
        '```ts',
        ...Array.from({ length: 9 }, (_, i) => `line${i}`),
        '```',
      ];
      const result = service.monitor(`Here:\n${code.join('\n')}`, 'explain');
      expect(result.violations).toContain('explain-code-block:9');
    });

    it('allows a short code example', () => {
      const result = service.monitor(
        'For example:\n```js\nretry(charge, { key })\n```',
        'explain',
      );
      expect(result.violations).toEqual([]);
    });

    it('does not count multiple-question rules on a wrap-up summary', () => {
      const result = service.monitor(
        '## Established\n- Why? Because X.\n## Still open\n- Y\n## Next step\n- Z',
        'wrap_up',
      );
      expect(result.violations).toEqual([]);
    });

    it('flags a wrap-up that ends with a question', () => {
      const result = service.monitor(
        '## Established\n- x\nWhat next?',
        'wrap_up',
      );
      expect(result.violations).toContain('wrap_up-ends-with-question');
    });
  });
});
