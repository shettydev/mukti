import { ScaffoldLevel } from '../../interfaces/scaffolding.interface';
import { ScaffoldPromptAugmenter } from '../scaffold-prompt-augmenter.service';

describe('ScaffoldPromptAugmenter', () => {
  let service: ScaffoldPromptAugmenter;

  beforeEach(() => {
    service = new ScaffoldPromptAugmenter();
  });

  it('augments prompts with override notice and contextual additions for high scaffold levels', () => {
    const result = service.augment('Base system prompt', {
      conceptContext: ['recursion', 'base_case'],
      consecutiveFailures: 3,
      consecutiveSuccesses: 2,
      level: ScaffoldLevel.WORKED_EXAMPLES,
      rootGap: 'functions',
    });

    expect(result).toContain('Base system prompt');
    expect(result).toContain('=== IMPORTANT: OVERRIDE NOTICE ===');
    expect(result).toContain('SCAFFOLDING LEVEL: 3 (WORKED_EXAMPLES)');
    expect(result).toContain('KNOWLEDGE GAP DETECTED');
    expect(result).toContain('LEARNER STRUGGLE DETECTED: 3');
    expect(result).toContain('PROGRESS OBSERVED: 2');
    expect(result).toContain('RELATED CONCEPTS: recursion, base_case');
  });

  it('omits override notice for low scaffold levels', () => {
    const result = service.augment('Base system prompt', {
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      level: ScaffoldLevel.PURE_SOCRATIC,
    });

    expect(result).toContain('SCAFFOLDING LEVEL: 0 (PURE_SOCRATIC)');
    expect(result).not.toContain('OVERRIDE NOTICE');
    expect(result).not.toContain('RELATED CONCEPTS');
  });

  it('exposes stable display metadata for each scaffold level', () => {
    expect(service.getLevelName(ScaffoldLevel.PURE_SOCRATIC)).toBe(
      'Pure Socratic',
    );
    expect(
      service.getLevelDescription(ScaffoldLevel.STRATEGIC_HINTS),
    ).toContain('break the problem into smaller pieces');
    expect(
      service.getScaffoldPrompt(ScaffoldLevel.DIRECT_INSTRUCTION),
    ).toContain('INSTRUCTION PROTOCOL');
  });
});
