import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { ThoughtNode } from '../../../schemas/thought-node.schema';
import { User } from '../../../schemas/user.schema';
import { AiPolicyService } from '../../ai/services/ai-policy.service';
import { AiSecretsService } from '../../ai/services/ai-secrets.service';
import { DialogueStreamService } from '../../dialogue/services/dialogue-stream.service';
import { DialogueService } from '../../dialogue/services/dialogue.service';
import { ThoughtMapDialogueQueueService } from '../services/thought-map-dialogue-queue.service';
import { ThoughtMapService } from '../services/thought-map.service';
import { ThoughtMapDialogueController } from '../thought-map-dialogue.controller';

describe('ThoughtMapDialogueController', () => {
  let controller: ThoughtMapDialogueController;

  const mockUser = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
    email: 'test@example.com',
    subscription: { tier: 'free' as const },
  };

  const mockDialogueService = {
    addMessage: jest.fn(),
    getMessages: jest.fn(),
  };

  const mockDialogueStreamService = {
    addConnection: jest.fn(),
    removeConnection: jest.fn(),
  };

  const mockThoughtMapService = {
    findMapById: jest.fn(),
  };

  const mockThoughtMapDialogueQueueService = {
    enqueueMapNodeRequest: jest.fn(),
    findMapDialogue: jest.fn(),
    getOrCreateMapDialogue: jest.fn(),
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

  const mockThoughtNodeModel = {
    countDocuments: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThoughtMapDialogueController],
      providers: [
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(ThoughtNode.name),
          useValue: mockThoughtNodeModel,
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
          provide: DialogueService,
          useValue: mockDialogueService,
        },
        {
          provide: DialogueStreamService,
          useValue: mockDialogueStreamService,
        },
        {
          provide: ThoughtMapService,
          useValue: mockThoughtMapService,
        },
        {
          provide: ThoughtMapDialogueQueueService,
          useValue: mockThoughtMapDialogueQueueService,
        },
      ],
    }).compile();

    controller = module.get<ThoughtMapDialogueController>(
      ThoughtMapDialogueController,
    );
    jest.clearAllMocks();
  });

  const setUserRecord = (overrides: Record<string, unknown> = {}) => {
    mockUserModel.lean.mockResolvedValue({
      _id: mockUser._id,
      preferences: { activeModel: 'saved-model' },
      ...overrides,
    });
  };

  const leanQuery = <T>(value: T) => ({
    lean: jest.fn().mockResolvedValue(value),
  });

  it('returns the existing first message when dialogue history already exists', async () => {
    const mapId = new Types.ObjectId().toString();
    const dialogue = {
      _id: new Types.ObjectId(),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      messageCount: 1,
      nodeId: 'thought-0',
      nodeLabel: 'Node label',
      nodeType: 'thought',
    };
    const message = {
      _id: new Types.ObjectId(),
      content: 'Existing question',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      dialogueId: dialogue._id,
      metadata: { model: 'system' },
      role: 'assistant',
      sequence: 0,
    };

    mockThoughtMapService.findMapById.mockResolvedValue({ _id: mapId });
    mockThoughtNodeModel.findOne.mockResolvedValue({
      label: 'Node label',
      type: 'thought',
    });
    mockThoughtMapDialogueQueueService.getOrCreateMapDialogue.mockResolvedValue(
      dialogue,
    );
    mockDialogueService.getMessages.mockResolvedValue({
      messages: [message],
      pagination: { total: 1 },
    });

    const result = await controller.startDialogue(
      mapId,
      'thought-0',
      mockUser as any,
    );

    expect(mockDialogueService.addMessage).not.toHaveBeenCalled();
    expect(result.initialQuestion.content).toBe('Existing question');
  });

  it('creates the initial question when the dialogue is empty', async () => {
    const mapId = new Types.ObjectId().toString();
    const dialogue = {
      _id: new Types.ObjectId(),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      messageCount: 0,
      nodeId: 'thought-0',
      nodeLabel: 'Node label',
      nodeType: 'thought',
    };
    const updatedDialogue = {
      ...dialogue,
      messageCount: 1,
    };
    const createdMessage = {
      _id: new Types.ObjectId(),
      content:
        'You\'ve noted: "Node label". What led you to this thought? Is this an observation, an assumption, or a conclusion?',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      dialogueId: dialogue._id,
      metadata: { model: 'system' },
      role: 'assistant',
      sequence: 0,
    };

    mockThoughtMapService.findMapById.mockResolvedValue({ _id: mapId });
    mockThoughtNodeModel.findOne.mockResolvedValue({
      label: 'Node label',
      type: 'thought',
    });
    mockThoughtMapDialogueQueueService.getOrCreateMapDialogue
      .mockResolvedValueOnce(dialogue)
      .mockResolvedValueOnce(updatedDialogue);
    mockDialogueService.getMessages.mockResolvedValue({
      messages: [],
      pagination: { total: 0 },
    });
    mockDialogueService.addMessage.mockResolvedValue(createdMessage);

    const result = await controller.startDialogue(
      mapId,
      'thought-0',
      mockUser as any,
    );

    expect(mockDialogueService.addMessage).toHaveBeenCalledWith(
      dialogue._id,
      'assistant',
      createdMessage.content,
      { model: 'system' },
    );
    expect(result.dialogue.messageCount).toBe(1);
    expect(result.initialQuestion.content).toBe(createdMessage.content);
  });

  it('returns empty pagination when no dialogue exists yet', async () => {
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });
    mockThoughtMapDialogueQueueService.findMapDialogue.mockResolvedValue(null);

    const result = await controller.getMessages(
      'map-1',
      'thought-0',
      50,
      3,
      mockUser as any,
    );

    expect(result).toEqual({
      dialogue: null,
      messages: [],
      pagination: {
        hasMore: false,
        limit: 50,
        page: 1,
        total: 0,
        totalPages: 0,
      },
    });
  });

  it('returns existing dialogue messages when found', async () => {
    const dialogue = {
      _id: new Types.ObjectId(),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      messageCount: 1,
      nodeId: 'thought-0',
      nodeLabel: 'Node label',
      nodeType: 'thought',
    };
    const message = {
      _id: new Types.ObjectId(),
      content: 'A message',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      dialogueId: dialogue._id,
      role: 'assistant',
      sequence: 0,
    };

    mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });
    mockThoughtMapDialogueQueueService.findMapDialogue.mockResolvedValue(
      dialogue,
    );
    mockDialogueService.getMessages.mockResolvedValue({
      dialogue,
      messages: [message],
      pagination: {
        hasMore: false,
        limit: 20,
        page: 1,
        total: 1,
        totalPages: 1,
      },
    });

    const result = await controller.getMessages(
      'map-1',
      'thought-0',
      undefined,
      undefined,
      mockUser as any,
    );

    expect(result.messages[0].content).toBe('A message');
    expect(result.dialogue?.nodeId).toBe('thought-0');
  });

  it('sends a message using the server API key context and persists a model when needed', async () => {
    const mapId = new Types.ObjectId().toString();
    setUserRecord({
      openRouterApiKeyEncrypted: undefined,
      preferences: {},
    });
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: mapId });
    mockThoughtNodeModel.findOne
      .mockResolvedValueOnce({
        depth: 2,
        fromSuggestion: false,
        label: 'Node label',
        nodeId: 'thought-0',
        parentId: 'question-0',
        type: 'thought',
      })
      .mockReturnValueOnce(leanQuery({ type: 'question' }));
    mockThoughtNodeModel.countDocuments.mockResolvedValue(3);
    mockThoughtMapDialogueQueueService.enqueueMapNodeRequest.mockResolvedValue({
      jobId: 'job-1',
      position: 2,
    });

    const result = await controller.sendMessage(
      mapId,
      'thought-0',
      { content: 'Help me think this through', model: 'requested-model' },
      mockUser as any,
    );

    expect(mockAiPolicyService.resolveEffectiveModel).toHaveBeenCalledWith({
      hasByok: false,
      requestedModel: 'requested-model',
      userActiveModel: undefined,
      validationApiKey: 'server-openrouter-key',
    });
    expect(mockUserModel.updateOne).toHaveBeenCalledWith(
      { _id: mockUser._id },
      { $set: { 'preferences.activeModel': 'resolved-model' } },
    );
    expect(
      mockThoughtMapDialogueQueueService.enqueueMapNodeRequest,
    ).toHaveBeenCalledWith(
      mockUser._id,
      mapId,
      'thought-0',
      'thought',
      'Node label',
      2,
      false,
      3,
      'question',
      'Help me think this through',
      'free',
      'resolved-model',
      false,
    );
    expect(result).toEqual({ jobId: 'job-1', position: 2 });
  });

  it('uses BYOK without persisting when an active model already exists and no override is requested', async () => {
    const mapId = new Types.ObjectId().toString();
    setUserRecord({
      openRouterApiKeyEncrypted: 'encrypted-key',
      preferences: { activeModel: 'saved-model' },
    });
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: mapId });
    mockThoughtNodeModel.findOne.mockResolvedValueOnce({
      depth: 0,
      fromSuggestion: true,
      label: 'Topic',
      nodeId: 'topic-0',
      parentId: undefined,
      type: 'topic',
    });
    mockThoughtMapDialogueQueueService.enqueueMapNodeRequest.mockResolvedValue({
      jobId: 'job-2',
      position: 1,
    });

    await controller.sendMessage(
      mapId,
      'topic-0',
      { content: 'Start here' },
      mockUser as any,
    );

    expect(mockAiSecretsService.decryptString).toHaveBeenCalledWith(
      'encrypted-key',
    );
    expect(mockUserModel.updateOne).not.toHaveBeenCalled();
    expect(
      mockThoughtMapDialogueQueueService.enqueueMapNodeRequest,
    ).toHaveBeenCalledWith(
      mockUser._id,
      mapId,
      'topic-0',
      'topic',
      'Topic',
      0,
      true,
      0,
      undefined,
      'Start here',
      'free',
      'resolved-model',
      true,
    );
  });

  it('throws when the current user record is missing during sendMessage', async () => {
    const mapId = new Types.ObjectId().toString();
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: mapId });
    mockThoughtNodeModel.findOne.mockResolvedValueOnce({
      depth: 0,
      fromSuggestion: false,
      label: 'Topic',
      type: 'topic',
    });
    mockUserModel.lean.mockResolvedValue(null);

    await expect(
      controller.sendMessage(
        mapId,
        'topic-0',
        { content: 'Start here' },
        mockUser as any,
      ),
    ).rejects.toThrow('User not found');
  });

  it('throws when the thought node cannot be resolved', async () => {
    const mapId = new Types.ObjectId().toString();
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: mapId });
    mockThoughtNodeModel.findOne.mockResolvedValueOnce(null);

    await expect(
      controller.sendMessage(
        mapId,
        'topic-0',
        { content: 'Start here' },
        mockUser as any,
      ),
    ).rejects.toThrow(`Node "topic-0" not found in map ${mapId}`);
  });

  it('throws when the server key is missing and the user does not have BYOK', async () => {
    const mapId = new Types.ObjectId().toString();
    setUserRecord({
      openRouterApiKeyEncrypted: undefined,
      preferences: { activeModel: 'saved-model' },
    });
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: mapId });
    mockThoughtNodeModel.findOne.mockResolvedValueOnce({
      depth: 0,
      fromSuggestion: false,
      label: 'Topic',
      type: 'topic',
    });
    mockConfigService.get.mockReturnValueOnce('');

    await expect(
      controller.sendMessage(
        mapId,
        'topic-0',
        { content: 'Start here' },
        mockUser as any,
      ),
    ).rejects.toThrow('OPENROUTER_API_KEY not configured');
  });

  it('registers map-scoped dialogue streams and removes them on unsubscribe', async () => {
    mockThoughtMapService.findMapById.mockResolvedValue({ _id: 'map-1' });

    const stream = await controller.streamDialogue(
      'map-1',
      'thought-0',
      mockUser as any,
    );
    const subscription = stream.subscribe(() => undefined);

    expect(mockDialogueStreamService.addConnection).toHaveBeenCalledWith(
      'map:map-1',
      'thought-0',
      mockUser._id.toString(),
      expect.any(String),
      expect.any(Function),
    );

    const connectionId =
      mockDialogueStreamService.addConnection.mock.calls[0][3];
    subscription.unsubscribe();

    expect(mockDialogueStreamService.removeConnection).toHaveBeenCalledWith(
      'map:map-1',
      'thought-0',
      connectionId,
    );
  });
});
