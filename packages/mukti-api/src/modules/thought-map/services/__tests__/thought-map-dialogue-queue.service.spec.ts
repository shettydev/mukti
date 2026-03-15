import { Types } from 'mongoose';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { ScaffoldLevel } from '../../../scaffolding/interfaces/scaffolding.interface';
import { ThoughtMapDialogueQueueService } from '../thought-map-dialogue-queue.service';

describe('ThoughtMapDialogueQueueService', () => {
  let service: ThoughtMapDialogueQueueService;
  const validMapId = () => new Types.ObjectId().toString();

  const mockQueue = {
    add: jest.fn(),
    getWaiting: jest.fn(),
  };

  const mockNodeDialogueModel = {
    create: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDialogueMessageModel = {};

  const mockThoughtNodeModel = {
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockUsageEventModel = {
    create: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn().mockReturnThis(),
    lean: jest.fn(),
    select: jest.fn().mockReturnThis(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('server-openrouter-key'),
  };

  const mockAiPolicyService = {
    getCuratedModels: jest.fn().mockReturnValue([{ id: 'allowed-model' }]),
  };

  const mockAiSecretsService = {
    decryptString: jest.fn().mockReturnValue('decrypted-key'),
  };

  const mockDialogueAIService = {
    generateScaffoldedResponseWithPrompt: jest.fn(),
  };

  const mockDialogueService = {
    addMessage: jest.fn(),
    getMessages: jest.fn(),
    updateScaffoldState: jest.fn(),
  };

  const mockDialogueStreamService = {
    emitToNodeDialogue: jest.fn(),
  };

  const mockKnowledgeGapDetector = {
    analyze: jest.fn(),
    updateKnowledgeState: jest.fn(),
  };

  const mockScaffoldFadeService = {
    evaluateAndTransition: jest.fn(),
  };

  const mockResponseEvaluator = {
    evaluate: jest.fn(),
  };

  beforeEach(() => {
    service = new ThoughtMapDialogueQueueService(
      mockQueue as any,
      mockNodeDialogueModel as any,
      mockDialogueMessageModel as any,
      mockThoughtNodeModel as any,
      mockUsageEventModel as any,
      mockUserModel as any,
      mockConfigService as any,
      mockAiPolicyService as any,
      mockAiSecretsService as any,
      mockDialogueAIService as any,
      mockDialogueService as any,
      mockDialogueStreamService as any,
      mockKnowledgeGapDetector as any,
      mockScaffoldFadeService as any,
      mockResponseEvaluator as any,
    );
    jest.clearAllMocks();
  });

  const leanQuery = <T>(value: T) => ({
    lean: jest.fn().mockResolvedValue(value),
  });

  describe('enqueueMapNodeRequest', () => {
    it('enqueues with paid priority and computes queue position', async () => {
      mockQueue.add.mockResolvedValue({
        getState: jest.fn().mockResolvedValue('waiting'),
        id: 'job-1',
      });
      mockQueue.getWaiting.mockResolvedValue([
        { id: 'other' },
        { id: 'job-1' },
      ]);

      const result = await service.enqueueMapNodeRequest(
        new Types.ObjectId(),
        'map-1',
        'node-1',
        'thought',
        'Node label',
        2,
        false,
        3,
        'question',
        'Help me think',
        'paid',
        'allowed-model',
        false,
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-thought-map-dialogue',
        expect.objectContaining({
          depth: 2,
          fromSuggestion: false,
          mapId: 'map-1',
          message: 'Help me think',
          model: 'allowed-model',
          nodeId: 'node-1',
          nodeLabel: 'Node label',
          nodeType: 'thought',
          parentType: 'question',
          siblings: 3,
          subscriptionTier: 'paid',
          usedByok: false,
        }),
        { priority: 10 },
      );
      expect(result).toEqual({ jobId: 'job-1', position: 2 });
    });

    it('falls back to position 1 when queue introspection fails', async () => {
      mockQueue.add.mockResolvedValue({
        getState: jest.fn().mockRejectedValue(new Error('queue down')),
        id: 'job-2',
      });

      await expect(
        service.enqueueMapNodeRequest(
          new Types.ObjectId(),
          'map-1',
          'node-1',
          'thought',
          'Node label',
          1,
          false,
          1,
          undefined,
          'Message',
          'free',
          'allowed-model',
          false,
        ),
      ).resolves.toEqual({ jobId: 'job-2', position: 1 });
    });
  });

  describe('dialogue lookup', () => {
    it('queries dialogues by map id and node id', async () => {
      const dialogue = { _id: new Types.ObjectId() };
      const mapId = validMapId();
      mockNodeDialogueModel.findOne.mockResolvedValue(dialogue);

      await expect(service.findMapDialogue(mapId, 'node-1')).resolves.toBe(
        dialogue,
      );
      expect(mockNodeDialogueModel.findOne).toHaveBeenCalledWith({
        mapId: expect.any(Types.ObjectId),
        nodeId: 'node-1',
      });
    });

    it('returns an existing dialogue without creating a new one', async () => {
      const dialogue = { _id: new Types.ObjectId() };
      const mapId = validMapId();
      mockNodeDialogueModel.findOne.mockResolvedValue(dialogue);

      await expect(
        service.getOrCreateMapDialogue(mapId, 'node-1', 'thought', 'Node'),
      ).resolves.toBe(dialogue);
      expect(mockNodeDialogueModel.create).not.toHaveBeenCalled();
    });

    it('creates a new dialogue and marks the node as explored', async () => {
      const created = { _id: new Types.ObjectId(), nodeId: 'node-1' };
      const mapId = validMapId();
      mockNodeDialogueModel.findOne.mockResolvedValue(null);
      mockNodeDialogueModel.create.mockResolvedValue(created);

      const result = await service.getOrCreateMapDialogue(
        mapId,
        'node-1',
        'thought',
        'Node',
      );

      expect(mockNodeDialogueModel.create).toHaveBeenCalledWith({
        mapId: expect.any(Types.ObjectId),
        messageCount: 0,
        nodeId: 'node-1',
        nodeLabel: 'Node',
        nodeType: 'thought',
      });
      expect(mockThoughtNodeModel.updateOne).toHaveBeenCalledWith(
        { mapId: expect.any(Types.ObjectId), nodeId: 'node-1' },
        { $set: { isExplored: true } },
      );
      expect(result).toBe(created);
    });
  });

  describe('process', () => {
    const dialogue = {
      _id: new Types.ObjectId(),
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      currentScaffoldLevel: ScaffoldLevel.PURE_SOCRATIC,
      detectedConcepts: ['existing-concept'],
      lastMessageAt: new Date('2026-01-01T00:00:00.000Z'),
      messageCount: 0,
      nodeId: 'node-1',
      nodeLabel: 'Node label',
      nodeType: 'thought',
    };
    const userMessage = {
      _id: new Types.ObjectId(),
      content: 'My answer',
      createdAt: new Date('2026-01-01T00:00:01.000Z'),
      sequence: 2,
    };
    const aiMessage = {
      _id: new Types.ObjectId(),
      createdAt: new Date('2026-01-01T00:00:02.000Z'),
      sequence: 3,
    };
    const gapResult = {
      detectedConcepts: ['new-concept'],
      gapScore: 0.4,
      knowledgeProbability: 0.6,
      missingPrerequisites: [],
      recommendation: 'scaffold' as const,
      rootGap: null,
      scaffoldLevel: ScaffoldLevel.META_COGNITIVE,
      signals: {
        behavioral: 0.1,
        linguistic: 0.2,
        temporal: 0.1,
      },
    };
    const aiResponse = {
      completionTokens: 12,
      content: 'A Socratic response',
      cost: 0.02,
      latencyMs: 90,
      model: 'allowed-model',
      promptTokens: 18,
      totalTokens: 30,
    };

    it('processes a dialogue turn without prior assistant history', async () => {
      jest
        .spyOn(service as any, 'getOrCreateMapDialogue')
        .mockResolvedValue(dialogue);
      jest
        .spyOn(service as any, 'resolveMapTitle')
        .mockResolvedValue('Map title');
      const mapId = validMapId();
      mockDialogueService.addMessage
        .mockResolvedValueOnce(userMessage)
        .mockResolvedValueOnce(aiMessage);
      mockDialogueService.getMessages.mockResolvedValue({
        messages: [
          {
            content: 'My answer',
            createdAt: userMessage.createdAt,
            role: 'user',
            sequence: userMessage.sequence,
          },
        ],
        pagination: { total: 1 },
      });
      mockKnowledgeGapDetector.analyze.mockResolvedValue(gapResult);
      mockDialogueAIService.generateScaffoldedResponseWithPrompt.mockResolvedValue(
        aiResponse,
      );

      const result = await service.process({
        data: {
          depth: 2,
          fromSuggestion: false,
          mapId,
          message: 'My answer',
          model: 'allowed-model',
          nodeId: 'node-1',
          nodeLabel: 'Node label',
          nodeType: 'thought',
          parentType: 'question',
          siblings: 2,
          subscriptionTier: 'free',
          usedByok: false,
          userId: new Types.ObjectId().toString(),
        },
        id: 'job-1',
      } as any);

      expect(result).toEqual({
        assistantMessageId: aiMessage._id.toString(),
        cost: 0.02,
        dialogueId: dialogue._id.toString(),
        latency: expect.any(Number),
        tokens: 30,
        userMessageId: userMessage._id.toString(),
      });
      expect(
        mockDialogueStreamService.emitToNodeDialogue,
      ).toHaveBeenCalledTimes(5);
      expect(
        mockDialogueStreamService.emitToNodeDialogue.mock.calls.map(
          ([, , , event]) => event.type,
        ),
      ).toEqual(['processing', 'message', 'progress', 'message', 'complete']);
      expect(mockResponseEvaluator.evaluate).not.toHaveBeenCalled();
      expect(mockDialogueService.updateScaffoldState).not.toHaveBeenCalled();
      expect(
        mockKnowledgeGapDetector.updateKnowledgeState,
      ).not.toHaveBeenCalled();
      expect(mockUsageEventModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'THOUGHT_MAP_DIALOGUE_MESSAGE',
          metadata: expect.objectContaining({
            dialogueId: dialogue._id,
            mapId: expect.any(Types.ObjectId),
            nodeId: 'node-1',
            tokens: 30,
          }),
        }),
      );
    });

    it('updates scaffold state and knowledge state when prior assistant history exists', async () => {
      jest.spyOn(service as any, 'getOrCreateMapDialogue').mockResolvedValue({
        ...dialogue,
        consecutiveFailures: 1,
        consecutiveSuccesses: 2,
      });
      jest
        .spyOn(service as any, 'resolveMapTitle')
        .mockResolvedValue('Map title');
      const mapId = validMapId();
      mockDialogueService.addMessage
        .mockResolvedValueOnce(userMessage)
        .mockResolvedValueOnce(aiMessage);
      mockDialogueService.getMessages.mockResolvedValue({
        messages: [
          {
            content: 'Earlier assistant prompt',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            role: 'assistant',
            sequence: 0,
          },
          {
            content: 'Earlier user reply',
            createdAt: new Date('2026-01-01T00:00:00.500Z'),
            role: 'user',
            sequence: 1,
          },
          {
            content: 'My answer',
            createdAt: userMessage.createdAt,
            role: 'user',
            sequence: userMessage.sequence,
          },
        ],
        pagination: { total: 3 },
      });
      mockKnowledgeGapDetector.analyze.mockResolvedValue({
        ...gapResult,
        rootGap: 'gap-root',
      });
      mockDialogueAIService.generateScaffoldedResponseWithPrompt.mockResolvedValue(
        aiResponse,
      );
      mockResponseEvaluator.evaluate.mockReturnValue({
        quality: {
          confidence: 0.8,
          demonstratesUnderstanding: true,
          signals: {
            appliesPattern: true,
            asksRelevantQuestion: true,
            hasExplanation: true,
            mentionsConcept: true,
          },
        },
      });
      mockScaffoldFadeService.evaluateAndTransition.mockReturnValue({
        changed: true,
        newLevel: ScaffoldLevel.PURE_SOCRATIC,
        reason: 'improved understanding',
        resetCounters: true,
      });

      await service.process({
        data: {
          depth: 2,
          fromSuggestion: false,
          mapId,
          message: 'My answer',
          model: 'allowed-model',
          nodeId: 'node-1',
          nodeLabel: 'Node label',
          nodeType: 'thought',
          parentType: 'question',
          siblings: 2,
          subscriptionTier: 'free',
          usedByok: false,
          userId: new Types.ObjectId().toString(),
        },
        id: 'job-1',
      } as any);

      expect(mockResponseEvaluator.evaluate).toHaveBeenCalled();
      expect(mockScaffoldFadeService.evaluateAndTransition).toHaveBeenCalled();
      expect(
        mockKnowledgeGapDetector.updateKnowledgeState,
      ).toHaveBeenCalledTimes(2);
      expect(mockDialogueService.updateScaffoldState).toHaveBeenCalledWith(
        dialogue._id,
        ScaffoldLevel.PURE_SOCRATIC,
        {
          changed: true,
          newLevel: ScaffoldLevel.PURE_SOCRATIC,
          reason: 'improved understanding',
          resetCounters: true,
        },
        expect.objectContaining({
          rootGap: 'gap-root',
        }),
        true,
      );
    });

    it('emits PROCESSING_ERROR and rethrows on AI failures', async () => {
      jest
        .spyOn(service as any, 'getOrCreateMapDialogue')
        .mockResolvedValue(dialogue);
      jest
        .spyOn(service as any, 'resolveMapTitle')
        .mockResolvedValue('Map title');
      const mapId = validMapId();
      mockDialogueService.addMessage.mockResolvedValueOnce(userMessage);
      mockDialogueService.getMessages.mockResolvedValue({
        messages: [],
        pagination: { total: 0 },
      });
      mockKnowledgeGapDetector.analyze.mockResolvedValue(gapResult);
      mockDialogueAIService.generateScaffoldedResponseWithPrompt.mockRejectedValue(
        new Error('AI unavailable'),
      );

      await expect(
        service.process({
          data: {
            depth: 1,
            fromSuggestion: false,
            mapId,
            message: 'My answer',
            model: 'allowed-model',
            nodeId: 'node-1',
            nodeLabel: 'Node label',
            nodeType: 'thought',
            parentType: undefined,
            siblings: 0,
            subscriptionTier: 'free',
            usedByok: false,
            userId: new Types.ObjectId().toString(),
          },
          id: 'job-1',
        } as any),
      ).rejects.toThrow('AI unavailable');

      expect(
        mockDialogueStreamService.emitToNodeDialogue.mock.calls.at(-1)?.[3],
      ).toEqual({
        data: {
          code: 'PROCESSING_ERROR',
          message: 'AI unavailable',
          retriable: true,
        },
        type: 'error',
      });
    });
  });

  describe('private helpers', () => {
    it('validates curated models when BYOK is not used', () => {
      expect(() =>
        (service as any).validateEffectiveModel('blocked-model', false),
      ).toThrow('MODEL_NOT_ALLOWED');
      expect(
        (service as any).validateEffectiveModel('allowed-model', false),
      ).toBe('allowed-model');
    });

    it('resolves BYOK and server API keys', async () => {
      mockUserModel.lean.mockResolvedValue({
        openRouterApiKeyEncrypted: 'encrypted-key',
      });

      await expect(
        (service as any).resolveApiKey(new Types.ObjectId().toString(), true),
      ).resolves.toBe('decrypted-key');
      await expect(
        (service as any).resolveApiKey(new Types.ObjectId().toString(), false),
      ).resolves.toBe('server-openrouter-key');
    });

    it('falls back to "Unknown topic" when the root node cannot be found', async () => {
      const mapId = validMapId();
      mockThoughtNodeModel.findOne.mockReturnValue(leanQuery(null));

      await expect(
        (service as any).resolveMapTitle(mapId, 'node-1'),
      ).resolves.toBe('Unknown topic');
    });

    it('returns the root node label when one exists', async () => {
      const mapId = validMapId();
      mockThoughtNodeModel.findOne.mockReturnValue(
        leanQuery({ label: 'Root topic' }),
      );

      await expect(
        (service as any).resolveMapTitle(mapId, 'node-1'),
      ).resolves.toBe('Root topic');
    });
  });
});
