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
});
