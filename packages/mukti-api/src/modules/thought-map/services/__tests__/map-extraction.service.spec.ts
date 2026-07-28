import { Types } from 'mongoose';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { MapExtractionService } from '../map-extraction.service';

describe('MapExtractionService', () => {
  let service: MapExtractionService;

  const mockQueue = {
    add: jest.fn(),
    getWaiting: jest.fn(),
  };

  const mockThoughtMapModel = {
    create: jest.fn(),
  };

  const mockThoughtNodeModel = {
    create: jest.fn(),
  };

  const mockConversationModel = {
    findOne: jest.fn(),
  };

  const mockUsageEventModel = {
    create: jest.fn(),
  };

  const mockAiKeyResolver = {
    resolve: jest.fn().mockResolvedValue('server-openrouter-key'),
  };

  const mockAiPolicyService = {
    getCuratedModels: jest.fn().mockReturnValue([{ id: 'allowed-model' }]),
  };

  const mockSend = jest.fn();
  const mockChatClientFactory = {
    create: jest.fn(() => ({ chat: { send: mockSend } })),
  };

  beforeEach(() => {
    service = new MapExtractionService(
      mockQueue as any,
      mockThoughtMapModel as any,
      mockThoughtNodeModel as any,
      mockConversationModel as any,
      mockUsageEventModel as any,
      mockAiKeyResolver as any,
      mockAiPolicyService as any,
      mockChatClientFactory as any,
    );
    jest.clearAllMocks();
    mockChatClientFactory.create.mockReturnValue({ chat: { send: mockSend } });
  });

  const leanQuery = <T>(value: T) => ({
    lean: jest.fn().mockResolvedValue(value),
  });

  describe('connection management', () => {
    it('adds extraction connections and removes them via cleanup', () => {
      const emitFn = jest.fn();
      const cleanup = service.addConnection('job-1', 'conn-1', emitFn);

      (service as any).emit('job-1', {
        data: { jobId: 'job-1', status: 'started' },
        type: 'processing',
      });
      cleanup();
      (service as any).emit('job-1', {
        data: { jobId: 'job-1', status: 'started' },
        type: 'processing',
      });

      expect(emitFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('enqueueExtraction', () => {
    it('enqueues with paid priority and computes queue position', async () => {
      const job = {
        getState: jest.fn().mockResolvedValue('waiting'),
        id: 'job-1',
      };
      mockQueue.add.mockResolvedValue(job);
      mockQueue.getWaiting.mockResolvedValue([{ id: 'job-1' }]);

      const result = await service.enqueueExtraction(
        new Types.ObjectId(),
        '507f1f77bcf86cd799439011',
        'allowed-model',
        false,
        'paid',
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-map-extraction',
        {
          conversationId: '507f1f77bcf86cd799439011',
          model: 'allowed-model',
          subscriptionTier: 'paid',
          usedByok: false,
          userId: expect.any(String),
        },
        { priority: 10 },
      );
      expect(result).toEqual({ jobId: 'job-1', position: 1 });
    });

    it('falls back to position 1 when queue introspection fails', async () => {
      mockQueue.add.mockResolvedValue({
        getState: jest.fn().mockRejectedValue(new Error('queue down')),
        id: 'job-2',
      });

      await expect(
        service.enqueueExtraction(
          new Types.ObjectId(),
          '507f1f77bcf86cd799439011',
          'allowed-model',
          false,
          'free',
        ),
      ).resolves.toEqual({ jobId: 'job-2', position: 1 });
    });
  });

  describe('process', () => {
    it('emits processing, preview, and complete events for a successful extraction', async () => {
      const emitFn = jest.fn();
      const userId = new Types.ObjectId().toString();
      const conversationId = new Types.ObjectId().toString();
      const map = { _id: new Types.ObjectId(), title: 'Main topic' };
      service.addConnection('job-1', 'conn-1', emitFn);
      mockConversationModel.findOne.mockReturnValue(
        leanQuery({
          recentMessages: [
            { content: 'User message', role: 'user', timestamp: new Date() },
          ],
          title: 'Conversation title',
          userId: new Types.ObjectId(userId),
        }),
      );
      mockSend.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                branches: [
                  {
                    label: 'Branch one',
                    sourceMessageIndices: [0],
                    subPoints: [
                      {
                        label: 'Sub point one',
                        sourceMessageIndices: [0],
                      },
                    ],
                  },
                ],
                centralTopic: 'Main topic',
                unresolvedQuestions: ['Open question'],
              }),
            },
          },
        ],
      });
      mockThoughtMapModel.create.mockResolvedValue(map);
      mockThoughtNodeModel.create.mockImplementation((doc: any) => ({
        ...doc,
        _id: new Types.ObjectId(),
      }));

      const result = await service.process({
        data: {
          conversationId,
          model: 'allowed-model',
          subscriptionTier: 'free',
          usedByok: false,
          userId,
        },
        id: 'job-1',
      } as any);

      expect(result).toEqual({
        conversationId,
        mapId: map._id.toString(),
        nodeCount: 4,
      });
      expect(emitFn.mock.calls.map(([event]) => event.type)).toEqual([
        'processing',
        'preview',
        'complete',
      ]);
      expect(mockUsageEventModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'THOUGHT_MAP_EXTRACTION',
          metadata: expect.objectContaining({
            conversationId: expect.any(Types.ObjectId),
            mapId: map._id,
            model: 'allowed-model',
            nodeCount: 4,
          }),
        }),
      );
    });

    it('emits an error and rethrows when the conversation cannot be loaded', async () => {
      const emitFn = jest.fn();
      service.addConnection('job-1', 'conn-1', emitFn);
      mockConversationModel.findOne.mockReturnValue(leanQuery(null));

      await expect(
        service.process({
          data: {
            conversationId: new Types.ObjectId().toString(),
            model: 'allowed-model',
            subscriptionTier: 'free',
            usedByok: false,
            userId: new Types.ObjectId().toString(),
          },
          id: 'job-1',
        } as any),
      ).rejects.toThrow('not found or access denied');

      expect(emitFn.mock.calls.at(-1)?.[0]).toEqual({
        data: {
          code: 'EXTRACTION_ERROR',
          message: expect.stringContaining('not found or access denied'),
          retriable: true,
        },
        type: 'error',
      });
    });
  });

  describe('private helpers', () => {
    it('parses fenced extraction JSON and trims the resulting fields', () => {
      const result = (service as any).parseExtractionResult(
        '```json\n{"centralTopic":" Topic ","branches":[{"label":" Branch ","sourceMessageIndices":[0],"subPoints":[{"label":" Child ","sourceMessageIndices":[1]}]}],"unresolvedQuestions":["Open question"]}\n```',
      );

      expect(result).toEqual({
        branches: [
          {
            label: 'Branch',
            sourceMessageIndices: [0],
            subPoints: [
              {
                label: 'Child',
                sourceMessageIndices: [1],
              },
            ],
          },
        ],
        centralTopic: 'Topic',
        unresolvedQuestions: ['Open question'],
      });
    });

    it('falls back to the default extraction when parsing fails', () => {
      const result = (service as any).parseExtractionResult('not-json');

      expect(result.centralTopic).toBe('Extracted conversation');
      expect(result.branches.length).toBeGreaterThan(0);
    });

    it('sanitizes labels for prompt safety', () => {
      expect((service as any).sanitizeLabel('<b>`quoted` "value"</b>')).toBe(
        'quoted   value',
      );
    });

    it('enforces curated models when BYOK is not used', () => {
      expect(() =>
        (service as any).validateEffectiveModel('blocked-model', false),
      ).toThrow('MODEL_NOT_ALLOWED');
      expect(
        (service as any).validateEffectiveModel('allowed-model', false),
      ).toBe('allowed-model');
    });

    it('persists draft maps with stable node ids and layout defaults', async () => {
      const userId = new Types.ObjectId().toString();
      const conversationId = new Types.ObjectId().toString();
      const map = { _id: new Types.ObjectId() };
      mockThoughtMapModel.create.mockResolvedValue(map);
      mockThoughtNodeModel.create.mockImplementation((doc: any) => ({
        ...doc,
        _id: new Types.ObjectId(),
      }));

      const result = await (service as any).persistDraftMap(
        userId,
        conversationId,
        {
          branches: [
            {
              label: 'Branch one',
              sourceMessageIndices: [0],
              subPoints: [{ label: 'Child one', sourceMessageIndices: [1] }],
            },
          ],
          centralTopic: 'Main topic',
          unresolvedQuestions: ['Question one'],
        },
      );

      expect(result.nodes.map((node: any) => node.nodeId)).toEqual([
        'topic-0',
        'thought-0',
        'thought-1',
        'question-0',
      ]);
      expect(mockThoughtNodeModel.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          depth: 0,
          label: 'Main topic',
          nodeId: 'topic-0',
          position: { x: 0, y: 0 },
          type: 'topic',
        }),
      );
    });

    it('allocates unique sequential thought ids across branches and sub-points', async () => {
      const userId = new Types.ObjectId().toString();
      const conversationId = new Types.ObjectId().toString();
      const map = { _id: new Types.ObjectId() };
      mockThoughtMapModel.create.mockResolvedValue(map);
      mockThoughtNodeModel.create.mockImplementation((doc: any) => ({
        ...doc,
        _id: new Types.ObjectId(),
      }));

      const result = await (service as any).persistDraftMap(
        userId,
        conversationId,
        {
          branches: [
            {
              label: 'Branch one',
              sourceMessageIndices: [0],
              subPoints: [{ label: 'Child one', sourceMessageIndices: [1] }],
            },
            {
              label: 'Branch two',
              sourceMessageIndices: [2],
              subPoints: [{ label: 'Child two', sourceMessageIndices: [3] }],
            },
          ],
          centralTopic: 'Main topic',
          unresolvedQuestions: ['Question one'],
        },
      );

      expect(result.nodes.map((node: any) => node.nodeId)).toEqual([
        'topic-0',
        'thought-0',
        'thought-1',
        'thought-2',
        'thought-3',
        'question-0',
      ]);
    });
  });

  describe('local mode (inline)', () => {
    const originalLocal = process.env.MUKTI_LOCAL;
    const flush = () => new Promise((resolve) => setTimeout(resolve, 60));

    afterEach(() => {
      if (originalLocal === undefined) {
        delete process.env.MUKTI_LOCAL;
      } else {
        process.env.MUKTI_LOCAL = originalLocal;
      }
    });

    it('does not enqueue to BullMQ and returns a local job id', async () => {
      process.env.MUKTI_LOCAL = '1';
      // Fail fast so the deferred inline run drains without waiting for a stream.
      mockConversationModel.findOne.mockReturnValue(leanQuery(null));

      const emitFn = jest.fn();
      const result = await service.enqueueExtraction(
        new Types.ObjectId(),
        new Types.ObjectId().toString(),
        'allowed-model',
        false,
        'free',
      );
      service.addConnection(result.jobId, 'conn-1', emitFn);
      await flush();

      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(result.position).toBe(1);
      expect(result.jobId).toMatch(/^local-/);
    });

    it('processes inline emitting processing → preview → complete', async () => {
      process.env.MUKTI_LOCAL = '1';
      const userId = new Types.ObjectId().toString();
      const map = { _id: new Types.ObjectId(), title: 'Main topic' };
      mockConversationModel.findOne.mockReturnValue(
        leanQuery({
          recentMessages: [
            { content: 'User message', role: 'user', timestamp: new Date() },
          ],
          title: 'Conversation title',
          userId: new Types.ObjectId(userId),
        }),
      );
      mockSend.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                branches: [
                  {
                    label: 'Branch one',
                    sourceMessageIndices: [0],
                    subPoints: [],
                  },
                ],
                centralTopic: 'Main topic',
                unresolvedQuestions: [],
              }),
            },
          },
        ],
      });
      mockThoughtMapModel.create.mockResolvedValue(map);
      mockThoughtNodeModel.create.mockImplementation((doc: any) => ({
        ...doc,
        _id: new Types.ObjectId(),
      }));

      const emitFn = jest.fn();
      const result = await service.enqueueExtraction(
        userId,
        new Types.ObjectId().toString(),
        'allowed-model',
        false,
        'free',
      );
      // Client subscribes to the returned jobId-keyed stream before processing.
      service.addConnection(result.jobId, 'conn-1', emitFn);
      await flush();

      expect(mockQueue.add).not.toHaveBeenCalled();
      const types = emitFn.mock.calls.map(([event]) => event.type);
      expect(types).toEqual(['processing', 'preview', 'complete']);
    });

    it('emits error and no complete when extraction fails', async () => {
      process.env.MUKTI_LOCAL = '1';
      mockConversationModel.findOne.mockReturnValue(leanQuery(null));

      const emitFn = jest.fn();
      const result = await service.enqueueExtraction(
        new Types.ObjectId(),
        new Types.ObjectId().toString(),
        'allowed-model',
        false,
        'free',
      );
      service.addConnection(result.jobId, 'conn-1', emitFn);
      await flush();

      const types = emitFn.mock.calls.map(([event]) => event.type);
      expect(types).toContain('error');
      expect(types).not.toContain('complete');
    });
  });
});
