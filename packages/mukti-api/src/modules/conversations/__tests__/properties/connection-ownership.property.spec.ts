import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { Types } from 'mongoose';

// Mock OpenRouter SDK to prevent ESM import errors in Jest
jest.mock('@openrouter/sdk', () => ({
  OpenRouter: class {},
}));

import { User } from '../../../../schemas/user.schema';
import { AiPolicyService } from '../../../ai/services/ai-policy.service';
import { AiSecretsService } from '../../../ai/services/ai-secrets.service';
import { ConversationController } from '../../conversation.controller';
import { ConversationService } from '../../services/conversation.service';
import { MessageService } from '../../services/message.service';
import { QueueService } from '../../services/queue.service';
import { StreamService } from '../../services/stream.service';

/**
 * Property-Based Tests for SSE Endpoint Authentication
 *
 * Feature: sse-real-time-messages, Connection Ownership
 *
 * For any SSE connection request, the system should only establish a connection
 * if the requesting user owns the conversation.
 */
describe('ConversationController - SSE Authentication (Property-Based)', () => {
  let controller: ConversationController;

  // Mock services
  const mockConversationService = {
    findConversationById: jest.fn(),
  };

  const mockMessageService = {
    getArchivedMessages: jest.fn(),
  };

  const mockQueueService = {
    enqueueRequest: jest.fn(),
  };

  const mockStreamService = {
    addConnection: jest.fn(),
    removeConnection: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationController],
      providers: [
        {
          provide: ConversationService,
          useValue: mockConversationService,
        },
        {
          provide: MessageService,
          useValue: mockMessageService,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: StreamService,
          useValue: mockStreamService,
        },
        {
          provide: getModelToken(User.name),
          useValue: {
            findById: jest.fn(),
            updateOne: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: AiPolicyService,
          useValue: {
            resolveEffectiveModel: jest.fn(),
          },
        },
        {
          provide: AiSecretsService,
          useValue: {
            decryptString: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ConversationController>(ConversationController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Connection Ownership
   *
   * For any SSE connection request, the system should only establish a connection
   * if the requesting user owns the conversation.
   */
  describe('Connection Ownership', () => {
    it('should only establish SSE connection if requesting user owns the conversation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            conversationOwnerId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            requestingUserId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
          }),
          async ({ conversationId, conversationOwnerId, requestingUserId }) => {
            // Create mock user object
            const requestingUser = {
              _id: new Types.ObjectId(requestingUserId),
              email: `user-${requestingUserId}@example.com`,
              name: `User ${requestingUserId}`,
            } as any;

            const isOwner = conversationOwnerId === requestingUserId;

            if (isOwner) {
              // Case 1: User owns the conversation - should succeed
              mockConversationService.findConversationById.mockResolvedValue({
                _id: new Types.ObjectId(conversationId),
                technique: 'elenchus',
                title: 'Test Conversation',
                userId: new Types.ObjectId(conversationOwnerId),
              });

              // Call streamConversation
              const observable = await controller.streamConversation(
                conversationId,
                requestingUser,
              );

              // Verify the observable was created (connection would be established)
              expect(observable).toBeDefined();
              expect(typeof observable.subscribe).toBe('function');

              // Verify findConversationById was called with correct parameters
              expect(
                mockConversationService.findConversationById,
              ).toHaveBeenCalledWith(conversationId, requestingUserId);

              // Subscribe to the observable to trigger connection setup
              const subscription = observable.subscribe({
                error: () => {
                  // Error handler
                },
                next: () => {
                  // Message handler
                },
              });

              // Verify StreamService.addConnection was called
              expect(mockStreamService.addConnection).toHaveBeenCalled();
              const addConnectionCall =
                mockStreamService.addConnection.mock.calls[0];
              expect(addConnectionCall[0]).toBe(conversationId); // conversationId
              expect(addConnectionCall[1]).toBe(requestingUserId); // userId
              expect(typeof addConnectionCall[2]).toBe('string'); // connectionId
              expect(typeof addConnectionCall[3]).toBe('function'); // emit function

              // Clean up subscription
              subscription.unsubscribe();

              // Verify removeConnection was called on unsubscribe
              expect(mockStreamService.removeConnection).toHaveBeenCalled();
            } else {
              // Case 2: User does NOT own the conversation - should throw ForbiddenException
              mockConversationService.findConversationById.mockRejectedValue(
                new ForbiddenException(
                  'You do not have permission to access this conversation',
                ),
              );

              // Attempt to establish SSE connection should throw ForbiddenException
              await expect(
                controller.streamConversation(conversationId, requestingUser),
              ).rejects.toThrow(ForbiddenException);

              // Verify findConversationById was called
              expect(
                mockConversationService.findConversationById,
              ).toHaveBeenCalledWith(conversationId, requestingUserId);

              // Verify StreamService.addConnection was NOT called
              expect(mockStreamService.addConnection).not.toHaveBeenCalled();
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should reject SSE connection for non-existent conversations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            userId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
          }),
          async ({ conversationId, userId }) => {
            const user = {
              _id: new Types.ObjectId(userId),
              email: `user-${userId}@example.com`,
              name: `User ${userId}`,
            } as any;

            // Mock conversation not found
            mockConversationService.findConversationById.mockRejectedValue(
              new NotFoundException(
                `Conversation with ID ${conversationId} not found`,
              ),
            );

            // Attempt to establish SSE connection should throw NotFoundException
            await expect(
              controller.streamConversation(conversationId, user),
            ).rejects.toThrow(NotFoundException);

            // Verify StreamService.addConnection was NOT called
            expect(mockStreamService.addConnection).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should handle multiple ownership validation attempts consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            ownerId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            // Generate 2-5 different user IDs to test with
            testUserIds: fc.array(
              fc
                .string({ maxLength: 24, minLength: 24 })
                .map(() => new Types.ObjectId().toString()),
              { maxLength: 5, minLength: 2 },
            ),
          }),
          async ({ conversationId, ownerId, testUserIds }) => {
            // Ensure owner is in the test set
            const allUserIds = Array.from(new Set([ownerId, ...testUserIds]));

            for (const userId of allUserIds) {
              const user = {
                _id: new Types.ObjectId(userId),
                email: `user-${userId}@example.com`,
                name: `User ${userId}`,
              } as any;

              const isOwner = userId === ownerId;

              if (isOwner) {
                // Owner should be able to establish connection
                mockConversationService.findConversationById.mockResolvedValue({
                  _id: new Types.ObjectId(conversationId),
                  technique: 'elenchus',
                  title: 'Test Conversation',
                  userId: new Types.ObjectId(ownerId),
                });

                const observable = await controller.streamConversation(
                  conversationId,
                  user,
                );

                expect(observable).toBeDefined();

                // Subscribe and immediately unsubscribe
                const subscription = observable.subscribe();
                subscription.unsubscribe();
              } else {
                // Non-owner should be rejected
                mockConversationService.findConversationById.mockRejectedValue(
                  new ForbiddenException(
                    'You do not have permission to access this conversation',
                  ),
                );

                await expect(
                  controller.streamConversation(conversationId, user),
                ).rejects.toThrow(ForbiddenException);

                // Verify connection was not established
                const addConnectionCalls =
                  mockStreamService.addConnection.mock.calls.filter(
                    (call) => call[1] === userId,
                  );
                expect(addConnectionCalls.length).toBe(0);
              }

              // Clear mocks for next iteration
              jest.clearAllMocks();
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should validate ownership before any connection setup', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            nonOwnerId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            ownerId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
          }),
          async ({ conversationId, nonOwnerId, ownerId }) => {
            // Ensure owner and non-owner are different
            if (ownerId === nonOwnerId) {
              return; // Skip this test case
            }

            const nonOwner = {
              _id: new Types.ObjectId(nonOwnerId),
              email: `user-${nonOwnerId}@example.com`,
              name: `User ${nonOwnerId}`,
            } as any;

            // Mock ownership validation failure
            mockConversationService.findConversationById.mockRejectedValue(
              new ForbiddenException(
                'You do not have permission to access this conversation',
              ),
            );

            // Attempt to establish connection
            await expect(
              controller.streamConversation(conversationId, nonOwner),
            ).rejects.toThrow(ForbiddenException);

            // Critical assertion: StreamService.addConnection should NEVER be called
            // when ownership validation fails
            expect(mockStreamService.addConnection).not.toHaveBeenCalled();

            // Verify findConversationById was called BEFORE any connection setup
            expect(
              mockConversationService.findConversationById,
            ).toHaveBeenCalledWith(conversationId, nonOwnerId);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
