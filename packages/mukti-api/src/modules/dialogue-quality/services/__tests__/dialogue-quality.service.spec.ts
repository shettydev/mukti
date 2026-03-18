jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(),
}));

import { Test } from '@nestjs/testing';

import type { QualityAssessmentInput } from '../../interfaces/quality.interface';

import { BreakthroughDetectorService } from '../breakthrough-detector.service';
import { DialogueQualityService } from '../dialogue-quality.service';
import { MisconceptionDetectorService } from '../misconception-detector.service';
import { SingleQuestionEnforcerService } from '../single-question-enforcer.service';

describe('DialogueQualityService', () => {
  let service: DialogueQualityService;
  let misconceptionDetector: MisconceptionDetectorService;
  let breakthroughDetector: BreakthroughDetectorService;
  let singleQuestionEnforcer: SingleQuestionEnforcerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DialogueQualityService,
        {
          provide: MisconceptionDetectorService,
          useValue: {
            detect: jest.fn().mockResolvedValue({
              fromCache: false,
              hasMisconception: false,
            }),
          },
        },
        {
          provide: BreakthroughDetectorService,
          useValue: {
            detect: jest.fn().mockReturnValue(null),
          },
        },
        {
          provide: SingleQuestionEnforcerService,
          useValue: {
            getDirective: jest.fn().mockReturnValue({
              instruction: 'Ask ONE question',
              priority: 10,
              source: 'single-question' as const,
            }),
          },
        },
      ],
    }).compile();

    service = module.get(DialogueQualityService);
    misconceptionDetector = module.get(MisconceptionDetectorService);
    breakthroughDetector = module.get(BreakthroughDetectorService);
    singleQuestionEnforcer = module.get(SingleQuestionEnforcerService);
  });

  const baseInput: QualityAssessmentInput = {
    conceptContext: ['concept1'],
    consecutiveFailures: 0,
    conversationHistory: [],
    userId: 'user1',
    userMessage: 'test message',
  };

  it('should return single-question directive by default', async () => {
    const result = await service.assess(baseInput);

    expect(result.directives).toHaveLength(1);
    expect(result.directives[0].source).toBe('single-question');
    expect(result.misconception?.hasMisconception).toBe(false);
  });

  it('should include misconception directive when detected', async () => {
    (misconceptionDetector.detect as jest.Mock).mockResolvedValue({
      conceptName: 'gravity',
      detectedBelief: 'Things fall because heavy',
      fromCache: false,
      hasMisconception: true,
    });

    const result = await service.assess(baseInput);

    expect(result.directives).toHaveLength(2);
    expect(result.directives[0].source).toBe('misconception');
    expect(result.directives[0].priority).toBe(0);
    expect(result.directives[1].source).toBe('single-question');
  });

  it('should include breakthrough directive when detected', async () => {
    (breakthroughDetector.detect as jest.Mock).mockReturnValue({
      instruction: 'BREAKTHROUGH CONFIRMATION',
      priority: 1,
      source: 'breakthrough',
    });

    const result = await service.assess({
      ...baseInput,
      consecutiveFailures: 3,
      demonstratesUnderstanding: true,
    });

    expect(result.directives).toHaveLength(2);
    expect(result.directives[0].source).toBe('breakthrough');
    expect(result.directives[1].source).toBe('single-question');
  });

  it('should sort directives by priority', async () => {
    (misconceptionDetector.detect as jest.Mock).mockResolvedValue({
      conceptName: 'test',
      fromCache: false,
      hasMisconception: true,
    });
    (breakthroughDetector.detect as jest.Mock).mockReturnValue({
      instruction: 'BREAKTHROUGH',
      priority: 1,
      source: 'breakthrough',
    });

    const result = await service.assess(baseInput);

    // Misconception (0) < Breakthrough (1) < Single-question (10)
    expect(result.directives[0].source).toBe('misconception');
    expect(result.directives[1].source).toBe('breakthrough');
    expect(result.directives[2].source).toBe('single-question');
  });

  it('should return no directives when all features are disabled', async () => {
    (singleQuestionEnforcer.getDirective as jest.Mock).mockReturnValue(null);

    const result = await service.assess(baseInput);

    expect(result.directives).toHaveLength(0);
  });
});
