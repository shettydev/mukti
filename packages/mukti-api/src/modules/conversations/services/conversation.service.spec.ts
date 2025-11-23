import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { Types } from 'mongoose';

import { ArchivedMessage } from '../../../schemas/archived-message.schema';
import { Conversation } from '../../../schemas/conversation.schema';
import { Technique } from '../../../schemas/technique.schema';
import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  let service: ConversationService;

  const mockConversationModel = {
    countDocuments: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOne: jest.fn(),
  };

  const mockArchivedMessageModel = {
    countDocuments: jest.fn(),
    deleteMany: jest.fn(),
    find: jest.fn(),
  };

  const mockTechniqueModel = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
        {
          provide: getModelToken(ArchivedMessage.name),
          useValue: mockArchivedMessageModel,
        },
        {
          provide: getModelToken(Technique.name),
          useValue: mockTechniqueModel,
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConversation', () => {
    /**
     * Feature: conversation-backend, Property 1: Conversation creation initializes correctly
     * Validates: Requirements 1.1, 1.2, 1.3, 1.5
     */
    it('should initialize conversations correctly for any valid technique and user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            tags: fc.array(fc.string({ maxLength: 20, minLength: 1 }), {
              maxLength: 10,
            }),
            technique: fc.constantFrom(
              'elenchus',
              'dialectic',
              'maieutics',
              'definitional',
              'analogical',
              'counterfactual',
            ),
            title: fc
              .string({ maxLength: 100, minLength: 1 })
              .filter((s) => s.trim().length > 0),
            userId: fc.integer().map(() => new Types.ObjectId()),
          }),
          async ({ tags, technique, title, userId }) => {
            // Mock technique exists in database
            mockTechniqueModel.findOne.mockResolvedValue({
              isActive: true,
              name: technique,
              status: 'approved',
            });

            // Mock conversation creation
            const mockConversation = {
              _id: new Types.ObjectId(),
              createdAt: new Date(),
              hasArchivedMessages: false,
              isArchived: false,
              isFavorite: false,
              isShared: false,
              metadata: {
                estimatedCost: 0,
                messageCount: 0,
                totalTokens: 0,
              },
              recentMessages: [],
              tags,
              technique,
              title: title.trim(),
              totalMessageCount: 0,
              updatedAt: new Date(),
              userId: userId,
            };

            mockConversationModel.create.mockResolvedValue(mockConversation);

            // Act
            const conversation = await service.createConversation(
              userId,
              title,
              technique,
              tags,
            );

            // Assert - Property 1: Conversation creation initializes correctly
            expect(conversation.recentMessages).toEqual([]);
            expect(conversation.totalMessageCount).toBe(0);
            expect(conversation.metadata.estimatedCost).toBe(0);
            expect(conversation.metadata.totalTokens).toBe(0);
            expect(conversation.metadata.messageCount).toBe(0);
            expect(conversation.hasArchivedMessages).toBe(false);
            expect(conversation.technique).toBe(technique);
            expect(conversation.userId.toString()).toBe(userId.toString());
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should create a conversation with valid inputs', async () => {
      const userId = new Types.ObjectId();
      const title = 'Test Conversation';
      const technique = 'elenchus';
      const tags = ['test', 'example'];

      // Mock technique exists
      mockTechniqueModel.findOne.mockResolvedValue({
        isActive: true,
        name: technique,
        status: 'approved',
      });

      const mockConversation = {
        _id: new Types.ObjectId(),
        hasArchivedMessages: false,
        metadata: {
          estimatedCost: 0,
          messageCount: 0,
          totalTokens: 0,
        },
        recentMessages: [],
        tags,
        technique,
        title,
        totalMessageCount: 0,
        userId,
      };

      mockConversationModel.create.mockResolvedValue(mockConversation);

      const result = await service.createConversation(
        userId,
        title,
        technique,
        tags,
      );

      expect(result).toBeDefined();
      expect(result.title).toBe(title);
      expect(result.technique).toBe(technique);
      expect(result.recentMessages).toEqual([]);
      expect(result.totalMessageCount).toBe(0);
    });

    it('should trim whitespace from title', async () => {
      const userId = new Types.ObjectId();
      const title = '  Test Conversation  ';
      const technique = 'elenchus';

      mockTechniqueModel.findOne.mockResolvedValue({
        isActive: true,
        name: technique,
        status: 'approved',
      });

      const mockConversation = {
        _id: new Types.ObjectId(),
        metadata: {
          estimatedCost: 0,
          messageCount: 0,
          totalTokens: 0,
        },
        recentMessages: [],
        tags: [],
        technique,
        title: title.trim(),
        totalMessageCount: 0,
        userId,
      };

      mockConversationModel.create.mockResolvedValue(mockConversation);

      await service.createConversation(userId, title, technique);

      expect(mockConversationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Conversation',
        }),
      );
    });

    /**
     * Feature: conversation-backend, Property 2: Invalid techniques are rejected
     * Validates: Requirements 1.4
     */
    it('should reject invalid techniques for any user and title', async () => {
      const validTechniques = [
        'elenchus',
        'dialectic',
        'maieutics',
        'definitional',
        'analogical',
        'counterfactual',
      ];

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            technique: fc
              .string({ maxLength: 50, minLength: 1 })
              .filter((t) => !validTechniques.includes(t)),
            title: fc
              .string({ maxLength: 100, minLength: 1 })
              .filter((s) => s.trim().length > 0),
            userId: fc.integer().map(() => new Types.ObjectId()),
          }),
          async ({ technique, title, userId }) => {
            // Act & Assert - Property 2: Invalid techniques are rejected
            await expect(
              service.createConversation(userId, title, technique),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should throw BadRequestException for invalid technique', async () => {
      const userId = new Types.ObjectId();
      const title = 'Test Conversation';
      const invalidTechnique = 'invalid-technique';

      await expect(
        service.createConversation(userId, title, invalidTechnique),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createConversation(userId, title, invalidTechnique),
      ).rejects.toThrow(
        `Invalid technique: ${invalidTechnique}. Must be one of: elenchus, dialectic, maieutics, definitional, analogical, counterfactual`,
      );
    });

    it('should throw BadRequestException when technique not found in database', async () => {
      const userId = new Types.ObjectId();
      const title = 'Test Conversation';
      const technique = 'elenchus';

      // Mock technique not found in database
      mockTechniqueModel.findOne.mockResolvedValue(null);

      await expect(
        service.createConversation(userId, title, technique),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createConversation(userId, title, technique),
      ).rejects.toThrow(
        `Technique ${technique} is not available. Please ensure techniques are seeded.`,
      );
    });
  });

  describe('findConversationById', () => {
    /**
     * Feature: conversation-backend, Property 3: Ownership validation prevents unauthorized access
     * Validates: Requirements 2.1, 3.4, 5.4, 6.3
     */
    it('should prevent unauthorized access for any conversation and non-owner user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.integer().map(() => new Types.ObjectId()),
            ownerId: fc.integer().map(() => new Types.ObjectId()),
            requesterId: fc.integer().map(() => new Types.ObjectId()),
          }),
          async ({ conversationId, ownerId, requesterId }) => {
            // Ensure requester is different from owner
            if (ownerId.toString() === requesterId.toString()) {
              return; // Skip this case
            }

            // Mock conversation exists but owned by different user
            mockConversationModel.findById.mockResolvedValue({
              _id: conversationId,
              technique: 'elenchus',
              title: 'Test Conversation',
              userId: ownerId,
            });

            // Act & Assert - Property 3: Ownership validation prevents unauthorized access
            await expect(
              service.findConversationById(conversationId, requesterId),
            ).rejects.toThrow(ForbiddenException);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return conversation when user owns it', async () => {
      const userId = new Types.ObjectId();
      const conversationId = new Types.ObjectId();

      const mockConversation = {
        _id: conversationId,
        recentMessages: [],
        technique: 'elenchus',
        title: 'Test Conversation',
        totalMessageCount: 0,
        userId,
      };

      mockConversationModel.findById.mockResolvedValue(mockConversation);

      const result = await service.findConversationById(conversationId, userId);

      expect(result).toBeDefined();
      expect(result._id).toEqual(conversationId);
      expect(result.userId).toEqual(userId);
    });

    it('should throw ForbiddenException when user does not own conversation', async () => {
      const ownerId = new Types.ObjectId();
      const requesterId = new Types.ObjectId();
      const conversationId = new Types.ObjectId();

      mockConversationModel.findById.mockResolvedValue({
        _id: conversationId,
        technique: 'elenchus',
        title: 'Test Conversation',
        userId: ownerId,
      });

      await expect(
        service.findConversationById(conversationId, requesterId),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.findConversationById(conversationId, requesterId),
      ).rejects.toThrow(
        'You do not have permission to access this conversation',
      );
    });

    /**
     * Feature: conversation-backend, Property 22: Non-existent resources return 404
     * Validates: Requirements 3.5, 5.5, 6.4
     */
    it('should return 404 for any non-existent conversation ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.integer().map(() => new Types.ObjectId()),
            userId: fc.integer().map(() => new Types.ObjectId()),
          }),
          async ({ conversationId, userId }) => {
            // Mock conversation not found
            mockConversationModel.findById.mockResolvedValue(null);

            // Act & Assert - Property 22: Non-existent resources return 404
            await expect(
              service.findConversationById(conversationId, userId),
            ).rejects.toThrow(NotFoundException);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should throw NotFoundException when conversation does not exist', async () => {
      const userId = new Types.ObjectId();
      const conversationId = new Types.ObjectId();

      mockConversationModel.findById.mockResolvedValue(null);

      await expect(
        service.findConversationById(conversationId, userId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.findConversationById(conversationId, userId),
      ).rejects.toThrow(
        `Conversation with ID ${conversationId.toString()} not found`,
      );
    });
  });

  describe('findUserConversations', () => {
    /**
     * Feature: conversation-backend, Property 14: Conversation listing respects ownership
     * Validates: Requirements 4.1
     */
    it('should return only conversations owned by the requesting user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationCount: fc.integer({ max: 10, min: 1 }),
            otherUserId: fc.integer().map(() => new Types.ObjectId()),
            userId: fc.integer().map(() => new Types.ObjectId()),
          }),
          async ({ conversationCount, otherUserId, userId }) => {
            // Ensure users are different
            if (userId.toString() === otherUserId.toString()) {
              return;
            }

            // Create mock conversations for the user
            const userConversations = Array.from(
              { length: conversationCount },
              (_, i) => ({
                _id: new Types.ObjectId(),
                recentMessages: [],
                technique: 'elenchus',
                title: `User Conversation ${i}`,
                totalMessageCount: 0,
                userId: userId,
              }),
            );

            // Mock find to return only user's conversations
            mockConversationModel.find.mockReturnValue({
              lean: jest.fn().mockResolvedValue(userConversations),
              limit: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              sort: jest.fn().mockReturnThis(),
            });

            mockConversationModel.countDocuments.mockResolvedValue(
              conversationCount,
            );

            // Act
            const result = await service.findUserConversations(userId);

            // Assert - Property 14: Conversation listing respects ownership
            expect(result.data).toHaveLength(conversationCount);
            result.data.forEach((conversation: any) => {
              expect(conversation.userId.toString()).toBe(userId.toString());
            });

            // Verify query was built with userId filter
            expect(mockConversationModel.find).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: expect.any(Types.ObjectId),
              }),
            );
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should return conversations for authenticated user only', async () => {
      const userId = new Types.ObjectId();

      const mockConversations = [
        {
          _id: new Types.ObjectId(),
          technique: 'elenchus',
          title: 'Conversation 1',
          userId,
        },
        {
          _id: new Types.ObjectId(),
          technique: 'dialectic',
          title: 'Conversation 2',
          userId,
        },
      ];

      mockConversationModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockConversations),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
      });

      mockConversationModel.countDocuments.mockResolvedValue(2);

      const result = await service.findUserConversations(userId);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].userId).toEqual(userId);
      expect(result.data[1].userId).toEqual(userId);
    });

    /**
     * Feature: conversation-backend, Property 13: Pagination works correctly
     * Validates: Requirements 3.3, 4.2
     */
    it('should paginate results correctly for any page and limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            limit: fc.integer({ max: 50, min: 1 }),
            page: fc.integer({ max: 5, min: 1 }),
            totalItems: fc.integer({ max: 100, min: 0 }),
            userId: fc.integer().map(() => new Types.ObjectId()),
          }),
          async ({ limit, page, totalItems, userId }) => {
            const skip = (page - 1) * limit;
            const expectedLength = Math.min(
              limit,
              Math.max(0, totalItems - skip),
            );

            // Create mock conversations
            const mockConversations = Array.from(
              { length: expectedLength },
              (_, i) => ({
                _id: new Types.ObjectId(),
                technique: 'elenchus',
                title: `Conversation ${i}`,
                userId,
              }),
            );

            mockConversationModel.find.mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockConversations),
              limit: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              sort: jest.fn().mockReturnThis(),
            });

            mockConversationModel.countDocuments.mockResolvedValue(totalItems);

            // Act
            const result = await service.findUserConversations(
              userId,
              {},
              'updatedAt',
              page,
              limit,
            );

            // Assert - Property 13: Pagination works correctly
            expect(result.data.length).toBeLessThanOrEqual(limit);
            expect(result.meta.page).toBe(page);
            expect(result.meta.limit).toBe(limit);
            expect(result.meta.total).toBe(totalItems);
            expect(result.meta.totalPages).toBe(Math.ceil(totalItems / limit));
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Feature: conversation-backend, Property 15: Filtering works correctly
     * Validates: Requirements 4.3
     */
    it('should filter conversations correctly by technique, tags, isArchived, and isFavorite', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            isArchived: fc.boolean(),
            isFavorite: fc.boolean(),
            tags: fc.array(fc.string({ maxLength: 10, minLength: 1 }), {
              maxLength: 3,
              minLength: 1,
            }),
            technique: fc.constantFrom(
              'elenchus',
              'dialectic',
              'maieutics',
              'definitional',
              'analogical',
              'counterfactual',
            ),
            userId: fc.integer().map(() => new Types.ObjectId()),
          }),
          async ({ isArchived, isFavorite, tags, technique, userId }) => {
            const filters = { isArchived, isFavorite, tags, technique };

            // Create mock conversations matching filters
            const mockConversations = [
              {
                _id: new Types.ObjectId(),
                isArchived,
                isFavorite,
                tags,
                technique,
                title: 'Filtered Conversation',
                userId,
              },
            ];

            mockConversationModel.find.mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockConversations),
              limit: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              sort: jest.fn().mockReturnThis(),
            });

            mockConversationModel.countDocuments.mockResolvedValue(1);

            // Act
            const result = await service.findUserConversations(userId, filters);

            // Assert - Property 15: Filtering works correctly
            expect(mockConversationModel.find).toHaveBeenCalledWith(
              expect.objectContaining({
                isArchived,
                isFavorite,
                tags: { $in: tags },
                technique,
                userId: expect.any(Types.ObjectId),
              }),
            );

            result.data.forEach((conversation: any) => {
              expect(conversation.technique).toBe(technique);
              expect(conversation.isArchived).toBe(isArchived);
              expect(conversation.isFavorite).toBe(isFavorite);
            });
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Feature: conversation-backend, Property 16: Sorting works correctly
     * Validates: Requirements 4.4
     */
    it('should sort conversations correctly by createdAt, updatedAt, or lastMessageAt', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sortField: fc.constantFrom(
              'createdAt',
              'updatedAt',
              'lastMessageAt',
            ),
            userId: fc.integer().map(() => new Types.ObjectId()),
          }),
          async ({ sortField, userId }) => {
            const mockConversations = [
              {
                _id: new Types.ObjectId(),
                technique: 'elenchus',
                title: 'Conversation 1',
                userId,
              },
            ];

            const sortMock = jest.fn().mockReturnThis();
            mockConversationModel.find.mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockConversations),
              limit: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              sort: sortMock,
            });

            mockConversationModel.countDocuments.mockResolvedValue(1);

            // Act
            await service.findUserConversations(userId, {}, sortField as any);

            // Assert - Property 16: Sorting works correctly
            const expectedSortField =
              sortField === 'lastMessageAt'
                ? 'metadata.lastMessageAt'
                : sortField;
            expect(sortMock).toHaveBeenCalledWith({
              [expectedSortField]: -1,
            });
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Feature: conversation-backend, Property 17: Total count is accurate
     * Validates: Requirements 4.5
     */
    it('should return accurate total count for any filter combination', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            limit: fc.integer({ max: 20, min: 1 }),
            page: fc.integer({ max: 5, min: 1 }),
            totalCount: fc.integer({ max: 100, min: 0 }),
            userId: fc.integer().map(() => new Types.ObjectId()),
          }),
          async ({ limit, page, totalCount, userId }) => {
            const skip = (page - 1) * limit;
            const expectedLength = Math.min(
              limit,
              Math.max(0, totalCount - skip),
            );

            const mockConversations = Array.from(
              { length: expectedLength },
              () => ({
                _id: new Types.ObjectId(),
                technique: 'elenchus',
                title: 'Conversation',
                userId,
              }),
            );

            mockConversationModel.find.mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockConversations),
              limit: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              sort: jest.fn().mockReturnThis(),
            });

            mockConversationModel.countDocuments.mockResolvedValue(totalCount);

            // Act
            const result = await service.findUserConversations(
              userId,
              {},
              'updatedAt',
              page,
              limit,
            );

            // Assert - Property 17: Total count is accurate
            expect(result.meta.total).toBe(totalCount);
            expect(result.meta.totalPages).toBe(Math.ceil(totalCount / limit));
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('updateConversation', () => {
    /**
     * Feature: conversation-backend, Property 18: Title validation rejects empty strings
     * Validates: Requirements 5.1
     */
    it('should reject empty or whitespace-only titles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.integer().map(() => new Types.ObjectId()),
            title: fc
              .string({ maxLength: 50 })
              .filter((s) => s.trim().length === 0),
            userId: fc.integer().map(() => new Types.ObjectId()),
          }),
          async ({ conversationId, title, userId }) => {
            // Mock conversation exists and owned by user
            mockConversationModel.findById.mockResolvedValue({
              _id: conversationId,
              technique: 'elenchus',
              title: 'Original Title',
              userId,
            });

            // Act & Assert - Property 18: Title validation rejects empty strings
            await expect(
              service.updateConversation(conversationId, userId, { title }),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Feature: conversation-backend, Property 19: Tags validation enforces array of strings
     * Validates: Requirements 5.2
     */
    it('should reject tags that are not an array of strings', async () => {
      const invalidTags = fc.oneof(
        fc
          .anything()
          .filter((value) => value !== undefined && !Array.isArray(value)),
        fc
          .array(fc.anything(), { maxLength: 5, minLength: 1 })
          .filter((tags) => tags.some((tag) => typeof tag !== 'string')),
      );

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.integer().map(() => new Types.ObjectId()),
            tags: invalidTags,
            userId: fc.integer().map(() => new Types.ObjectId()),
          }),
          async ({ conversationId, tags, userId }) => {
            mockConversationModel.findById.mockResolvedValue({
              _id: conversationId,
              technique: 'elenchus',
              title: 'Test',
              userId,
            });

            await expect(
              service.updateConversation(conversationId, userId, {
                tags: tags as any,
              }),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Feature: conversation-backend, Property 20: Boolean flags accept only booleans
     * Validates: Requirements 5.3
     */
    it('should reject non-boolean values for isFavorite and isArchived', async () => {
      const nonBoolean = fc
        .anything()
        .filter((value) => typeof value !== 'boolean' && value !== undefined);

      const invalidUpdates = fc.oneof(
        nonBoolean.map((isFavorite) => ({ isFavorite })),
        nonBoolean.map((isArchived) => ({ isArchived })),
        fc.tuple(nonBoolean, nonBoolean).map(([isFavorite, isArchived]) => ({
          isArchived,
          isFavorite,
        })),
      );

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.integer().map(() => new Types.ObjectId()),
            updates: invalidUpdates,
            userId: fc.integer().map(() => new Types.ObjectId()),
          }),
          async ({ conversationId, updates, userId }) => {
            mockConversationModel.findById.mockResolvedValue({
              _id: conversationId,
              technique: 'elenchus',
              title: 'Test',
              userId,
            });

            mockTechniqueModel.findOne.mockClear();
            mockConversationModel.findByIdAndUpdate.mockClear();

            await expect(
              service.updateConversation(
                conversationId,
                userId,
                updates as any,
              ),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Feature: conversation-backend, Property 30: Technique switching validates and updates
     * Validates: Requirements 5.4, 5.5
     */
    it('should validate technique and update if valid, reject if invalid', async () => {
      const validTechniques = [
        'elenchus',
        'dialectic',
        'maieutics',
        'definitional',
        'analogical',
        'counterfactual',
      ];

      const techniqueCase = fc.oneof(
        fc.record({
          available: fc.boolean(),
          isValid: fc.constant(true),
          technique: fc.constantFrom(...validTechniques),
        }),
        fc.record({
          available: fc.constant(false),
          isValid: fc.constant(false),
          technique: fc
            .string({ maxLength: 20, minLength: 1 })
            .filter((t) => !validTechniques.includes(t)),
        }),
      );

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.integer().map(() => new Types.ObjectId()),
            scenario: techniqueCase,
            userId: fc.integer().map(() => new Types.ObjectId()),
          }),
          async ({ conversationId, scenario, userId }) => {
            mockConversationModel.findById.mockResolvedValue({
              _id: conversationId,
              technique: 'elenchus',
              title: 'Test',
              userId,
            });

            mockTechniqueModel.findOne.mockClear();
            mockConversationModel.findByIdAndUpdate.mockClear();

            if (scenario.isValid && scenario.available) {
              mockTechniqueModel.findOne.mockResolvedValue({
                isActive: true,
                name: scenario.technique,
                status: 'approved',
              });

              const updatedConversation = {
                _id: conversationId,
                technique: scenario.technique,
                title: 'Test',
                userId,
              };

              mockConversationModel.findByIdAndUpdate.mockResolvedValue(
                updatedConversation as any,
              );

              const result = await service.updateConversation(
                conversationId,
                userId,
                { technique: scenario.technique },
              );

              expect(mockTechniqueModel.findOne).toHaveBeenCalledWith({
                isActive: true,
                name: scenario.technique,
                status: 'approved',
              });
              expect(
                mockConversationModel.findByIdAndUpdate,
              ).toHaveBeenCalledWith(
                conversationId,
                { $set: { technique: scenario.technique } },
                { new: true },
              );
              expect(result.technique).toBe(scenario.technique);
            } else {
              mockTechniqueModel.findOne.mockResolvedValue(
                scenario.isValid ? null : undefined,
              );

              await expect(
                service.updateConversation(conversationId, userId, {
                  technique: scenario.technique,
                }),
              ).rejects.toThrow(BadRequestException);
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should update conversation successfully with valid data', async () => {
      const conversationId = new Types.ObjectId();
      const userId = new Types.ObjectId();

      mockConversationModel.findById.mockResolvedValue({
        _id: conversationId,
        technique: 'elenchus',
        title: 'Original Title',
        userId,
      });

      mockConversationModel.findByIdAndUpdate.mockResolvedValue({
        _id: conversationId,
        isFavorite: true,
        technique: 'elenchus',
        title: 'Updated Title',
        userId,
      });

      const result = await service.updateConversation(conversationId, userId, {
        isFavorite: true,
        title: 'Updated Title',
      });

      expect(result.title).toBe('Updated Title');
      expect(result.isFavorite).toBe(true);
    });
  });

  describe('deleteConversation', () => {
    /**
     * Feature: conversation-backend, Property 21: Conversation deletion cascades
     * Validates: Requirements 6.1, 6.2
     */
    it('should delete conversation and all archived messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            archivedMessageCount: fc.integer({ max: 100, min: 0 }),
            conversationId: fc.integer().map(() => new Types.ObjectId()),
            userId: fc.integer().map(() => new Types.ObjectId()),
          }),
          async ({ archivedMessageCount, conversationId, userId }) => {
            const idString = conversationId.toString();

            // Mock conversation exists and owned by user
            mockConversationModel.findById.mockResolvedValue({
              _id: conversationId,
              technique: 'elenchus',
              title: 'Test',
              userId,
            });

            mockConversationModel.findByIdAndDelete.mockResolvedValue({
              _id: conversationId,
              userId,
            });

            mockArchivedMessageModel.deleteMany.mockResolvedValue({
              deletedCount: archivedMessageCount,
            });

            // Act
            await service.deleteConversation(idString, userId);

            // Assert - Property 21: Conversation deletion cascades
            expect(
              mockConversationModel.findByIdAndDelete,
            ).toHaveBeenCalledWith(idString);
            expect(mockArchivedMessageModel.deleteMany).toHaveBeenCalledWith({
              conversationId: expect.any(Types.ObjectId),
            });
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should delete conversation successfully', async () => {
      const conversationId = new Types.ObjectId();
      const userId = new Types.ObjectId();

      mockConversationModel.findById.mockResolvedValue({
        _id: conversationId,
        technique: 'elenchus',
        title: 'Test',
        userId,
      });

      mockConversationModel.findByIdAndDelete.mockResolvedValue({
        _id: conversationId,
        userId,
      });

      mockArchivedMessageModel.deleteMany.mockResolvedValue({
        deletedCount: 5,
      });

      await service.deleteConversation(conversationId, userId);

      expect(mockConversationModel.findByIdAndDelete).toHaveBeenCalledWith(
        conversationId,
      );
      expect(mockArchivedMessageModel.deleteMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException when conversation does not exist', async () => {
      const conversationId = new Types.ObjectId();
      const userId = new Types.ObjectId();

      mockConversationModel.findById.mockResolvedValue(null);

      await expect(
        service.deleteConversation(conversationId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own conversation', async () => {
      const conversationId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const ownerId = new Types.ObjectId();

      mockConversationModel.findById.mockResolvedValue({
        _id: conversationId,
        technique: 'elenchus',
        title: 'Test',
        userId: ownerId,
      });

      await expect(
        service.deleteConversation(conversationId, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
