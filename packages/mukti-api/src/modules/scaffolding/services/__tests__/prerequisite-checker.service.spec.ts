import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

import { PrerequisiteCheckerService } from '../prerequisite-checker.service';

describe('PrerequisiteCheckerService', () => {
  let service: PrerequisiteCheckerService;

  const mockKnowledgeStateModel = {
    findOne: jest.fn(),
  };

  const mockConceptModel = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const selectLeanQuery = <T>(value: T) => {
    const query = {
      lean: jest.fn().mockResolvedValue(value),
      select: jest.fn().mockReturnThis(),
    };
    return query;
  };

  beforeEach(() => {
    service = new PrerequisiteCheckerService(
      mockKnowledgeStateModel as any,
      mockConceptModel as any,
    );
    jest.clearAllMocks();
  });

  it('returns an empty result when no concepts are provided', async () => {
    await expect(
      service.checkMultiple([], new Types.ObjectId().toString()),
    ).resolves.toEqual({
      maxDepthReached: false,
      missingPrerequisites: [],
      prerequisiteChain: [],
      rootGap: null,
    });
  });

  it('deduplicates missing prerequisites across multiple concept checks', async () => {
    jest
      .spyOn(service, 'recursiveCheck')
      .mockResolvedValueOnce({
        maxDepthReached: false,
        missingPrerequisites: ['functions', 'variables'],
        prerequisiteChain: [],
        rootGap: 'functions',
      })
      .mockResolvedValueOnce({
        maxDepthReached: true,
        missingPrerequisites: ['variables', 'loops'],
        prerequisiteChain: [],
        rootGap: 'loops',
      });

    const result = await service.checkMultiple(
      ['recursion', 'iteration'],
      new Types.ObjectId().toString(),
    );

    expect(result).toEqual({
      maxDepthReached: true,
      missingPrerequisites: ['functions', 'variables', 'loops'],
      prerequisiteChain: [],
      rootGap: 'functions',
    });
  });

  it('throws for invalid user ids before querying models', async () => {
    await expect(service.recursiveCheck('recursion', 'bad-id')).rejects.toThrow(
      BadRequestException,
    );
    expect(mockConceptModel.findOne).not.toHaveBeenCalled();
  });

  it('finds the deepest unmastered prerequisite as the root gap', async () => {
    const userId = new Types.ObjectId().toString();

    mockConceptModel.findOne
      .mockReturnValueOnce(
        selectLeanQuery({
          conceptId: 'recursion',
          prerequisites: ['functions'],
        }),
      )
      .mockReturnValueOnce(
        selectLeanQuery({
          conceptId: 'functions',
          prerequisites: ['variables'],
        }),
      )
      .mockReturnValueOnce(
        selectLeanQuery({
          conceptId: 'variables',
          prerequisites: [],
        }),
      );

    mockKnowledgeStateModel.findOne
      .mockReturnValueOnce(selectLeanQuery({ currentProbability: 0.4 }))
      .mockReturnValueOnce(selectLeanQuery({ currentProbability: 0.35 }))
      .mockReturnValueOnce(selectLeanQuery({ currentProbability: 0.85 }));

    const result = await service.recursiveCheck('recursion', userId);

    expect(result.maxDepthReached).toBe(false);
    expect(result.missingPrerequisites).toEqual(['recursion', 'functions']);
    expect(result.rootGap).toBe('functions');
    expect(result.prerequisiteChain[0]).toMatchObject({
      conceptId: 'recursion',
      isMastered: false,
      missingPrerequisites: [
        expect.objectContaining({
          conceptId: 'functions',
          isMastered: false,
        }),
      ],
    });
  });

  it('stops recursive traversal once the configured max depth is reached', async () => {
    const userId = new Types.ObjectId().toString();

    mockConceptModel.findOne
      .mockReturnValueOnce(
        selectLeanQuery({ conceptId: 'a', prerequisites: ['b'] }),
      )
      .mockReturnValueOnce(
        selectLeanQuery({ conceptId: 'b', prerequisites: ['c'] }),
      );

    mockKnowledgeStateModel.findOne
      .mockReturnValueOnce(selectLeanQuery({ currentProbability: 0.2 }))
      .mockReturnValueOnce(selectLeanQuery({ currentProbability: 0.25 }));

    const result = await service.recursiveCheck('a', userId, 0, 1);

    expect(result.maxDepthReached).toBe(false);
    expect(result.missingPrerequisites).toEqual(['a', 'b']);
    expect(result.rootGap).toBe('b');
    expect(mockConceptModel.findOne).toHaveBeenCalledTimes(2);
  });

  it('marks max depth reached when traversal starts beyond the configured limit', async () => {
    const result = await service.recursiveCheck(
      'a',
      new Types.ObjectId().toString(),
      2,
      1,
    );

    expect(result).toEqual({
      maxDepthReached: true,
      missingPrerequisites: [],
      prerequisiteChain: [],
      rootGap: null,
    });
    expect(mockConceptModel.findOne).not.toHaveBeenCalled();
  });

  it('builds a learning path from the root gap to the target concept', async () => {
    mockConceptModel.find
      .mockReturnValueOnce(selectLeanQuery([{ conceptId: 'functions' }]))
      .mockReturnValueOnce(selectLeanQuery([{ conceptId: 'recursion' }]));

    await expect(
      service.getLearningPath('variables', 'recursion'),
    ).resolves.toEqual(['variables', 'functions', 'recursion']);
  });
});
