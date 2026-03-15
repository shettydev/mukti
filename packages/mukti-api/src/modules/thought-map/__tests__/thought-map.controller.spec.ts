import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { User } from '../../../schemas/user.schema';
import { AiPolicyService } from '../../ai/services/ai-policy.service';
import { AiSecretsService } from '../../ai/services/ai-secrets.service';
import { BranchSuggestionService } from '../services/branch-suggestion.service';
import { MapExtractionService } from '../services/map-extraction.service';
import { ThoughtMapShareService } from '../services/thought-map-share.service';
import { ThoughtMapService } from '../services/thought-map.service';
import { ThoughtMapController } from '../thought-map.controller';

describe('ThoughtMapController', () => {
  let controller: ThoughtMapController;

  const mockUser = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
    email: 'test@example.com',
    subscription: { tier: 'free' as const },
  };

  const mockThoughtMapService = {
    addNode: jest.fn(),
    confirmMap: jest.fn(),
    convertFromCanvas: jest.fn(),
    createMap: jest.fn(),
    deleteNode: jest.fn(),
    findMapById: jest.fn(),
    getMap: jest.fn(),
    getPublicMap: jest.fn(),
    listMaps: jest.fn(),
    updateNode: jest.fn(),
    updateSettings: jest.fn(),
  };

  const mockBranchSuggestionService = {
    enqueueSuggestion: jest.fn(),
    getSuggestionJob: jest.fn(),
    getSuggestionJobStatus: jest.fn(),
  };

  const mockMapExtractionService = {
    addConnection: jest.fn(),
    enqueueExtraction: jest.fn(),
    getExtractionJob: jest.fn(),
  };

  const mockThoughtMapShareService = {
    createShareLink: jest.fn(),
    getActiveShareLink: jest.fn(),
    getShareLinkByToken: jest.fn(),
    revokeShareLink: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('server-openrouter-key'),
  };

  const mockAiPolicyService = {
    resolveEffectiveModel: jest.fn().mockResolvedValue('resolved-model'),
  };

  const mockAiSecretsService = {
    decryptString: jest.fn().mockReturnValue('decrypted-key'),
  };

  const mockUserModel = {
    findById: jest.fn().mockReturnThis(),
    lean: jest.fn(),
    select: jest.fn().mockReturnThis(),
    updateOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThoughtMapController],
      providers: [
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AiPolicyService,
          useValue: mockAiPolicyService,
        },
        {
          provide: AiSecretsService,
          useValue: mockAiSecretsService,
        },
        {
          provide: ThoughtMapService,
          useValue: mockThoughtMapService,
        },
        {
          provide: BranchSuggestionService,
          useValue: mockBranchSuggestionService,
        },
        {
          provide: MapExtractionService,
          useValue: mockMapExtractionService,
        },
        {
          provide: ThoughtMapShareService,
          useValue: mockThoughtMapShareService,
        },
      ],
    }).compile();

    controller = module.get<ThoughtMapController>(ThoughtMapController);
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const setUserRecord = (overrides: Record<string, unknown> = {}) => {
    mockUserModel.lean.mockResolvedValue({
      _id: mockUser._id,
      email: mockUser.email,
      preferences: { activeModel: 'saved-model' },
      ...overrides,
    });
  };

  const expectEnvelope = (result: any) => {
    expect(result.success).toBe(true);
    expect(result.meta).toEqual(
      expect.objectContaining({
        requestId: expect.any(String),
        timestamp: expect.any(String),
      }),
    );
  };

  it('creates a thought map with the standard response envelope', async () => {
    const created = { map: { _id: new Types.ObjectId() }, rootNode: {} };
    mockThoughtMapService.createMap.mockResolvedValue(created);

    const result = await controller.createMap(
      { title: 'Systems thinking' },
      mockUser as any,
    );

    expect(mockThoughtMapService.createMap).toHaveBeenCalledWith(mockUser._id, {
      title: 'Systems thinking',
    });
    expect(result.data).toBe(created);
    expectEnvelope(result);
  });

  it('lists maps with the standard response envelope', async () => {
    const maps = [{ _id: new Types.ObjectId() }];
    mockThoughtMapService.listMaps.mockResolvedValue(maps);

    const result = await controller.listMaps(mockUser as any);

    expect(mockThoughtMapService.listMaps).toHaveBeenCalledWith(mockUser._id);
    expect(result.data).toBe(maps);
    expectEnvelope(result);
  });

  it('retrieves a map with the standard response envelope', async () => {
    const payload = { map: { _id: new Types.ObjectId() }, nodes: [] };
    mockThoughtMapService.getMap.mockResolvedValue(payload);

    const result = await controller.getMap('map-1', mockUser as any);

    expect(mockThoughtMapService.getMap).toHaveBeenCalledWith(
      'map-1',
      mockUser._id,
    );
    expect(result.data).toBe(payload);
    expectEnvelope(result);
  });

  it('adds a node with the standard response envelope', async () => {
    const node = { nodeId: 'thought-1' };
    mockThoughtMapService.addNode.mockResolvedValue(node);

    const result = await controller.addNode(
      'map-1',
      { label: 'Branch', parentId: 'topic-0' },
      mockUser as any,
    );

    expect(mockThoughtMapService.addNode).toHaveBeenCalledWith(
      'map-1',
      mockUser._id,
      { label: 'Branch', parentId: 'topic-0' },
    );
    expect(result.data).toBe(node);
    expectEnvelope(result);
  });

  it('updates a node with the standard response envelope', async () => {
    const node = { nodeId: 'thought-1' };
    mockThoughtMapService.updateNode.mockResolvedValue(node);

    const result = await controller.updateNode(
      'map-1',
      'thought-1',
      { label: 'Updated' },
      mockUser as any,
    );

    expect(mockThoughtMapService.updateNode).toHaveBeenCalledWith(
      'map-1',
      'thought-1',
      mockUser._id,
      { label: 'Updated' },
    );
    expect(result.data).toBe(node);
    expectEnvelope(result);
  });

  it('parses cascade=true and cascade=1 as true', async () => {
    await controller.deleteNode('map-1', 'node-1', 'true', mockUser as any);
    await controller.deleteNode('map-1', 'node-1', '1', mockUser as any);

    expect(mockThoughtMapService.deleteNode).toHaveBeenNthCalledWith(
      1,
      'map-1',
      'node-1',
      mockUser._id,
      true,
    );
    expect(mockThoughtMapService.deleteNode).toHaveBeenNthCalledWith(
      2,
      'map-1',
      'node-1',
      mockUser._id,
      true,
    );
  });

  it('treats other cascade values as false', async () => {
    const result = await controller.deleteNode(
      'map-1',
      'node-1',
      'false',
      mockUser as any,
    );

    expect(mockThoughtMapService.deleteNode).toHaveBeenCalledWith(
      'map-1',
      'node-1',
      mockUser._id,
      false,
    );
    expectEnvelope(result);
  });

  it('uses the BYOK execution context for branch suggestions', async () => {
    setUserRecord({
      openRouterApiKeyEncrypted: 'encrypted-key',
      preferences: { activeModel: 'saved-model' },
    });
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });
    mockBranchSuggestionService.enqueueSuggestion.mockResolvedValue({
      jobId: 'job-1',
      position: 2,
    });

    const result = await controller.requestSuggestions(
      'map-1',
      { model: 'requested-model', parentNodeId: 'topic-0' },
      mockUser as any,
    );

    expect(mockAiSecretsService.decryptString).toHaveBeenCalledWith(
      'encrypted-key',
    );
    expect(mockAiPolicyService.resolveEffectiveModel).toHaveBeenCalledWith({
      hasByok: true,
      requestedModel: 'requested-model',
      userActiveModel: 'saved-model',
      validationApiKey: 'decrypted-key',
    });
    expect(mockUserModel.updateOne).toHaveBeenCalledWith(
      { _id: mockUser._id },
      { $set: { 'preferences.activeModel': 'resolved-model' } },
    );
    expect(mockBranchSuggestionService.enqueueSuggestion).toHaveBeenCalledWith(
      mockUser._id,
      'map-1',
      'topic-0',
      'free',
      'resolved-model',
      true,
    );
    expect(result.data).toEqual({ jobId: 'job-1', position: 2 });
    expectEnvelope(result);
  });

  it('uses the server API key for extraction and persists a new active model', async () => {
    setUserRecord({
      openRouterApiKeyEncrypted: undefined,
      preferences: {},
    });
    mockMapExtractionService.enqueueExtraction.mockResolvedValue({
      jobId: 'job-2',
      position: 1,
    });

    const result = await controller.extractConversation(
      {
        conversationId: '507f1f77bcf86cd799439011',
        model: undefined,
      },
      mockUser as any,
    );

    expect(mockAiPolicyService.resolveEffectiveModel).toHaveBeenCalledWith({
      hasByok: false,
      requestedModel: undefined,
      userActiveModel: undefined,
      validationApiKey: 'server-openrouter-key',
    });
    expect(mockUserModel.updateOne).toHaveBeenCalledWith(
      { _id: mockUser._id },
      { $set: { 'preferences.activeModel': 'resolved-model' } },
    );
    expect(mockMapExtractionService.enqueueExtraction).toHaveBeenCalledWith(
      mockUser._id,
      '507f1f77bcf86cd799439011',
      'resolved-model',
      false,
      'free',
    );
    expect(result.data).toEqual({ jobId: 'job-2', position: 1 });
    expectEnvelope(result);
  });

  it('throws when the AI execution context user record is missing', async () => {
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });
    mockUserModel.lean.mockResolvedValue(null);

    await expect(
      controller.requestSuggestions(
        'map-1',
        { parentNodeId: 'topic-0' },
        mockUser as any,
      ),
    ).rejects.toThrow('User not found');
  });

  it('throws when no BYOK key exists and the server key is missing', async () => {
    setUserRecord({
      openRouterApiKeyEncrypted: undefined,
      preferences: { activeModel: 'saved-model' },
    });
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });
    mockConfigService.get.mockReturnValueOnce('');

    await expect(
      controller.requestSuggestions(
        'map-1',
        { parentNodeId: 'topic-0' },
        mockUser as any,
      ),
    ).rejects.toThrow('OPENROUTER_API_KEY not configured');
  });

  it('returns suggestion job status for the owning user and map', async () => {
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });
    mockBranchSuggestionService.getSuggestionJobStatus.mockResolvedValue({
      result: { mapId: 'map-1' },
      state: 'completed',
    });
    mockBranchSuggestionService.getSuggestionJob.mockResolvedValue({
      data: { userId: mockUser._id.toString() },
    });

    const result = await controller.getSuggestionJobStatus(
      'map-1',
      'job-1',
      mockUser as any,
    );

    expect(result.data).toEqual({
      result: { mapId: 'map-1' },
      state: 'completed',
    });
    expectEnvelope(result);
  });

  it('rejects suggestion job status when the result belongs to another map', async () => {
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });
    mockBranchSuggestionService.getSuggestionJobStatus.mockResolvedValue({
      result: { mapId: 'map-2' },
      state: 'completed',
    });

    await expect(
      controller.getSuggestionJobStatus('map-1', 'job-1', mockUser as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects suggestion job status when the job belongs to another user', async () => {
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });
    mockBranchSuggestionService.getSuggestionJobStatus.mockResolvedValue({
      result: { mapId: 'map-1' },
      state: 'completed',
    });
    mockBranchSuggestionService.getSuggestionJob.mockResolvedValue({
      data: { userId: new Types.ObjectId().toString() },
    });

    await expect(
      controller.getSuggestionJobStatus('map-1', 'job-1', mockUser as any),
    ).rejects.toThrow(ForbiddenException);
  });

  describe('streamSuggestions', () => {
    it('emits an error immediately when jobId is missing', async () => {
      mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });

      const stream = await controller.streamSuggestions(
        'map-1',
        '',
        mockUser as any,
      );
      const events: any[] = [];

      stream.subscribe((event) => events.push(event));

      expect(events).toEqual([
        {
          data: {
            data: {
              code: 'SUGGESTION_ERROR',
              message: 'jobId is required',
              retriable: false,
            },
            type: 'error',
          },
          type: 'message',
        },
      ]);
    });

    it('emits completed suggestion events for a finished job', async () => {
      jest.useFakeTimers();
      mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });
      mockBranchSuggestionService.getSuggestionJob.mockResolvedValue({
        data: { mapId: 'map-1', userId: mockUser._id.toString() },
        getState: jest.fn().mockResolvedValue('completed'),
        returnvalue: {
          suggestions: [
            {
              label: 'What changed?',
              parentId: 'topic-0',
              suggestedType: 'question',
            },
            {
              label: 'What evidence matters?',
              parentId: 'topic-0',
              suggestedType: 'question',
            },
          ],
        },
      });

      const stream = await controller.streamSuggestions(
        'map-1',
        'job-1',
        mockUser as any,
      );
      const events: any[] = [];

      stream.subscribe((event) => events.push(event));
      await Promise.resolve();
      await Promise.resolve();

      expect(events).toEqual([
        {
          data: {
            data: { jobId: 'job-1', status: 'started' },
            type: 'processing',
          },
          type: 'message',
        },
        {
          data: {
            data: {
              label: 'What changed?',
              parentId: 'topic-0',
              suggestedType: 'question',
            },
            type: 'suggestion',
          },
          type: 'message',
        },
        {
          data: {
            data: {
              label: 'What evidence matters?',
              parentId: 'topic-0',
              suggestedType: 'question',
            },
            type: 'suggestion',
          },
          type: 'message',
        },
        {
          data: {
            data: { jobId: 'job-1', suggestionCount: 2 },
            type: 'complete',
          },
          type: 'message',
        },
      ]);
    });

    it('emits an error when the job belongs to another map', async () => {
      jest.useFakeTimers();
      mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });
      mockBranchSuggestionService.getSuggestionJob.mockResolvedValue({
        data: { mapId: 'map-2', userId: mockUser._id.toString() },
        getState: jest.fn(),
      });

      const stream = await controller.streamSuggestions(
        'map-1',
        'job-1',
        mockUser as any,
      );
      const events: any[] = [];

      stream.subscribe((event) => events.push(event));
      await Promise.resolve();
      await Promise.resolve();

      expect(events.at(-1)).toEqual({
        data: {
          data: {
            code: 'SUGGESTION_ERROR',
            message: 'Suggestion job does not belong to this map',
            retriable: false,
          },
          type: 'error',
        },
        type: 'message',
      });
    });

    it('stops polling after unsubscribe cleanup', async () => {
      jest.useFakeTimers();
      mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });
      mockBranchSuggestionService.getSuggestionJob.mockResolvedValue({
        data: { mapId: 'map-1', userId: mockUser._id.toString() },
        getState: jest.fn().mockResolvedValue('waiting'),
      });

      const stream = await controller.streamSuggestions(
        'map-1',
        'job-1',
        mockUser as any,
      );
      const subscription = stream.subscribe(() => undefined);

      await Promise.resolve();
      const callsBeforeUnsubscribe =
        mockBranchSuggestionService.getSuggestionJob.mock.calls.length;
      subscription.unsubscribe();
      await jest.advanceTimersByTimeAsync(1000);

      expect(
        mockBranchSuggestionService.getSuggestionJob,
      ).toHaveBeenCalledTimes(callsBeforeUnsubscribe);
    });
  });

  it('forwards extraction jobs with the standard response envelope', async () => {
    mockMapExtractionService.enqueueExtraction.mockResolvedValue({
      jobId: 'extract-1',
      position: 3,
    });
    setUserRecord();

    const result = await controller.extractConversation(
      {
        conversationId: '507f1f77bcf86cd799439011',
        model: 'requested-model',
      },
      mockUser as any,
    );

    expect(result.data).toEqual({ jobId: 'extract-1', position: 3 });
    expectEnvelope(result);
  });

  it('registers extraction stream connections and runs cleanup on unsubscribe', async () => {
    const cleanup = jest.fn();
    let emitFn!: (event: unknown) => void;
    mockMapExtractionService.getExtractionJob.mockResolvedValue({
      data: { userId: mockUser._id.toString() },
    });
    mockMapExtractionService.addConnection.mockImplementation(
      (_jobId: string, _connectionId: string, cb: (event: unknown) => void) => {
        emitFn = cb;
        return cleanup;
      },
    );

    const stream = await controller.streamExtraction('job-1', mockUser as any);
    const events: any[] = [];
    const subscription = stream.subscribe((event) => events.push(event));

    emitFn({ data: { status: 'started' }, type: 'processing' });
    subscription.unsubscribe();

    expect(events).toEqual([
      {
        data: { data: { status: 'started' }, type: 'processing' },
        type: 'message',
      },
    ]);
    expect(cleanup).toHaveBeenCalled();
  });

  it('confirms a draft map with the standard response envelope', async () => {
    const map = { _id: new Types.ObjectId(), status: 'active' };
    mockThoughtMapService.confirmMap.mockResolvedValue(map);

    const result = await controller.confirmMap('map-1', mockUser as any);

    expect(mockThoughtMapService.confirmMap).toHaveBeenCalledWith(
      'map-1',
      mockUser._id,
    );
    expect(result.data).toBe(map);
    expectEnvelope(result);
  });

  it('converts a canvas session with the standard response envelope', async () => {
    const converted = { map: { _id: new Types.ObjectId() }, nodes: [] };
    mockThoughtMapService.convertFromCanvas.mockResolvedValue(converted);

    const result = await controller.convertFromCanvas(
      'session-1',
      { title: 'Override title' },
      mockUser as any,
    );

    expect(mockThoughtMapService.convertFromCanvas).toHaveBeenCalledWith(
      'session-1',
      mockUser._id,
      'Override title',
    );
    expect(result.data).toBe(converted);
    expectEnvelope(result);
  });

  it('updates settings with the standard response envelope', async () => {
    const map = { _id: new Types.ObjectId() };
    mockThoughtMapService.updateSettings.mockResolvedValue(map);

    const result = await controller.updateSettings(
      'map-1',
      { autoSuggestEnabled: false },
      mockUser as any,
    );

    expect(mockThoughtMapService.updateSettings).toHaveBeenCalledWith(
      'map-1',
      mockUser._id,
      { autoSuggestEnabled: false },
    );
    expect(result.data).toBe(map);
    expectEnvelope(result);
  });

  it('creates and returns share links for owned maps', async () => {
    const link = { token: 'share-token' };
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });
    mockThoughtMapShareService.createShareLink.mockResolvedValue(link);

    const result = await controller.createShareLink(
      'map-1',
      { expiresAt: '2027-01-01T00:00:00.000Z' },
      mockUser as any,
    );

    expect(mockThoughtMapShareService.createShareLink).toHaveBeenCalledWith(
      'map-1',
      mockUser._id,
      { expiresAt: '2027-01-01T00:00:00.000Z' },
    );
    expect(result.data).toBe(link);
    expectEnvelope(result);
  });

  it('returns the active share link for an owned map', async () => {
    const link = { token: 'share-token' };
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });
    mockThoughtMapShareService.getActiveShareLink.mockResolvedValue(link);

    const result = await controller.getShareLink('map-1', mockUser as any);

    expect(result.data).toBe(link);
    expectEnvelope(result);
  });

  it('revokes a share link with the standard response envelope', async () => {
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });

    const result = await controller.revokeShareLink('map-1', mockUser as any);

    expect(mockThoughtMapShareService.revokeShareLink).toHaveBeenCalledWith(
      'map-1',
    );
    expectEnvelope(result);
  });

  it('returns a public shared map without ownership checks', async () => {
    const link = { thoughtMapId: new Types.ObjectId() };
    const shared = { map: { _id: link.thoughtMapId }, nodes: [] };
    mockThoughtMapShareService.getShareLinkByToken.mockResolvedValue(link);
    mockThoughtMapService.getPublicMap.mockResolvedValue(shared);

    const result = await controller.getSharedMap('share-token');

    expect(mockThoughtMapService.getPublicMap).toHaveBeenCalledWith(
      link.thoughtMapId.toString(),
    );
    expect(result.data).toBe(shared);
    expectEnvelope(result);
  });

  it('propagates map ownership errors before opening a suggestion stream', async () => {
    mockThoughtMapService.findMapById.mockRejectedValue(
      new NotFoundException('missing'),
    );

    await expect(
      controller.streamSuggestions('map-1', 'job-1', mockUser as any),
    ).rejects.toThrow(NotFoundException);
  });
});
