import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { ScaffoldLevel } from '../../interfaces/scaffolding.interface';
import { KnowledgeGapDetectorService } from '../knowledge-gap-detector.service';

describe('KnowledgeGapDetectorService', () => {
  let service: KnowledgeGapDetectorService;

  const mockKnowledgeStateModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockConceptModel = {
    create: jest.fn(),
    exists: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockBktService = {
    updateKnowledgeState: jest.fn(),
  };

  const mockPrerequisiteChecker = {
    checkMultiple: jest.fn(),
  };

  const mockOpenRouterClientFactory = {
    create: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const selectLeanQuery = <T>(value: T) => {
    const query = {
      lean: jest.fn().mockResolvedValue(value),
      select: jest.fn().mockReturnThis(),
    };
    return query;
  };

  beforeEach(() => {
    service = new KnowledgeGapDetectorService(
      mockKnowledgeStateModel as any,
      mockConceptModel as any,
      mockBktService as any,
      mockPrerequisiteChecker as any,
      mockOpenRouterClientFactory as any,
      mockConfigService as any,
    );
    jest.clearAllMocks();
  });

  it('analyzes signals and returns scaffold recommendations using keyword concepts', async () => {
    const userId = new Types.ObjectId().toString();

    mockConceptModel.find.mockReturnValue(
      selectLeanQuery([
        {
          conceptId: 'recursion',
          keywords: ['recursion'],
          name: 'Recursion',
        },
      ]),
    );

    mockKnowledgeStateModel.find.mockReturnValue(
      selectLeanQuery([{ currentProbability: 0.2 }]),
    );

    mockPrerequisiteChecker.checkMultiple.mockResolvedValue({
      maxDepthReached: false,
      missingPrerequisites: ['functions'],
      prerequisiteChain: [],
      rootGap: 'functions',
    });

    const result = await service.analyze({
      conceptContext: ['base_case'],
      conversationHistory: [
        {
          content: 'I tried recursion and still do not understand it.',
          role: 'user',
          timestamp: new Date('2026-03-15T10:00:00.000Z'),
        },
        {
          content: 'Can you explain what part feels unclear?',
          role: 'assistant',
          timestamp: new Date('2026-03-15T10:01:00.000Z'),
        },
      ],
      timeOnProblem: 20 * 60 * 1000,
      userId,
      userMessage: 'I do not understand recursion. Can you explain recursion?',
    });

    expect(result.detectedConcepts).toEqual(['recursion', 'base_case']);
    expect(result.knowledgeProbability).toBe(0.2);
    expect(result.scaffoldLevel).toBe(ScaffoldLevel.META_COGNITIVE);
    expect(result.recommendation).toBe('scaffold');
    expect(result.rootGap).toBe('functions');
    expect(result.missingPrerequisites).toEqual(['functions']);
    expect(mockPrerequisiteChecker.checkMultiple).toHaveBeenCalledWith(
      ['recursion', 'base_case'],
      userId,
    );
  });

  it('creates an initial knowledge state before persisting BKT updates', async () => {
    const userId = new Types.ObjectId().toString();
    const createdState = {
      _id: new Types.ObjectId(),
      attempts: 0,
      conceptId: 'recursion',
      correctAttempts: 0,
      currentProbability: 0.3,
      lastAssessed: new Date('2026-03-15T00:00:00.000Z'),
      parameters: {
        pGuess: 0.25,
        pInit: 0.3,
        pLearn: 0.15,
        pSlip: 0.1,
      },
      userId: new Types.ObjectId(userId),
    };

    mockKnowledgeStateModel.findOne.mockResolvedValue(null);
    mockKnowledgeStateModel.create.mockResolvedValue(createdState);
    mockBktService.updateKnowledgeState.mockReturnValue({
      state: {
        attempts: 1,
        correctAttempts: 1,
        currentProbability: 0.62,
        lastAssessed: new Date('2026-03-15T00:05:00.000Z'),
      },
    });

    await service.updateKnowledgeState(userId, 'recursion', true);

    expect(mockKnowledgeStateModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        attempts: 0,
        conceptId: 'recursion',
        correctAttempts: 0,
        currentProbability: 0.3,
        userId: expect.any(Types.ObjectId),
      }),
    );
    expect(mockBktService.updateKnowledgeState).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptId: 'recursion',
        userId,
      }),
      true,
    );
    expect(mockKnowledgeStateModel.updateOne).toHaveBeenCalledWith(
      { _id: createdState._id },
      {
        $set: expect.objectContaining({
          attempts: 1,
          correctAttempts: 1,
          currentProbability: 0.62,
        }),
      },
    );
  });

  it('returns keyword concepts when LLM extraction cannot run without an API key', async () => {
    mockConceptModel.find.mockReturnValue(
      selectLeanQuery([
        {
          conceptId: 'recursion',
          keywords: ['recursion'],
          name: 'Recursion',
        },
      ]),
    );
    mockConfigService.get.mockReturnValue(undefined);

    await expect(
      (service as any).detectConcepts('recursion basics', [], 'user-1'),
    ).resolves.toEqual(['recursion']);
  });

  it('normalizes structured LLM extraction output', async () => {
    const send = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              concepts: [
                {
                  difficulty: 'advanced',
                  domain: 'mathematics',
                  id: 'Big O',
                  keywords: ['complexity'],
                  name: 'Big O',
                  prerequisites: ['Algorithms 101'],
                },
                {
                  id: '',
                  name: 'invalid',
                },
              ],
            }),
          },
        },
      ],
    });

    mockOpenRouterClientFactory.create.mockReturnValue({
      chat: {
        send,
      },
    });
    mockConfigService.get.mockImplementation((key: string) =>
      key === 'APP_URL' ? 'https://app.example' : undefined,
    );

    await expect(
      (service as any).extractConceptsViaLLM(
        'Explain time complexity',
        'openrouter-key',
        'model-x',
      ),
    ).resolves.toEqual([
      {
        difficulty: 'advanced',
        domain: 'mathematics',
        id: 'big_o',
        keywords: ['complexity'],
        name: 'Big O',
        prerequisites: ['algorithms_101'],
      },
    ]);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'model-x',
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'HTTP-Referer': 'https://app.example',
          'X-Title': 'Mukti - Concept Extraction',
        }),
      }),
    );
  });

  it('throws for invalid user ids when updating knowledge state', async () => {
    await expect(
      service.updateKnowledgeState('invalid-user-id', 'recursion', true),
    ).rejects.toThrow(BadRequestException);
  });
});
