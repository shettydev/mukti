import { Types } from 'mongoose';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { BranchSuggestionService } from '../branch-suggestion.service';

describe('BranchSuggestionService', () => {
  let service: BranchSuggestionService;

  const mockQueue = {
    add: jest.fn(),
    getJob: jest.fn(),
    getWaiting: jest.fn(),
  };

  const mockThoughtNodeModel = {
    find: jest.fn(),
    findOne: jest.fn(),
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

  const fetchMock = jest.fn();

  beforeEach(() => {
    (global as any).fetch = fetchMock;
    service = new BranchSuggestionService(
      mockQueue as any,
      mockThoughtNodeModel as any,
      mockUsageEventModel as any,
      mockUserModel as any,
      mockConfigService as any,
      mockAiPolicyService as any,
      mockAiSecretsService as any,
    );
    jest.clearAllMocks();
  });

  const leanQuery = <T>(value: T) => ({
    lean: jest.fn().mockResolvedValue(value),
    select: jest.fn().mockReturnThis(),
  });

  describe('connection management', () => {
    it('adds connections and removes them via the cleanup callback', () => {
      const emitFn = jest.fn();

      const cleanup = service.addConnection(
        'map-1',
        'topic-0',
        'conn-1',
        emitFn,
      );
      (service as any).emit('map-1', 'topic-0', {
        data: { jobId: 'job-1', status: 'started' },
        type: 'processing',
      });
      cleanup();
      (service as any).emit('map-1', 'topic-0', {
        data: { jobId: 'job-1', status: 'started' },
        type: 'processing',
      });

      expect(emitFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('enqueueSuggestion', () => {
    it('enqueues with paid priority and computes queue position', async () => {
      const job = {
        getState: jest.fn().mockResolvedValue('waiting'),
        id: 'job-1',
      };
      const userId = new Types.ObjectId();
      mockThoughtNodeModel.findOne.mockReturnValue(
        leanQuery({ label: 'Parent node', type: 'topic' }),
      );
      mockThoughtNodeModel.find.mockReturnValue(
        leanQuery([{ label: 'Existing node', nodeId: 'topic-0' }]),
      );
      mockQueue.add.mockResolvedValue(job);
      mockQueue.getWaiting.mockResolvedValue([
        { id: 'other' },
        { id: 'job-1' },
      ]);

      const result = await service.enqueueSuggestion(
        userId,
        new Types.ObjectId().toString(),
        'topic-0',
        'paid',
        'allowed-model',
        false,
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-branch-suggestion',
        expect.objectContaining({
          existingNodeLabels: ['Existing node'],
          parentNodeId: 'topic-0',
          parentNodeLabel: 'Parent node',
          parentNodeType: 'topic',
          subscriptionTier: 'paid',
          usedByok: false,
          userId: userId.toString(),
        }),
        { priority: 10 },
      );
      expect(result).toEqual({ jobId: 'job-1', position: 2 });
    });

    it('falls back to position 1 when queue position lookup fails', async () => {
      const job = {
        getState: jest.fn().mockRejectedValue(new Error('queue down')),
        id: 'job-2',
      };
      mockThoughtNodeModel.findOne.mockReturnValue(
        leanQuery({ label: 'Parent node', type: 'thought' }),
      );
      mockThoughtNodeModel.find.mockReturnValue(leanQuery([]));
      mockQueue.add.mockResolvedValue(job);

      const result = await service.enqueueSuggestion(
        new Types.ObjectId(),
        new Types.ObjectId().toString(),
        'thought-0',
        'free',
        'allowed-model',
        false,
      );

      expect(result).toEqual({ jobId: 'job-2', position: 1 });
    });
  });

  describe('job lookups', () => {
    it('returns a suggestion job when present', async () => {
      const job = { id: 'job-1' };
      mockQueue.getJob.mockResolvedValue(job);

      await expect(service.getSuggestionJob('job-1')).resolves.toBe(job);
    });

    it('returns null when the job does not exist', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(service.getSuggestionJob('job-1')).resolves.toBeNull();
    });

    it('returns job status and result payload', async () => {
      const job = {
        getState: jest.fn().mockResolvedValue('completed'),
        returnvalue: { mapId: 'map-1' },
      };
      mockQueue.getJob.mockResolvedValue(job);

      await expect(service.getSuggestionJobStatus('job-1')).resolves.toEqual({
        result: { mapId: 'map-1' },
        state: 'completed',
      });
    });

    it('throws when status is requested for a missing job', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(service.getSuggestionJobStatus('job-1')).rejects.toThrow(
        'Job with ID job-1 not found',
      );
    });
  });

  describe('process', () => {
    it('emits processing, suggestions, and completion for a successful job', async () => {
      const mapId = new Types.ObjectId().toString();
      const emitFn = jest.fn();
      service.addConnection(mapId, 'topic-0', 'conn-1', emitFn);
      fetchMock.mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  {
                    label: 'What assumptions are you making?',
                    suggestedType: 'question',
                  },
                  {
                    label: 'What evidence supports this?',
                    suggestedType: 'question',
                  },
                  {
                    label: 'What if this were false?',
                    suggestedType: 'thought',
                  },
                ]),
              },
            },
          ],
        }),
        ok: true,
      });

      const result = await service.process({
        data: {
          existingNodeLabels: ['Existing node'],
          mapId,
          model: 'allowed-model',
          parentNodeId: 'topic-0',
          parentNodeLabel: 'Main topic',
          parentNodeType: 'topic',
          subscriptionTier: 'free',
          usedByok: false,
          userId: new Types.ObjectId().toString(),
        },
        id: 'job-1',
      } as any);

      expect(result).toEqual({
        count: 3,
        mapId,
        parentNodeId: 'topic-0',
        suggestions: [
          {
            label: 'What assumptions are you making?',
            parentId: 'topic-0',
            suggestedType: 'question',
          },
          {
            label: 'What evidence supports this?',
            parentId: 'topic-0',
            suggestedType: 'question',
          },
          {
            label: 'What if this were false?',
            parentId: 'topic-0',
            suggestedType: 'thought',
          },
        ],
      });
      expect(emitFn.mock.calls.map(([event]) => event.type)).toEqual([
        'processing',
        'suggestion',
        'suggestion',
        'suggestion',
        'complete',
      ]);
      expect(mockUsageEventModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'THOUGHT_MAP_BRANCH_SUGGESTION',
          metadata: expect.objectContaining({
            mapId: expect.any(Types.ObjectId),
            model: 'allowed-model',
            parentNodeId: 'topic-0',
            suggestionCount: 3,
          }),
        }),
      );
    });

    it('emits an error and rethrows when processing fails', async () => {
      const mapId = new Types.ObjectId().toString();
      const emitFn = jest.fn();
      service.addConnection(mapId, 'topic-0', 'conn-1', emitFn);
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('boom'),
      });

      await expect(
        service.process({
          data: {
            existingNodeLabels: [],
            mapId,
            model: 'allowed-model',
            parentNodeId: 'topic-0',
            parentNodeLabel: 'Main topic',
            parentNodeType: 'topic',
            subscriptionTier: 'free',
            usedByok: false,
            userId: new Types.ObjectId().toString(),
          },
          id: 'job-1',
        } as any),
      ).rejects.toThrow('OpenRouter API error 500: boom');

      expect(emitFn.mock.calls.at(-1)?.[0]).toEqual({
        data: {
          code: 'SUGGESTION_ERROR',
          message: 'OpenRouter API error 500: boom',
          retriable: true,
        },
        type: 'error',
      });
    });
  });

  describe('private helpers', () => {
    it('parses fenced JSON suggestions and normalizes parent ids', () => {
      const result = (service as any).parseJsonSuggestions(
        '```json\n[{"label":" Question one? ","suggestedType":"question"}]\n```',
        'topic-0',
      );

      expect(result).toEqual([
        {
          label: 'Question one?',
          parentId: 'topic-0',
          suggestedType: 'question',
        },
      ]);
    });

    it('falls back to default suggestions for invalid AI payloads', () => {
      const result = (service as any).parseJsonSuggestions(
        'not-json',
        'topic-0',
      );

      expect(result).toHaveLength(3);
      expect(result.every((item: any) => item.parentId === 'topic-0')).toBe(
        true,
      );
    });

    it('sanitizes labels for prompt safety', () => {
      expect(
        (service as any).sanitizeLabel('<b>`quoted` "value" \\ slash</b>'),
      ).toBe('quoted   value    slash');
    });

    it('enforces curated models when BYOK is not used', () => {
      expect(() =>
        (service as any).validateEffectiveModel('blocked-model', false),
      ).toThrow('MODEL_NOT_ALLOWED');
      expect(
        (service as any).validateEffectiveModel('allowed-model', false),
      ).toBe('allowed-model');
    });

    it('resolves BYOK and server API keys through the configured sources', async () => {
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

    it('throws when neither BYOK nor server API keys are available', async () => {
      mockConfigService.get.mockReturnValueOnce('');

      await expect(
        (service as any).resolveApiKey(new Types.ObjectId().toString(), false),
      ).rejects.toThrow('OPENROUTER_API_KEY not configured');
    });
  });
});
