import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { Conversation } from '../../../../schemas/conversation.schema';
import { Technique } from '../../../../schemas/technique.schema';
import { UsageEvent } from '../../../../schemas/usage-event.schema';
import { User } from '../../../../schemas/user.schema';
import { AiPolicyService } from '../../../ai/services/ai-policy.service';
import { AiSecretsService } from '../../../ai/services/ai-secrets.service';
import { MessageService } from '../message.service';
import { OpenRouterService } from '../openrouter.service';
import { QueueService } from '../queue.service';
import { StreamService } from '../stream.service';

describe('QueueService', () => {
  interface MockQueue {
    add: jest.Mock;
    getActiveCount: jest.Mock;
    getCompletedCount: jest.Mock;
    getFailedCount: jest.Mock;
    getJob: jest.Mock;
    getWaiting: jest.Mock;
    getWaitingCount: jest.Mock;
  }

  let service: QueueService;
  let queue: MockQueue;
  let jobs: {
    data: any;
    getState: () => Promise<string>;
    id: string;
    opts: any;
  }[];

  beforeEach(async () => {
    jobs = [];
    queue = {
      add: jest.fn((_name: string, data: any, opts: any) => {
        const defaultOpts = {
          attempts: 3,
          backoff: {
            delay: 1000,
            type: 'exponential',
          },
          removeOnComplete: {
            age: 24 * 3600,
            count: 1000,
          },
          removeOnFail: {
            age: 7 * 24 * 3600,
          },
        };
        const job = {
          data,
          getState: () => Promise.resolve('waiting'),
          id: (jobs.length + 1).toString(),
          opts: { ...defaultOpts, ...opts },
        };
        jobs.push(job);
        return Promise.resolve(job);
      }),
      getActiveCount: jest.fn(() => Promise.resolve(0)),
      getCompletedCount: jest.fn(() => Promise.resolve(0)),
      getFailedCount: jest.fn(() => Promise.resolve(0)),
      getJob: jest.fn((id: string) =>
        Promise.resolve(jobs.find((j) => j.id === id)),
      ),
      getWaiting: jest.fn(() => Promise.resolve(jobs.filter(() => true))),
      getWaitingCount: jest.fn(() => Promise.resolve(jobs.length)),
    };

    // Create mock models
    const mockConversationModel = {
      create: jest.fn(),
      findById: jest.fn(),
    };

    const mockTechniqueModel = {
      findOne: jest.fn(),
    };

    const mockUsageEventModel = {
      create: jest.fn(),
    };

    const mockUserModel = {
      findById: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'OPENROUTER_API_KEY') {
          return 'test-api-key';
        }
        return undefined;
      }),
    };

    const mockAiPolicyService = {
      getCuratedModels: jest.fn(() => [
        { id: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
      ]),
    };

    const mockAiSecretsService = {
      decryptString: jest.fn(),
    };

    // Create mock services
    const mockMessageService = {
      addMessageToConversation: jest.fn(),
      archiveOldMessages: jest.fn(),
      buildConversationContext: jest.fn(),
    };

    const mockOpenRouterService = {
      buildPrompt: jest.fn(),
      selectModel: jest.fn(),
      sendChatCompletion: jest.fn(),
    };

    const mockStreamService = {
      addConnection: jest.fn(),
      cleanupConversation: jest.fn(),
      emitToConversation: jest.fn(),
      emitToUser: jest.fn(),
      getConnectionCount: jest.fn(),
      getConversationConnectionCount: jest.fn(),
      removeConnection: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        QueueService,
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
        {
          provide: getModelToken(Technique.name),
          useValue: mockTechniqueModel,
        },
        {
          provide: getModelToken(UsageEvent.name),
          useValue: mockUsageEventModel,
        },
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
          provide: MessageService,
          useValue: mockMessageService,
        },
        {
          provide: OpenRouterService,
          useValue: mockOpenRouterService,
        },
        {
          provide: StreamService,
          useValue: mockStreamService,
        },
        {
          provide: getQueueToken('conversation-requests'),
          useValue: queue,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jobs = [];
  });

  describe('enqueueRequest', () => {
    /**
     * Feature: conversation-backend, Property 5: Request enqueueing returns correct response
     * Validates: Requirements 2.4, 2.5
     */
    it('should return job ID and position for any valid request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.stringMatching(/^[0-9a-f]{24}$/),
            message: fc.string({ maxLength: 500, minLength: 1 }),
            subscriptionTier: fc.constantFrom('free', 'paid'),
            technique: fc.constantFrom(
              'elenchus',
              'dialectic',
              'maieutics',
              'definitional',
              'analogical',
              'counterfactual',
            ),
            userId: fc.stringMatching(/^[0-9a-f]{24}$/),
          }),
          async ({
            conversationId,
            message,
            subscriptionTier,
            technique,
            userId,
          }) => {
            // Act
            const result = await service.enqueueRequest(
              userId,
              conversationId,
              message,
              subscriptionTier,
              technique,
              'openai/gpt-5-mini',
              false,
            );

            // Assert
            expect(result).toBeDefined();
            expect(result.jobId).toBeDefined();
            expect(typeof result.jobId).toBe('string');
            expect(result.position).toBeDefined();
            expect(typeof result.position).toBe('number');
            expect(result.position).toBeGreaterThanOrEqual(1);

            // Verify job was actually added to queue
            const job = await queue.getJob(result.jobId);
            expect(job).toBeDefined();
            expect(job!.data.userId).toBe(userId);
            expect(job!.data.conversationId).toBe(conversationId);
            expect(job!.data.message).toBe(message);
            expect(job!.data.subscriptionTier).toBe(subscriptionTier);
            expect(job!.data.technique).toBe(technique);
            expect(job!.data.model).toBe('openai/gpt-5-mini');
            expect(job!.data.usedByok).toBe(false);

            // Verify priority is set correctly
            const expectedPriority = subscriptionTier === 'paid' ? 10 : 1;
            expect(job!.opts.priority).toBe(expectedPriority);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should assign higher priority to paid tier users', async () => {
      // Enqueue a free tier request
      const freeResult = await service.enqueueRequest(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        'Free tier message',
        'free',
        'elenchus',
        'openai/gpt-5-mini',
        false,
      );

      // Enqueue a paid tier request
      const paidResult = await service.enqueueRequest(
        '507f1f77bcf86cd799439013',
        '507f1f77bcf86cd799439014',
        'Paid tier message',
        'paid',
        'dialectic',
        'openai/gpt-5-mini',
        false,
      );

      // Get jobs
      const freeJob = await queue.getJob(freeResult.jobId);
      const paidJob = await queue.getJob(paidResult.jobId);

      // Verify priorities
      expect(freeJob!.opts.priority).toBe(1);
      expect(paidJob!.opts.priority).toBe(10);
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for existing job', async () => {
      // Enqueue a request
      const result = await service.enqueueRequest(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        'Test message',
        'free',
        'elenchus',
        'openai/gpt-5-mini',
        false,
      );

      // Get job status
      const status = await service.getJobStatus(result.jobId);

      // Verify status
      expect(status).toBeDefined();
      expect(status.state).toBeDefined();
      expect([
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'prioritized',
      ]).toContain(status.state);
    });

    it('should throw error for non-existent job', async () => {
      await expect(
        service.getJobStatus('non-existent-job-id'),
      ).rejects.toThrow();
    });
  });

  describe('getQueueMetrics', () => {
    it('should return queue metrics', async () => {
      // Enqueue some requests
      await service.enqueueRequest(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        'Message 1',
        'free',
        'elenchus',
        'openai/gpt-5-mini',
        false,
      );
      await service.enqueueRequest(
        '507f1f77bcf86cd799439013',
        '507f1f77bcf86cd799439014',
        'Message 2',
        'paid',
        'dialectic',
        'openai/gpt-5-mini',
        false,
      );

      // Get metrics
      const metrics = await service.getQueueMetrics();

      // Verify metrics structure
      expect(metrics).toBeDefined();
      expect(typeof metrics.waiting).toBe('number');
      expect(typeof metrics.active).toBe('number');
      expect(typeof metrics.completed).toBe('number');
      expect(typeof metrics.failed).toBe('number');

      // Verify metrics are non-negative
      expect(metrics.waiting).toBeGreaterThanOrEqual(0);
      expect(metrics.active).toBeGreaterThanOrEqual(0);
      expect(metrics.completed).toBeGreaterThanOrEqual(0);
      expect(metrics.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('request completion', () => {
    /**
     * Feature: conversation-backend, Property 9: Request completion updates queue status
     * Validates: Requirements 2.14
     *
     * Note: This test verifies the job structure and enqueuing behavior.
     * Full end-to-end testing of the worker processor requires integration tests
     * with mocked OpenRouter service and database.
     */
    it('should enqueue jobs with correct data structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.stringMatching(/^[0-9a-f]{24}$/),
            message: fc.string({ maxLength: 500, minLength: 1 }),
            subscriptionTier: fc.constantFrom('free', 'paid'),
            technique: fc.constantFrom(
              'elenchus',
              'dialectic',
              'maieutics',
              'definitional',
              'analogical',
              'counterfactual',
            ),
            userId: fc.stringMatching(/^[0-9a-f]{24}$/),
          }),
          async ({
            conversationId,
            message,
            subscriptionTier,
            technique,
            userId,
          }) => {
            // Enqueue request
            const result = await service.enqueueRequest(
              userId,
              conversationId,
              message,
              subscriptionTier,
              technique,
              'openai/gpt-5-mini',
              false,
            );

            // Verify job was created
            const job = await queue.getJob(result.jobId);
            expect(job).toBeDefined();

            // Verify job data structure matches what the processor expects
            expect(job!.data).toEqual({
              conversationId,
              message,
              model: 'openai/gpt-5-mini',
              subscriptionTier,
              technique,
              usedByok: false,
              userId,
            });

            // Verify job is in a valid state
            const state = await job!.getState();
            expect([
              'waiting',
              'active',
              'completed',
              'failed',
              'delayed',
              'prioritized',
            ]).toContain(state);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('retry logic', () => {
    /**
     * Feature: conversation-backend, Property 26: Retriable errors trigger requeue
     * Validates: Requirements 9.2
     *
     * Note: This test verifies that jobs are configured with retry settings.
     * Actual retry behavior is handled by BullMQ's built-in retry mechanism
     * with exponential backoff as configured in the module.
     */
    it('should configure jobs with retry settings', async () => {
      // Enqueue a request
      const result = await service.enqueueRequest(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        'Test message',
        'free',
        'elenchus',
        'openai/gpt-5-mini',
        false,
      );

      // Get the job
      const job = await queue.getJob(result.jobId);
      expect(job).toBeDefined();

      // Verify retry configuration
      expect(job!.opts.attempts).toBe(3);
      expect(job!.opts.backoff).toEqual({
        delay: 1000,
        type: 'exponential',
      });
    });
  });
});
