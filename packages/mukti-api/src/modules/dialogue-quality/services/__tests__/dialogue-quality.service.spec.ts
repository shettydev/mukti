jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(),
}));

import { Test } from '@nestjs/testing';

import type { QualityAssessmentInput } from '../../interfaces/quality.interface';

import { AcknowledgmentProtocolService } from '../acknowledgment-protocol.service';
import { BreakthroughDetectorService } from '../breakthrough-detector.service';
import { ConclusionDetectorService } from '../conclusion-detector.service';
import { DialogueQualityService } from '../dialogue-quality.service';
import { MisconceptionDetectorService } from '../misconception-detector.service';
import { SingleQuestionEnforcerService } from '../single-question-enforcer.service';

describe('DialogueQualityService', () => {
  let service: DialogueQualityService;
  let misconceptionDetector: MisconceptionDetectorService;
  let breakthroughDetector: BreakthroughDetectorService;
  let acknowledgmentProtocol: AcknowledgmentProtocolService;
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
          provide: AcknowledgmentProtocolService,
          useValue: {
            getDirective: jest.fn().mockReturnValue(null),
          },
        },
        {
          provide: BreakthroughDetectorService,
          useValue: {
            detect: jest.fn().mockReturnValue(null),
          },
        },
        {
          provide: ConclusionDetectorService,
          useValue: {
            assess: jest.fn().mockReturnValue({
              conclusionReady: false,
              signals: [],
            }),
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
    acknowledgmentProtocol = module.get(AcknowledgmentProtocolService);
    singleQuestionEnforcer = module.get(SingleQuestionEnforcerService);
  });

  const baseInput: QualityAssessmentInput = {
    conceptContext: ['concept1'],
    consecutiveFailures: 0,
    conversationHistory: [],
    scaffoldLevel: 0,
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

  it('should include acknowledgment directive when understanding is demonstrated', async () => {
    (acknowledgmentProtocol.getDirective as jest.Mock).mockReturnValue({
      instruction: 'ACKNOWLEDGMENT PROTOCOL: validate',
      priority: 2,
      source: 'acknowledgment',
    });

    const result = await service.assess({
      ...baseInput,
      demonstratesUnderstanding: true,
    });

    expect(result.directives).toHaveLength(2);
    expect(result.directives[0].source).toBe('acknowledgment');
    expect(result.directives[1].source).toBe('single-question');
  });

  it('should pass scaffoldLevel to acknowledgment protocol', async () => {
    await service.assess({
      ...baseInput,
      demonstratesUnderstanding: true,
      scaffoldLevel: 3,
    });

    expect(acknowledgmentProtocol.getDirective).toHaveBeenCalledWith({
      demonstratesUnderstanding: true,
      scaffoldLevel: 3,
    });
  });

  it('should skip acknowledgment when breakthrough fires (breakthrough subsumes it)', async () => {
    (breakthroughDetector.detect as jest.Mock).mockReturnValue({
      instruction: 'BREAKTHROUGH',
      priority: 1,
      source: 'breakthrough',
    });

    const result = await service.assess({
      ...baseInput,
      consecutiveFailures: 3,
      demonstratesUnderstanding: true,
    });

    // Breakthrough fires, acknowledgment should NOT also fire
    expect(acknowledgmentProtocol.getDirective).not.toHaveBeenCalled();
    const sources = result.directives.map((d) => d.source);
    expect(sources).toContain('breakthrough');
    expect(sources).not.toContain('acknowledgment');
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
