import { ScaffoldLevel } from '../../interfaces/scaffolding.interface';
import {
  type EvaluationInput,
  ResponseEvaluatorService,
} from '../response-evaluator.service';

describe('ResponseEvaluatorService', () => {
  let service: ResponseEvaluatorService;

  beforeEach(() => {
    service = new ResponseEvaluatorService();
  });

  const evaluate = (overrides: Partial<EvaluationInput> = {}) =>
    service.evaluate({
      scaffoldLevel: ScaffoldLevel.PURE_SOCRATIC,
      userResponse: 'I think this works because it reduces the problem first.',
      ...overrides,
    });

  it('evaluates a detailed response as understanding when signals are strong', () => {
    const result = evaluate({
      conceptKeywords: ['recursion', 'base case'],
      scaffoldLevel: ScaffoldLevel.DIRECT_INSTRUCTION,
      userResponse:
        'Recursion works because each step reduces the problem toward a base case. ' +
        'For example, I could use recursion in a tree traversal, and I would stop when the node is empty. ' +
        'How would that change if the tree were unbalanced?',
    });

    expect(result.analysis.conceptMentions).toBeGreaterThanOrEqual(2);
    expect(result.analysis.explanationIndicators).toBeGreaterThan(0);
    expect(result.analysis.patternApplications).toBeGreaterThan(0);
    expect(result.quality.demonstratesUnderstanding).toBe(true);
    expect(result.quality.signals).toEqual({
      appliesPattern: true,
      asksRelevantQuestion: true,
      hasExplanation: true,
      mentionsConcept: true,
    });
  });

  it('evaluates a weak response as not demonstrating understanding', () => {
    const result = evaluate({
      conceptKeywords: ['recursion'],
      userResponse: "I don't know recursion. help??",
    });

    expect(result.quality.demonstratesUnderstanding).toBe(false);
    expect(result.rawScores.depth).toBe(0);
    expect(result.feedback).toContain(
      'No explanatory language - prompt for reasoning',
    );
  });

  it('marks obviously insufficient responses quickly', () => {
    expect(service.isInsufficientResponse(' ? ')).toBe(true);
    expect(service.isInsufficientResponse('idk')).toBe(true);
    expect(service.isInsufficientResponse('....')).toBe(true);
    expect(service.isInsufficientResponse('I think it works')).toBe(false);
  });

  it('detects improvement over weaker prior responses', () => {
    const current =
      'I think recursion works because each step gets closer to a base case, so the function eventually stops.';
    const previous = ['idk', 'maybe recursion?'];

    expect(service.showsImprovement(current, previous)).toBe(true);
    expect(service.showsImprovement('idk', [])).toBe(false);
  });
});
