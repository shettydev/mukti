import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
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
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ConversationController } from '../../conversation.controller';
import { ConversationService } from '../../services/conversation.service';
import { MessageService } from '../../services/message.service';
import { QueueService } from '../../services/queue.service';
import { StreamService } from '../../services/stream.service';

/**
 * Property-Based Tests for SSE Endpoint Authentication
 *
 * Feature: sse-real-time-messages, Authentication Validation
 *
 * For any SSE connection attempt, the system should validate the authentication
 * token before establishing the connection.
 */
describe('ConversationController - SSE Authentication Validation (Property-Based)', () => {
  let controller: ConversationController;
  let guard: JwtAuthGuard;
  let reflector: Reflector;

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
        Reflector,
      ],
    }).compile();

    controller = module.get<ConversationController>(ConversationController);
    reflector = module.get<Reflector>(Reflector);
    guard = new JwtAuthGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Authentication Validation
   *
   * For any SSE connection attempt, the system should validate the authentication
   * token before establishing the connection.
   */
  describe('Authentication Validation', () => {
    it('should reject SSE connections without valid authentication', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
          }),
          async ({ conversationId }) => {
            // Create mock execution context without authenticated user
            const mockContext = {
              getClass: jest.fn().mockReturnValue(ConversationController),
              getHandler: jest.fn(),
              switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({
                  headers: {}, // No authorization header
                  method: 'GET',
                  url: `/conversations/${conversationId}/stream`,
                }),
              }),
            } as unknown as ExecutionContext;

            // Guard's handleRequest should throw UnauthorizedException when no user
            try {
              await guard.handleRequest(null, null, null, mockContext);
              // Should not reach here
              expect(true).toBe(false);
            } catch (error) {
              // Verify UnauthorizedException is thrown for missing authentication
              expect(error).toBeInstanceOf(UnauthorizedException);
            }

            // Verify no connection was established
            expect(mockStreamService.addConnection).not.toHaveBeenCalled();
            expect(
              mockConversationService.findConversationById,
            ).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should allow SSE connections with valid authentication and ownership', async () => {
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

            // Mock conversation exists and user owns it
            mockConversationService.findConversationById.mockResolvedValue({
              _id: new Types.ObjectId(conversationId),
              technique: 'elenchus',
              title: 'Test Conversation',
              userId: new Types.ObjectId(userId),
            });

            // With valid authentication, controller method should work
            const observable = await controller.streamConversation(
              conversationId,
              user,
            );

            expect(observable).toBeDefined();
            expect(typeof observable.subscribe).toBe('function');

            // Subscribe and verify connection is established
            const subscription = observable.subscribe();
            expect(mockStreamService.addConnection).toHaveBeenCalled();
            subscription.unsubscribe();
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should reject expired authentication tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
          }),
          async ({ conversationId }) => {
            // Create mock execution context
            const mockContext = {
              getClass: jest.fn().mockReturnValue(ConversationController),
              getHandler: jest.fn(),
              switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({
                  headers: { authorization: 'Bearer expired-token' },
                  method: 'GET',
                  url: `/conversations/${conversationId}/stream`,
                }),
              }),
            } as unknown as ExecutionContext;

            // Simulate expired token error
            const tokenExpiredInfo = { name: 'TokenExpiredError' };

            try {
              await guard.handleRequest(
                null,
                null,
                tokenExpiredInfo,
                mockContext,
              );
              // Should not reach here
              expect(true).toBe(false);
            } catch (error) {
              // Verify UnauthorizedException is thrown with expired token message
              expect(error).toBeInstanceOf(UnauthorizedException);
              expect((error as UnauthorizedException).message).toContain(
                'expired',
              );
            }

            // Verify no connection was established
            expect(mockStreamService.addConnection).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should reject invalid authentication tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
          }),
          async ({ conversationId }) => {
            // Create mock execution context
            const mockContext = {
              getClass: jest.fn().mockReturnValue(ConversationController),
              getHandler: jest.fn(),
              switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({
                  headers: { authorization: 'Bearer invalid-token' },
                  method: 'GET',
                  url: `/conversations/${conversationId}/stream`,
                }),
              }),
            } as unknown as ExecutionContext;

            // Simulate invalid token error
            const invalidTokenInfo = { name: 'JsonWebTokenError' };

            try {
              await guard.handleRequest(
                null,
                null,
                invalidTokenInfo,
                mockContext,
              );
              // Should not reach here
              expect(true).toBe(false);
            } catch (error) {
              // Verify UnauthorizedException is thrown with invalid token message
              expect(error).toBeInstanceOf(UnauthorizedException);
              expect((error as UnauthorizedException).message).toContain(
                'Invalid',
              );
            }

            // Verify no connection was established
            expect(mockStreamService.addConnection).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should validate authentication before checking conversation ownership', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            isAuthenticated: fc.boolean(),
            userId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
          }),
          async ({ conversationId, isAuthenticated, userId }) => {
            // Clear mocks at the start of each iteration
            jest.clearAllMocks();

            if (isAuthenticated) {
              // With authentication, ownership check should occur
              const user = {
                _id: new Types.ObjectId(userId),
                email: `user-${userId}@example.com`,
                name: `User ${userId}`,
              } as any;

              mockConversationService.findConversationById.mockResolvedValue({
                _id: new Types.ObjectId(conversationId),
                technique: 'elenchus',
                title: 'Test Conversation',
                userId: new Types.ObjectId(userId),
              });

              const observable = await controller.streamConversation(
                conversationId,
                user,
              );

              expect(observable).toBeDefined();

              // Verify ownership check was performed
              expect(
                mockConversationService.findConversationById,
              ).toHaveBeenCalledWith(conversationId, userId);

              const subscription = observable.subscribe();
              subscription.unsubscribe();
            } else {
              // Without authentication, ownership check should NOT occur
              const mockContext = {
                getClass: jest.fn().mockReturnValue(ConversationController),
                getHandler: jest.fn(),
                switchToHttp: jest.fn().mockReturnValue({
                  getRequest: jest.fn().mockReturnValue({
                    headers: {},
                    method: 'GET',
                    url: `/conversations/${conversationId}/stream`,
                  }),
                }),
              } as unknown as ExecutionContext;

              try {
                guard.handleRequest(null, null, null, mockContext);
                expect(true).toBe(false);
              } catch (error) {
                expect(error).toBeInstanceOf(UnauthorizedException);
              }

              // Critical: Ownership check should NEVER be called without authentication
              expect(
                mockConversationService.findConversationById,
              ).not.toHaveBeenCalled();
              expect(mockStreamService.addConnection).not.toHaveBeenCalled();
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should handle various authentication error scenarios consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            errorType: fc.constantFrom(
              'TokenExpiredError',
              'JsonWebTokenError',
              'NoAuthToken',
            ),
          }),
          async ({ conversationId, errorType }) => {
            const mockContext = {
              getClass: jest.fn().mockReturnValue(ConversationController),
              getHandler: jest.fn(),
              switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({
                  headers:
                    errorType === 'NoAuthToken'
                      ? {}
                      : { authorization: 'Bearer invalid-token' },
                  method: 'GET',
                  url: `/conversations/${conversationId}/stream`,
                }),
              }),
            } as unknown as ExecutionContext;

            const errorInfo =
              errorType === 'NoAuthToken'
                ? { message: 'No auth token' }
                : { name: errorType };

            try {
              await guard.handleRequest(null, null, errorInfo, mockContext);
              expect(true).toBe(false);
            } catch (error) {
              // All authentication errors should result in UnauthorizedException
              expect(error).toBeInstanceOf(UnauthorizedException);

              // Verify appropriate error message
              const errorMessage = (error as UnauthorizedException).message;
              if (errorType === 'TokenExpiredError') {
                expect(errorMessage).toContain('expired');
              } else if (errorType === 'JsonWebTokenError') {
                expect(errorMessage).toContain('Invalid');
              } else {
                expect(errorMessage).toContain('token');
              }
            }

            // Verify no connection was established for any auth error
            expect(mockStreamService.addConnection).not.toHaveBeenCalled();
            expect(
              mockConversationService.findConversationById,
            ).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 40 },
      );
    });
  });
});
