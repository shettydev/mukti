import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { User } from '../../../schemas/user.schema';
import { AiPolicyService } from '../../ai/services/ai-policy.service';
import { AiSecretsService } from '../../ai/services/ai-secrets.service';
import { ConversationController } from '../conversation.controller';
import { ConversationService } from '../services/conversation.service';
import { MessageService } from '../services/message.service';
import { QueueService } from '../services/queue.service';
import { StreamService } from '../services/stream.service';

// Avoid importing the ESM build of @openrouter/sdk during tests
jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn().mockImplementation(() => ({
    chatCompletions: { create: jest.fn() },
  })),
}));

describe('ConversationController', () => {
  let controller: ConversationController;
  let conversationService: jest.Mocked<ConversationService>;
  let messageService: jest.Mocked<MessageService>;
  let queueService: jest.Mocked<QueueService>;

  // Mock authenticated user
  const mockUser = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
    email: 'test@example.com',
    emailVerified: true,
    name: 'Test User',
    role: 'user' as const,
    subscription: {
      tier: 'free' as const,
    },
  };

  const mockConversationService = {
    createConversation: jest.fn(),
    deleteConversation: jest.fn(),
    findConversationById: jest.fn(),
    findUserConversations: jest.fn(),
    updateConversation: jest.fn(),
  };

  const mockMessageService = {
    addMessageToConversation: jest.fn(),
    archiveOldMessages: jest.fn(),
    buildConversationContext: jest.fn(),
    getArchivedMessages: jest.fn(),
  };

  const mockQueueService = {
    enqueueRequest: jest.fn(),
    getJobStatus: jest.fn(),
    processJob: jest.fn(),
  };

  const mockStreamService = {
    addConnection: jest.fn(),
    cleanupConversation: jest.fn(),
    emitToConversation: jest.fn(),
    emitToUser: jest.fn(),
    getConversationStream: jest.fn(),
    removeConnection: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock-api-key'),
  };

  const mockAiPolicyService = {
    resolveEffectiveModel: jest.fn().mockResolvedValue(undefined),
  };

  const mockAiSecretsService = {
    decryptString: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
      email: 'test@example.com',
      preferences: { activeModel: 'test-model' },
    }),
    select: jest.fn().mockReturnThis(),
    updateOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationController],
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
          provide: ConversationService,
          useValue: mockConversationService as unknown as ConversationService,
        },
        {
          provide: MessageService,
          useValue: mockMessageService as unknown as MessageService,
        },
        {
          provide: QueueService,
          useValue: mockQueueService as unknown as QueueService,
        },
        {
          provide: StreamService,
          useValue: mockStreamService as unknown as StreamService,
        },
      ],
    }).compile();

    controller = module.get<ConversationController>(ConversationController);
    conversationService = module.get(ConversationService);
    messageService = module.get(MessageService);
    queueService = module.get(QueueService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new conversation', async () => {
      // Arrange
      const createDto = {
        tags: ['react', 'performance'],
        technique: 'elenchus',
        title: 'React Performance Optimization',
      };

      const mockConversation = {
        _id: new Types.ObjectId(),
        createdAt: new Date(),
        hasArchivedMessages: false,
        isArchived: false,
        isFavorite: false,
        metadata: {
          estimatedCost: 0,
          messageCount: 0,
          totalTokens: 0,
        },
        recentMessages: [],
        tags: createDto.tags,
        technique: createDto.technique,
        title: createDto.title,
        totalMessageCount: 0,
        updatedAt: new Date(),
        userId: new Types.ObjectId(),
      };

      mockConversationService.createConversation.mockResolvedValue(
        mockConversation as any,
      );

      // Act
      const result = await controller.create(createDto, mockUser as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConversation);
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('requestId');
      expect(conversationService.createConversation).toHaveBeenCalledWith(
        mockUser._id,
        createDto.title,
        createDto.technique,
        createDto.tags,
      );
    });

    it('should create conversation without tags', async () => {
      // Arrange
      const createDto = {
        technique: 'dialectic',
        title: 'Philosophy Discussion',
      };

      const mockConversation = {
        _id: new Types.ObjectId(),
        hasArchivedMessages: false,
        metadata: {
          estimatedCost: 0,
          messageCount: 0,
          totalTokens: 0,
        },
        recentMessages: [],
        tags: [],
        technique: createDto.technique,
        title: createDto.title,
        totalMessageCount: 0,
        userId: new Types.ObjectId(),
      };

      mockConversationService.createConversation.mockResolvedValue(
        mockConversation as any,
      );

      // Act
      const result = await controller.create(createDto, mockUser as any);

      // Assert
      expect(result.success).toBe(true);
      expect(conversationService.createConversation).toHaveBeenCalledWith(
        mockUser._id,
        createDto.title,
        createDto.technique,
        undefined,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated list of conversations', async () => {
      // Arrange
      const mockConversations = [
        {
          _id: new Types.ObjectId(),
          technique: 'elenchus',
          title: 'Conversation 1',
          userId: new Types.ObjectId(),
        },
        {
          _id: new Types.ObjectId(),
          technique: 'dialectic',
          title: 'Conversation 2',
          userId: new Types.ObjectId(),
        },
      ];

      const mockResult = {
        data: mockConversations,
        meta: {
          limit: 20,
          page: 1,
          total: 2,
          totalPages: 1,
        },
      };

      mockConversationService.findUserConversations.mockResolvedValue(
        mockResult as any,
      );

      // Act
      const result = await controller.findAll(mockUser as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConversations);
      expect(result.meta).toEqual(mockResult.meta);
      expect(conversationService.findUserConversations).toHaveBeenCalledWith(
        mockUser._id,
        {},
        'updatedAt',
        1,
        20,
      );
    });

    it('should apply filters when provided', async () => {
      // Arrange
      const mockResult = {
        data: [],
        meta: {
          limit: 20,
          page: 1,
          total: 0,
          totalPages: 0,
        },
      };

      mockConversationService.findUserConversations.mockResolvedValue(
        mockResult as any,
      );

      // Act
      await controller.findAll(
        mockUser as any,
        'elenchus',
        'react,performance',
        'false',
        'true',
        'createdAt',
        '2',
        '10',
      );

      // Assert
      expect(conversationService.findUserConversations).toHaveBeenCalledWith(
        mockUser._id,
        {
          isArchived: false,
          isFavorite: true,
          tags: ['react', 'performance'],
          technique: 'elenchus',
        },
        'createdAt',
        2,
        10,
      );
    });

    it('should handle pagination parameters', async () => {
      // Arrange
      const mockResult = {
        data: [],
        meta: {
          limit: 50,
          page: 3,
          total: 150,
          totalPages: 3,
        },
      };

      mockConversationService.findUserConversations.mockResolvedValue(
        mockResult as any,
      );

      // Act
      await controller.findAll(
        mockUser as any,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '3',
        '50',
      );

      // Assert
      expect(conversationService.findUserConversations).toHaveBeenCalledWith(
        mockUser._id,
        {},
        'updatedAt',
        3,
        50,
      );
    });
  });

  describe('findOne', () => {
    it('should return a specific conversation', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const mockConversation = {
        _id: conversationId,
        recentMessages: [
          {
            content: 'Test message',
            role: 'user',
            timestamp: new Date(),
          },
        ],
        technique: 'elenchus',
        title: 'Test Conversation',
        userId: new Types.ObjectId(),
      };

      mockConversationService.findConversationById.mockResolvedValue(
        mockConversation as any,
      );

      // Act
      const result = await controller.findOne(
        conversationId.toString(),
        mockUser as any,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConversation);
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('requestId');
      expect(conversationService.findConversationById).toHaveBeenCalledWith(
        conversationId.toString(),
        mockUser._id,
      );
    });
  });

  describe('getArchivedMessages', () => {
    it('should return archived messages with default pagination', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const mockConversation = {
        _id: conversationId,
        userId: new Types.ObjectId(),
      };

      const mockMessages = [
        {
          _id: new Types.ObjectId(),
          content: 'Archived message 1',
          conversationId,
          role: 'user',
          sequenceNumber: 1,
          timestamp: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          content: 'Archived message 2',
          conversationId,
          role: 'assistant',
          sequenceNumber: 2,
          timestamp: new Date(),
        },
      ];

      mockConversationService.findConversationById.mockResolvedValue(
        mockConversation as any,
      );
      mockMessageService.getArchivedMessages.mockResolvedValue(
        mockMessages as any,
      );

      // Act
      const result = await controller.getArchivedMessages(
        conversationId.toString(),
        mockUser as any,
        undefined,
        undefined,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMessages);
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('requestId');
      expect(messageService.getArchivedMessages).toHaveBeenCalledWith(
        conversationId.toString(),
        {
          beforeSequence: undefined,
          limit: 50,
        },
      );
    });

    it('should apply custom limit and beforeSequence', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const mockConversation = {
        _id: conversationId,
        userId: new Types.ObjectId(),
      };

      mockConversationService.findConversationById.mockResolvedValue(
        mockConversation as any,
      );
      mockMessageService.getArchivedMessages.mockResolvedValue([]);

      // Act
      await controller.getArchivedMessages(
        conversationId.toString(),
        mockUser as any,
        '100',
        '50',
      );

      // Assert
      expect(messageService.getArchivedMessages).toHaveBeenCalledWith(
        conversationId.toString(),
        {
          beforeSequence: 50,
          limit: 100,
        },
      );
    });
  });

  describe('remove', () => {
    it('should delete a conversation', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      mockConversationService.deleteConversation.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(
        conversationId.toString(),
        mockUser as any,
      );

      // Assert
      expect(result).toBeUndefined();
      expect(conversationService.deleteConversation).toHaveBeenCalledWith(
        conversationId.toString(),
        mockUser._id,
      );
    });
  });

  describe('sendMessage', () => {
    it('should enqueue message for processing', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const sendMessageDto = {
        content: 'How can I optimize React performance?',
      };

      const mockConversation = {
        _id: conversationId,
        technique: 'elenchus',
        userId: new Types.ObjectId(),
      };

      const mockQueueResult = {
        jobId: 'job-123',
        position: 1,
      };

      mockConversationService.findConversationById.mockResolvedValue(
        mockConversation as any,
      );
      mockQueueService.enqueueRequest.mockResolvedValue(mockQueueResult as any);

      // Act
      const result = await controller.sendMessage(
        conversationId.toString(),
        sendMessageDto,
        mockUser as any,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockQueueResult);
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('requestId');
      expect(queueService.enqueueRequest).toHaveBeenCalledWith(
        mockUser._id,
        conversationId.toString(),
        sendMessageDto.content,
        'free',
        'elenchus',
        undefined,
        false,
      );
    });
  });

  describe('update', () => {
    it('should update conversation properties', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const updateDto = {
        isFavorite: true,
        title: 'Updated Title',
      };

      const mockUpdatedConversation = {
        _id: conversationId,
        isFavorite: true,
        technique: 'elenchus',
        title: 'Updated Title',
        userId: new Types.ObjectId(),
      };

      mockConversationService.updateConversation.mockResolvedValue(
        mockUpdatedConversation as any,
      );

      // Act
      const result = await controller.update(
        conversationId.toString(),
        updateDto,
        mockUser as any,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedConversation);
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('requestId');
      expect(conversationService.updateConversation).toHaveBeenCalledWith(
        conversationId.toString(),
        mockUser._id,
        updateDto,
      );
    });

    it('should update multiple properties', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const updateDto = {
        isArchived: true,
        isFavorite: true,
        tags: ['updated', 'tags'],
        technique: 'dialectic',
        title: 'New Title',
      };

      const mockUpdatedConversation = {
        _id: conversationId,
        ...updateDto,
        userId: new Types.ObjectId(),
      };

      mockConversationService.updateConversation.mockResolvedValue(
        mockUpdatedConversation as any,
      );

      // Act
      const result = await controller.update(
        conversationId.toString(),
        updateDto,
        mockUser as any,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(conversationService.updateConversation).toHaveBeenCalledWith(
        conversationId.toString(),
        mockUser._id,
        updateDto,
      );
    });
  });
});
