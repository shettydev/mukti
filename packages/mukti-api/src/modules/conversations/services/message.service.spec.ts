import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { Conversation } from '../../../schemas/conversation.schema';
import { MessageService } from './message.service';

describe('MessageService', () => {
  let service: MessageService;

  const mockConversation = {
    _id: new Types.ObjectId(),
    metadata: {
      estimatedCost: 0,
      lastMessageAt: undefined as Date | undefined,
      messageCount: 0,
      totalTokens: 0,
    },
    recentMessages: [],
    save: jest.fn(),
    technique: 'elenchus',
    title: 'Test Conversation',
    totalMessageCount: 0,
    userId: new Types.ObjectId(),
  };

  const mockConversationModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);

    // Reset mocks before each test
    jest.clearAllMocks();
    mockConversation.recentMessages = [];
    mockConversation.totalMessageCount = 0;
    mockConversation.metadata = {
      estimatedCost: 0,
      lastMessageAt: undefined,
      messageCount: 0,
      totalTokens: 0,
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addMessageToConversation', () => {
    it('should append both user message and AI response to recentMessages', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const userMessage = 'How can I optimize React performance?';
      const aiResponse =
        'What specific performance issues are you experiencing?';

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockConversation.save.mockResolvedValue(mockConversation);

      // Act
      await service.addMessageToConversation(
        conversationId,
        userMessage,
        aiResponse,
      );

      // Assert
      expect(mockConversation.recentMessages).toHaveLength(2);
      expect(mockConversation.recentMessages[0]).toMatchObject({
        content: userMessage,
        role: 'user',
      });
      expect(mockConversation.recentMessages[1]).toMatchObject({
        content: aiResponse,
        role: 'assistant',
      });
    });

    it('should increment totalMessageCount by 2', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const userMessage = 'Test message';
      const aiResponse = 'Test response';

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockConversation.save.mockResolvedValue(mockConversation);

      // Act
      await service.addMessageToConversation(
        conversationId,
        userMessage,
        aiResponse,
      );

      // Assert
      expect(mockConversation.totalMessageCount).toBe(2);
      expect(mockConversation.metadata.messageCount).toBe(2);
    });

    it('should update metadata with token counts when provided', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const userMessage = 'Test message';
      const aiResponse = 'Test response';
      const metadata = {
        completionTokens: 50,
        cost: 0.0004,
        latencyMs: 1200,
        model: 'gpt-5-mini',
        promptTokens: 150,
        totalTokens: 200,
      };

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockConversation.save.mockResolvedValue(mockConversation);

      // Act
      await service.addMessageToConversation(
        conversationId,
        userMessage,
        aiResponse,
        metadata,
      );

      // Assert
      expect(mockConversation.metadata.totalTokens).toBe(200);
      expect(mockConversation.metadata.estimatedCost).toBe(0.0004);
      expect(mockConversation.metadata.lastMessageAt).toBeDefined();
    });

    it('should update lastMessageAt timestamp', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const userMessage = 'Test message';
      const aiResponse = 'Test response';

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockConversation.save.mockResolvedValue(mockConversation);

      const beforeTime = new Date();

      // Act
      await service.addMessageToConversation(
        conversationId,
        userMessage,
        aiResponse,
      );

      const afterTime = new Date();

      // Assert
      expect(mockConversation.metadata.lastMessageAt).toBeDefined();
      expect(
        mockConversation.metadata.lastMessageAt!.getTime(),
      ).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(
        mockConversation.metadata.lastMessageAt!.getTime(),
      ).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should throw error when conversation not found', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const userMessage = 'Test message';
      const aiResponse = 'Test response';

      mockConversationModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.addMessageToConversation(
          conversationId,
          userMessage,
          aiResponse,
        ),
      ).rejects.toThrow(
        `Conversation with ID ${conversationId.toString()} not found`,
      );
    });

    it('should save the conversation after adding messages', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const userMessage = 'Test message';
      const aiResponse = 'Test response';

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockConversation.save.mockResolvedValue(mockConversation);

      // Act
      await service.addMessageToConversation(
        conversationId,
        userMessage,
        aiResponse,
      );

      // Assert
      expect(mockConversation.save).toHaveBeenCalledTimes(1);
    });
  });
});
