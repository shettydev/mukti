import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { Types } from 'mongoose';

import { ArchivedMessage } from '../../../schemas/archived-message.schema';
import { Conversation } from '../../../schemas/conversation.schema';
import { MessageService } from './message.service';

describe('MessageService', () => {
  interface MockConversation {
    _id: Types.ObjectId;
    hasArchivedMessages: boolean;
    markModified: jest.Mock;
    metadata: {
      estimatedCost: number;
      lastMessageAt?: Date;
      messageCount: number;
      totalTokens: number;
    };
    recentMessages: any[];
    save: jest.Mock;
    technique: string;
    title: string;
    totalMessageCount: number;
    userId: Types.ObjectId;
  }

  let service: MessageService;
  let mockConversation: MockConversation;

  const createMockConversation = (): MockConversation => ({
    _id: new Types.ObjectId(),
    hasArchivedMessages: false,
    markModified: jest.fn(),
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
  });

  const mockConversationModel = {
    findById: jest.fn(),
  };

  const mockArchivedMessageModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    insertMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
        {
          provide: getModelToken(ArchivedMessage.name),
          useValue: mockArchivedMessageModel,
        },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
    mockConversation = createMockConversation();

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addMessageToConversation', () => {
    /**
     * Feature: conversation-backend, Property 8: Both messages are appended
     * Validates: Requirements 2.10
     */
    it('should append both user message and AI response for any non-empty inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            aiResponse: fc.string({ maxLength: 200, minLength: 1 }),
            conversationId: fc.integer().map(() => new Types.ObjectId()),
            userMessage: fc.string({ maxLength: 200, minLength: 1 }),
          }),
          async ({ aiResponse, conversationId, userMessage }) => {
            const conversation = createMockConversation();
            mockConversationModel.findById.mockResolvedValue(conversation);
            conversation.save.mockResolvedValue(conversation);

            await service.addMessageToConversation(
              conversationId,
              userMessage,
              aiResponse,
            );

            expect(conversation.recentMessages).toHaveLength(2);
            expect(conversation.recentMessages[0]).toMatchObject({
              content: userMessage,
              role: 'user',
            });
            expect(conversation.recentMessages[1]).toMatchObject({
              content: aiResponse,
              role: 'assistant',
            });
          },
        ),
        { numRuns: 50 },
      );
    });

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

    /**
     * Feature: conversation-backend, Property 6: Message appending updates metadata
     * Validates: Requirements 2.11
     */
    it('should update metadata totals and timestamps for any token and cost inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            aiResponse: fc.string({ maxLength: 120, minLength: 1 }),
            conversationId: fc.integer().map(() => new Types.ObjectId()),
            metadata: fc.record({
              completionTokens: fc.integer({ max: 500, min: 1 }),
              cost: fc.double({
                max: 1,
                min: 0.0001,
                noNaN: true,
              }),
              latencyMs: fc.integer({ max: 5000, min: 1 }),
              model: fc.string({ maxLength: 40, minLength: 1 }),
              promptTokens: fc.integer({ max: 500, min: 1 }),
              totalTokens: fc.integer({ max: 1000, min: 1 }),
            }),
            userMessage: fc.string({ maxLength: 120, minLength: 1 }),
          }),
          async ({ aiResponse, conversationId, metadata, userMessage }) => {
            const conversation = createMockConversation();
            mockConversationModel.findById.mockResolvedValue(conversation);
            conversation.save.mockResolvedValue(conversation);

            await service.addMessageToConversation(
              conversationId,
              userMessage,
              aiResponse,
              metadata,
            );

            expect(conversation.metadata.totalTokens).toBe(
              metadata.totalTokens,
            );
            expect(conversation.metadata.estimatedCost).toBe(metadata.cost);
            expect(conversation.metadata.lastMessageAt).toBeInstanceOf(Date);
            expect(conversation.totalMessageCount).toBe(2);
            expect(conversation.metadata.messageCount).toBe(2);
          },
        ),
        { numRuns: 50 },
      );
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

  describe('archiveOldMessages', () => {
    /**
     * Feature: conversation-backend, Property 7: Archival threshold triggers correctly
     * Validates: Requirements 2.12, 2.13
     */
    it('should archive oldest messages when recentMessages exceed 50 for any count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.integer().map(() => new Types.ObjectId()),
            messageCount: fc.integer({ max: 80, min: 51 }),
          }),
          async ({ conversationId, messageCount }) => {
            const messages = Array.from({ length: messageCount }, (_, i) => ({
              content: `Message ${i}`,
              role: i % 2 === 0 ? 'user' : 'assistant',
              timestamp: new Date(Date.now() + i * 1000),
            }));

            const conversation = createMockConversation();
            conversation.recentMessages = messages;

            mockArchivedMessageModel.findOne.mockClear();
            mockArchivedMessageModel.insertMany.mockClear();
            mockConversationModel.findById.mockResolvedValue(conversation);
            mockArchivedMessageModel.findOne.mockReturnValue({
              exec: jest.fn().mockResolvedValue(null),
              sort: jest.fn().mockReturnThis(),
            });
            mockArchivedMessageModel.insertMany.mockResolvedValue([]);
            conversation.save.mockResolvedValue(conversation);

            await service.archiveOldMessages(conversationId);

            const messagesToArchive = messageCount - 50;
            expect(mockArchivedMessageModel.insertMany).toHaveBeenCalledTimes(
              1,
            );
            const inserted =
              mockArchivedMessageModel.insertMany.mock.calls[0][0];
            expect(inserted).toHaveLength(messagesToArchive);
            expect(inserted[0].sequenceNumber).toBe(1);
            expect(inserted[inserted.length - 1].sequenceNumber).toBe(
              messagesToArchive,
            );
            expect(conversation.recentMessages).toHaveLength(50);
            expect(conversation.hasArchivedMessages).toBe(true);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should not archive when recentMessages is at or below threshold', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      mockConversation.recentMessages = Array(50).fill({
        content: 'Test message',
        role: 'user',
        timestamp: new Date(),
      });

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockConversation.save.mockResolvedValue(mockConversation);

      // Act
      const result = await service.archiveOldMessages(conversationId);

      // Assert
      expect(result.recentMessages).toHaveLength(50);
      expect(mockArchivedMessageModel.insertMany).not.toHaveBeenCalled();
      expect(result.hasArchivedMessages).toBe(false);
    });

    it('should archive oldest messages when exceeding threshold', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const messages = Array(60)
        .fill(null)
        .map((_, i) => ({
          content: `Message ${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          timestamp: new Date(Date.now() + i * 1000),
        }));

      mockConversation.recentMessages = messages;

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockArchivedMessageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
        sort: jest.fn().mockReturnThis(),
      });
      mockArchivedMessageModel.insertMany.mockResolvedValue([]);
      mockConversation.save.mockResolvedValue(mockConversation);

      // Act
      await service.archiveOldMessages(conversationId);

      // Assert
      expect(mockArchivedMessageModel.insertMany).toHaveBeenCalledTimes(1);
      expect(mockArchivedMessageModel.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: 'Message 0',
            conversationId: expect.any(Types.ObjectId),
            role: 'user',
            sequenceNumber: 1,
          }),
        ]),
      );
      expect(mockConversation.recentMessages).toHaveLength(50);
      expect(mockConversation.hasArchivedMessages).toBe(true);
    });

    it('should assign correct sequence numbers starting from 1 when no archived messages exist', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const messages = Array(55)
        .fill(null)
        .map((_, i) => ({
          content: `Message ${i}`,
          role: 'user',
          timestamp: new Date(),
        }));

      mockConversation.recentMessages = messages;

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockArchivedMessageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
        sort: jest.fn().mockReturnThis(),
      });
      mockArchivedMessageModel.insertMany.mockResolvedValue([]);
      mockConversation.save.mockResolvedValue(mockConversation);

      // Act
      await service.archiveOldMessages(conversationId);

      // Assert
      const insertedMessages =
        mockArchivedMessageModel.insertMany.mock.calls[0][0];
      expect(insertedMessages).toHaveLength(5);
      expect(insertedMessages[0].sequenceNumber).toBe(1);
      expect(insertedMessages[1].sequenceNumber).toBe(2);
      expect(insertedMessages[2].sequenceNumber).toBe(3);
      expect(insertedMessages[3].sequenceNumber).toBe(4);
      expect(insertedMessages[4].sequenceNumber).toBe(5);
    });

    it('should continue sequence numbers from existing archived messages', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const messages = Array(55)
        .fill(null)
        .map((_, i) => ({
          content: `Message ${i}`,
          role: 'user',
          timestamp: new Date(),
        }));

      mockConversation.recentMessages = messages;

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockArchivedMessageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ sequenceNumber: 10 }),
        sort: jest.fn().mockReturnThis(),
      });
      mockArchivedMessageModel.insertMany.mockResolvedValue([]);
      mockConversation.save.mockResolvedValue(mockConversation);

      // Act
      await service.archiveOldMessages(conversationId);

      // Assert
      const insertedMessages =
        mockArchivedMessageModel.insertMany.mock.calls[0][0];
      expect(insertedMessages[0].sequenceNumber).toBe(11);
      expect(insertedMessages[4].sequenceNumber).toBe(15);
    });

    it('should preserve message metadata when archiving', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const messages = Array(51)
        .fill(null)
        .map((_, i) => ({
          content: `Message ${i}`,
          metadata: {
            completionTokens: 50,
            latencyMs: 1000,
            model: 'gpt-5-mini',
            promptTokens: 100,
            totalTokens: 150,
          },
          role: 'assistant',
          timestamp: new Date(),
        }));

      mockConversation.recentMessages = messages;

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockArchivedMessageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
        sort: jest.fn().mockReturnThis(),
      });
      mockArchivedMessageModel.insertMany.mockResolvedValue([]);
      mockConversation.save.mockResolvedValue(mockConversation);

      // Act
      await service.archiveOldMessages(conversationId);

      // Assert
      const insertedMessages =
        mockArchivedMessageModel.insertMany.mock.calls[0][0];
      expect(insertedMessages[0].metadata).toEqual({
        completionTokens: 50,
        latencyMs: 1000,
        model: 'gpt-5-mini',
        promptTokens: 100,
        totalTokens: 150,
      });
    });

    it('should throw error when conversation not found', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      mockConversationModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.archiveOldMessages(conversationId)).rejects.toThrow(
        `Conversation with ID ${conversationId.toString()} not found`,
      );
    });

    it('should save the conversation after archiving', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const messages = Array(55)
        .fill(null)
        .map((_, i) => ({
          content: `Message ${i}`,
          role: 'user',
          timestamp: new Date(),
        }));

      mockConversation.recentMessages = messages;

      mockConversationModel.findById.mockResolvedValue(mockConversation);
      mockArchivedMessageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
        sort: jest.fn().mockReturnThis(),
      });
      mockArchivedMessageModel.insertMany.mockResolvedValue([]);
      mockConversation.save.mockResolvedValue(mockConversation);

      // Act
      await service.archiveOldMessages(conversationId);

      // Assert
      expect(mockConversation.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('getArchivedMessages', () => {
    /**
     * Feature: conversation-backend, Property 12: Archived messages maintain order
     * Validates: Requirements 3.2
     */
    it('should return archived messages in ascending sequence order for any input set', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.integer().map(() => new Types.ObjectId()),
            messages: fc
              .array(
                fc.record({
                  content: fc.string({ maxLength: 50 }),
                  role: fc.constantFrom('user', 'assistant'),
                  sequenceNumber: fc.integer({ max: 1000, min: 1 }),
                }),
                { maxLength: 20, minLength: 1 },
              )
              .map((msgs) =>
                [...msgs].sort((a, b) => a.sequenceNumber - b.sequenceNumber),
              ),
          }),
          async ({ conversationId, messages }) => {
            const sortedMessages = messages.map((msg) => ({
              ...msg,
              _id: new Types.ObjectId(),
              conversationId,
              timestamp: new Date(),
            }));

            const sortMock = jest.fn().mockReturnThis();
            const limitMock = jest.fn().mockReturnThis();
            const execMock = jest.fn().mockResolvedValue(sortedMessages);

            mockArchivedMessageModel.find.mockReturnValue({
              exec: execMock,
              limit: limitMock,
              sort: sortMock,
            });

            const result = await service.getArchivedMessages(conversationId);

            expect(sortMock).toHaveBeenCalledWith({ sequenceNumber: 1 });
            expect(limitMock).toHaveBeenCalledWith(50);
            expect(result.map((m) => m.sequenceNumber)).toEqual(
              sortedMessages.map((m) => m.sequenceNumber),
            );
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should retrieve archived messages ordered by sequence number ascending', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const mockMessages = [
        {
          _id: new Types.ObjectId(),
          content: 'Message 1',
          conversationId,
          role: 'user',
          sequenceNumber: 1,
          timestamp: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          content: 'Message 2',
          conversationId,
          role: 'assistant',
          sequenceNumber: 2,
          timestamp: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          content: 'Message 3',
          conversationId,
          role: 'user',
          sequenceNumber: 3,
          timestamp: new Date(),
        },
      ];

      mockArchivedMessageModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMessages),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
      });

      // Act
      const result = await service.getArchivedMessages(conversationId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].sequenceNumber).toBe(1);
      expect(result[1].sequenceNumber).toBe(2);
      expect(result[2].sequenceNumber).toBe(3);
      expect(mockArchivedMessageModel.find).toHaveBeenCalledWith({
        conversationId: expect.any(Types.ObjectId),
      });
    });

    it('should use default limit of 50 when not specified', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const limitSpy = jest.fn().mockReturnThis();

      mockArchivedMessageModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        limit: limitSpy,
        sort: jest.fn().mockReturnThis(),
      });

      // Act
      await service.getArchivedMessages(conversationId);

      // Assert
      expect(limitSpy).toHaveBeenCalledWith(50);
    });

    it('should use custom limit when specified', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const limitSpy = jest.fn().mockReturnThis();

      mockArchivedMessageModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        limit: limitSpy,
        sort: jest.fn().mockReturnThis(),
      });

      // Act
      await service.getArchivedMessages(conversationId, { limit: 100 });

      // Assert
      expect(limitSpy).toHaveBeenCalledWith(100);
    });

    it('should filter by beforeSequence when provided', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const findSpy = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
      });

      mockArchivedMessageModel.find = findSpy;

      // Act
      await service.getArchivedMessages(conversationId, {
        beforeSequence: 100,
      });

      // Assert
      expect(findSpy).toHaveBeenCalledWith({
        conversationId: expect.any(Types.ObjectId),
        sequenceNumber: { $lt: 100 },
      });
    });

    it('should not filter by sequence when beforeSequence is not provided', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const findSpy = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
      });

      mockArchivedMessageModel.find = findSpy;

      // Act
      await service.getArchivedMessages(conversationId);

      // Assert
      expect(findSpy).toHaveBeenCalledWith({
        conversationId: expect.any(Types.ObjectId),
      });
    });

    it('should sort messages by sequenceNumber in ascending order', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const sortSpy = jest.fn().mockReturnThis();

      mockArchivedMessageModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        limit: jest.fn().mockReturnThis(),
        sort: sortSpy,
      });

      // Act
      await service.getArchivedMessages(conversationId);

      // Assert
      expect(sortSpy).toHaveBeenCalledWith({ sequenceNumber: 1 });
    });

    it('should return empty array when no archived messages exist', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();

      mockArchivedMessageModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
      });

      // Act
      const result = await service.getArchivedMessages(conversationId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle string conversationId', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const conversationIdString = conversationId.toString();

      mockArchivedMessageModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
      });

      // Act
      await service.getArchivedMessages(conversationIdString);

      // Assert
      expect(mockArchivedMessageModel.find).toHaveBeenCalledWith({
        conversationId: expect.any(Types.ObjectId),
      });
    });

    it('should combine limit and beforeSequence options', async () => {
      // Arrange
      const conversationId = new Types.ObjectId();
      const findSpy = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
      });
      const limitSpy = jest.fn().mockReturnThis();

      mockArchivedMessageModel.find = findSpy;
      mockArchivedMessageModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        limit: limitSpy,
        sort: jest.fn().mockReturnThis(),
      });

      // Act
      await service.getArchivedMessages(conversationId, {
        beforeSequence: 50,
        limit: 25,
      });

      // Assert
      expect(findSpy).toHaveBeenCalledWith({
        conversationId: expect.any(Types.ObjectId),
        sequenceNumber: { $lt: 50 },
      });
      expect(limitSpy).toHaveBeenCalledWith(25);
    });
  });

  describe('buildConversationContext', () => {
    it('should format recent messages for AI prompt', () => {
      // Arrange
      const conversation = {
        ...mockConversation,
        recentMessages: [
          {
            content: 'How can I optimize React performance?',
            role: 'user' as const,
            timestamp: new Date(),
          },
          {
            content: 'What specific performance issues are you experiencing?',
            role: 'assistant' as const,
            timestamp: new Date(),
          },
          {
            content: 'My components are re-rendering too often',
            role: 'user' as const,
            timestamp: new Date(),
          },
        ],
      };

      const techniqueTemplate = {
        exampleQuestions: ['What do you mean by...?', 'Can you clarify...?'],
        followUpStrategy: 'Identify contradictions and ask for clarification',
        questioningStyle: 'Challenging and probing',
        systemPrompt:
          'You are a Socratic questioner using the elenchus method.',
      };

      // Act
      const context = service.buildConversationContext(
        conversation as any,
        techniqueTemplate,
      );

      // Assert
      expect(context.messages).toHaveLength(3);
      expect(context.messages[0]).toEqual({
        content: 'How can I optimize React performance?',
        role: 'user',
      });
      expect(context.messages[1]).toEqual({
        content: 'What specific performance issues are you experiencing?',
        role: 'assistant',
      });
      expect(context.messages[2]).toEqual({
        content: 'My components are re-rendering too often',
        role: 'user',
      });
    });

    it('should include systemPrompt from technique template', () => {
      // Arrange
      const conversation = {
        ...mockConversation,
        recentMessages: [],
      };

      const techniqueTemplate = {
        exampleQuestions: ['What do you mean by...?'],
        followUpStrategy: 'Identify contradictions',
        questioningStyle: 'Challenging',
        systemPrompt:
          'You are a Socratic questioner using the elenchus method. Challenge assumptions by asking probing questions.',
      };

      // Act
      const context = service.buildConversationContext(
        conversation as any,
        techniqueTemplate,
      );

      // Assert
      expect(context.systemPrompt).toBe(
        'You are a Socratic questioner using the elenchus method. Challenge assumptions by asking probing questions.',
      );
    });

    it('should include technique configuration in context', () => {
      // Arrange
      const conversation = {
        ...mockConversation,
        recentMessages: [],
      };

      const techniqueTemplate = {
        conversationFlow: ['greeting', 'exploration', 'synthesis'],
        exampleQuestions: [
          'What do you mean by...?',
          'Can you provide an example?',
        ],
        followUpStrategy: 'Identify contradictions and ask for clarification',
        maxQuestionsPerTopic: 5,
        questioningStyle: 'Challenging and probing',
        systemPrompt: 'You are a Socratic questioner.',
      };

      // Act
      const context = service.buildConversationContext(
        conversation as any,
        techniqueTemplate,
      );

      // Assert
      expect(context.technique).toEqual({
        conversationFlow: ['greeting', 'exploration', 'synthesis'],
        exampleQuestions: [
          'What do you mean by...?',
          'Can you provide an example?',
        ],
        followUpStrategy: 'Identify contradictions and ask for clarification',
        maxQuestionsPerTopic: 5,
        questioningStyle: 'Challenging and probing',
      });
    });

    it('should handle empty recentMessages array', () => {
      // Arrange
      const conversation = {
        ...mockConversation,
        recentMessages: [],
      };

      const techniqueTemplate = {
        exampleQuestions: ['What do you mean by...?'],
        followUpStrategy: 'Identify contradictions',
        questioningStyle: 'Challenging',
        systemPrompt: 'You are a Socratic questioner.',
      };

      // Act
      const context = service.buildConversationContext(
        conversation as any,
        techniqueTemplate,
      );

      // Assert
      expect(context.messages).toEqual([]);
      expect(context.systemPrompt).toBe('You are a Socratic questioner.');
      expect(context.technique).toBeDefined();
    });

    it('should exclude message metadata from formatted messages', () => {
      // Arrange
      const conversation = {
        ...mockConversation,
        recentMessages: [
          {
            content: 'Test message',
            metadata: {
              completionTokens: 50,
              latencyMs: 1000,
              model: 'gpt-5-mini',
              promptTokens: 100,
              totalTokens: 150,
            },
            role: 'assistant' as const,
            timestamp: new Date(),
          },
        ],
      };

      const techniqueTemplate = {
        exampleQuestions: ['What do you mean by...?'],
        followUpStrategy: 'Identify contradictions',
        questioningStyle: 'Challenging',
        systemPrompt: 'You are a Socratic questioner.',
      };

      // Act
      const context = service.buildConversationContext(
        conversation as any,
        techniqueTemplate,
      );

      // Assert
      expect(context.messages[0]).toEqual({
        content: 'Test message',
        role: 'assistant',
      });
      expect(context.messages[0]).not.toHaveProperty('metadata');
      expect(context.messages[0]).not.toHaveProperty('timestamp');
    });

    it('should handle technique template with optional fields', () => {
      // Arrange
      const conversation = {
        ...mockConversation,
        recentMessages: [
          {
            content: 'Test message',
            role: 'user' as const,
            timestamp: new Date(),
          },
        ],
      };

      const techniqueTemplate = {
        exampleQuestions: ['What do you mean by...?'],
        followUpStrategy: 'Identify contradictions',
        questioningStyle: 'Challenging',
        systemPrompt: 'You are a Socratic questioner.',
        // conversationFlow and maxQuestionsPerTopic are optional
      };

      // Act
      const context = service.buildConversationContext(
        conversation as any,
        techniqueTemplate,
      );

      // Assert
      expect(context.technique.conversationFlow).toBeUndefined();
      expect(context.technique.maxQuestionsPerTopic).toBeUndefined();
      expect(context.technique.questioningStyle).toBe('Challenging');
      expect(context.technique.followUpStrategy).toBe(
        'Identify contradictions',
      );
    });

    it('should preserve message order from recentMessages', () => {
      // Arrange
      const conversation = {
        ...mockConversation,
        recentMessages: [
          {
            content: 'First message',
            role: 'user' as const,
            timestamp: new Date(Date.now() - 3000),
          },
          {
            content: 'Second message',
            role: 'assistant' as const,
            timestamp: new Date(Date.now() - 2000),
          },
          {
            content: 'Third message',
            role: 'user' as const,
            timestamp: new Date(Date.now() - 1000),
          },
          {
            content: 'Fourth message',
            role: 'assistant' as const,
            timestamp: new Date(),
          },
        ],
      };

      const techniqueTemplate = {
        exampleQuestions: ['What do you mean by...?'],
        followUpStrategy: 'Identify contradictions',
        questioningStyle: 'Challenging',
        systemPrompt: 'You are a Socratic questioner.',
      };

      // Act
      const context = service.buildConversationContext(
        conversation as any,
        techniqueTemplate,
      );

      // Assert
      expect(context.messages).toHaveLength(4);
      expect(context.messages[0].content).toBe('First message');
      expect(context.messages[1].content).toBe('Second message');
      expect(context.messages[2].content).toBe('Third message');
      expect(context.messages[3].content).toBe('Fourth message');
    });

    it('should handle system role messages', () => {
      // Arrange
      const conversation = {
        ...mockConversation,
        recentMessages: [
          {
            content: 'System initialization message',
            role: 'system' as const,
            timestamp: new Date(),
          },
          {
            content: 'User message',
            role: 'user' as const,
            timestamp: new Date(),
          },
        ],
      };

      const techniqueTemplate = {
        exampleQuestions: ['What do you mean by...?'],
        followUpStrategy: 'Identify contradictions',
        questioningStyle: 'Challenging',
        systemPrompt: 'You are a Socratic questioner.',
      };

      // Act
      const context = service.buildConversationContext(
        conversation as any,
        techniqueTemplate,
      );

      // Assert
      expect(context.messages).toHaveLength(2);
      expect(context.messages[0]).toEqual({
        content: 'System initialization message',
        role: 'system',
      });
      expect(context.messages[1]).toEqual({
        content: 'User message',
        role: 'user',
      });
    });
  });
});
