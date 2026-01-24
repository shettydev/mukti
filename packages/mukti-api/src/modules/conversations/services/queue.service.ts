import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Job, Queue } from 'bullmq';
import { Model, Types } from 'mongoose';

import {
  Conversation,
  ConversationDocument,
} from '../../../schemas/conversation.schema';
import {
  Technique,
  TechniqueDocument,
} from '../../../schemas/technique.schema';
import {
  UsageEvent,
  UsageEventDocument,
} from '../../../schemas/usage-event.schema';
import { User, UserDocument } from '../../../schemas/user.schema';
import { AiPolicyService } from '../../ai/services/ai-policy.service';
import { AiSecretsService } from '../../ai/services/ai-secrets.service';
import { MessageService } from './message.service';
import { OpenRouterService } from './openrouter.service';
import { StreamService } from './stream.service';

/**
 * Job data structure for conversation request processing in BullMQ.
 */
export interface ConversationRequestJobData {
  conversationId: string;
  message: string;
  model: string;
  subscriptionTier: string;
  technique: string;
  usedByok: boolean;
  userId: string;
}

/**
 * Job result returned on successful completion.
 */
export interface ConversationRequestJobResult {
  cost: number;
  latency: number;
  messageId: string;
  tokens: number;
}

/**
 * Service responsible for managing asynchronous conversation request processing.
 * Uses BullMQ with Redis backend for priority-based queue management.
 *
 * @remarks
 * This service implements asynchronous request processing with:
 * - Priority-based queuing (paid tier: 10, free tier: 1)
 * - Automatic retry with exponential backoff
 * - Job status tracking and monitoring
 * - Queue health metrics
 * - Worker processor for handling queued requests
 */
@Injectable()
@Processor('conversation-requests')
export class QueueService extends WorkerHost {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('conversation-requests')
    private conversationRequestsQueue: Queue<
      ConversationRequestJobData,
      ConversationRequestJobResult
    >,
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Technique.name)
    private techniqueModel: Model<TechniqueDocument>,
    @InjectModel(UsageEvent.name)
    private usageEventModel: Model<UsageEventDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly aiPolicyService: AiPolicyService,
    private readonly aiSecretsService: AiSecretsService,
    private readonly messageService: MessageService,
    private readonly openRouterService: OpenRouterService,
    private readonly streamService: StreamService,
  ) {
    super();
    this.setupEventListeners();
  }

  /**
   * Adds a conversation request to the BullMQ queue with priority based on subscription tier.
   *
   * @param userId - The ID of the user making the request
   * @param conversationId - The ID of the conversation
   * @param message - The user's message content
   * @param subscriptionTier - The user's subscription tier (free/paid)
   * @param technique - The Socratic technique being used
   * @returns Object containing job ID and current queue position
   *
   * @remarks
   * Priority levels:
   * - Paid tier: Priority 10 (higher priority)
   * - Free tier: Priority 1 (lower priority)
   *
   * Jobs are processed FIFO within the same priority level.
   *
   * @example
   * ```typescript
   * const result = await queueService.enqueueRequest(
   *   new Types.ObjectId('507f1f77bcf86cd799439011'),
   *   new Types.ObjectId('507f1f77bcf86cd799439012'),
   *   'How can I optimize React performance?',
   *   'paid',
   *   'elenchus'
   * );
   * console.log(result); // { jobId: 'job-123', position: 5 }
   * ```
   */
  async enqueueRequest(
    userId: string | Types.ObjectId,
    conversationId: string | Types.ObjectId,
    message: string,
    subscriptionTier: string,
    technique: string,
    model: string,
    usedByok: boolean,
  ): Promise<{ jobId: string; position: number }> {
    const userIdString = this.formatId(userId);
    const conversationIdString = this.formatId(conversationId);

    this.logger.log(
      `Enqueueing request for user ${userIdString}, conversation ${conversationIdString}, tier: ${subscriptionTier}`,
    );

    try {
      // Determine priority based on subscription tier
      const priority = subscriptionTier === 'paid' ? 10 : 1;

      // Create job data
      const jobData: ConversationRequestJobData = {
        conversationId: conversationIdString,
        message,
        model,
        subscriptionTier,
        technique,
        usedByok,
        userId: userIdString,
      };

      // Add job to queue with priority
      const job = await this.conversationRequestsQueue.add(
        'process-conversation-request',
        jobData,
        {
          priority,
        },
      );

      // Get current queue position
      // For waiting jobs, we can get the position in the queue
      // For other states, position is 1 (being processed or already processed)
      let position = 1;
      try {
        const state = await job.getState();
        if (
          state === 'waiting' ||
          state === 'delayed' ||
          state === 'prioritized'
        ) {
          // Get waiting jobs and find position
          const waitingJobs = await this.conversationRequestsQueue.getWaiting();
          const foundIndex = waitingJobs.findIndex((j) => j.id === job.id);
          if (foundIndex >= 0) {
            position = foundIndex + 1;
          }
        }
        // For active/completed/failed jobs, position remains 1 (or could be 0 to indicate "not in queue")
      } catch {
        // If we can't get position, default to 1
        position = 1;
      }

      this.logger.log(
        `Request enqueued successfully. Job ID: ${job.id}, Position: ${position}, Priority: ${priority}`,
      );

      return {
        jobId: job.id!,
        position,
      };
    } catch (error) {
      this.logger.error(
        `Failed to enqueue request for user ${userIdString}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Retrieves the current status of a job by its ID.
   *
   * @param jobId - The unique job identifier
   * @returns Object containing job state and optional progress information
   *
   * @remarks
   * Job states:
   * - waiting: Job is in queue, not yet processed
   * - active: Job is currently being processed
   * - completed: Job finished successfully
   * - failed: Job failed after all retries
   * - delayed: Job is scheduled for future processing
   *
   * @example
   * ```typescript
   * const status = await queueService.getJobStatus('job-123');
   * console.log(status);
   * // {
   * //   state: 'completed',
   * //   progress: undefined,
   * //   result: { messageId: '...', tokens: 200, cost: 0.0004, latency: 1200 }
   * // }
   * ```
   */
  async getJobStatus(jobId: string): Promise<{
    progress?: unknown;
    result?: ConversationRequestJobResult;
    state: string;
  }> {
    this.logger.log(`Getting status for job ${jobId}`);

    try {
      const job = await this.conversationRequestsQueue.getJob(jobId);

      if (!job) {
        this.logger.warn(`Job ${jobId} not found`);
        throw new Error(`Job with ID ${jobId} not found`);
      }

      // Get job state
      const state = await job.getState();

      // Get progress if available
      const progress = job.progress;

      // Get result if completed
      const result = job.returnvalue;

      this.logger.log(`Job ${jobId} status: ${state}`);

      return {
        progress,
        result,
        state,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get status for job ${jobId}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Retrieves queue health metrics including job counts by state.
   *
   * @returns Object containing counts for waiting, active, completed, and failed jobs
   *
   * @remarks
   * This method provides insights into queue health and performance:
   * - waiting: Jobs in queue waiting to be processed
   * - active: Jobs currently being processed by workers
   * - completed: Successfully completed jobs (within retention period)
   * - failed: Failed jobs (within retention period)
   *
   * @example
   * ```typescript
   * const metrics = await queueService.getQueueMetrics();
   * console.log(metrics);
   * // {
   * //   waiting: 15,
   * //   active: 5,
   * //   completed: 1234,
   * //   failed: 12
   * // }
   * ```
   */
  async getQueueMetrics(): Promise<{
    active: number;
    completed: number;
    failed: number;
    waiting: number;
  }> {
    this.logger.log('Retrieving queue metrics');

    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.conversationRequestsQueue.getWaitingCount(),
        this.conversationRequestsQueue.getActiveCount(),
        this.conversationRequestsQueue.getCompletedCount(),
        this.conversationRequestsQueue.getFailedCount(),
      ]);

      const metrics = {
        active,
        completed,
        failed,
        waiting,
      };

      this.logger.log(`Queue metrics: ${JSON.stringify(metrics)}`);

      return metrics;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve queue metrics: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Called when a job completes successfully.
   * This is a BullMQ WorkerHost lifecycle hook.
   */
  onCompleted(
    job: Job<ConversationRequestJobData, ConversationRequestJobResult>,
    result: ConversationRequestJobResult,
  ): void {
    this.logger.log(
      `Job ${job.id} completed successfully. Result: ${JSON.stringify(result)}`,
    );
  }

  /**
   * Called when a job fails after all retries.
   * This is a BullMQ WorkerHost lifecycle hook.
   */
  onFailed(
    job:
      | Job<ConversationRequestJobData, ConversationRequestJobResult>
      | undefined,
    error: Error,
  ): void {
    if (job) {
      this.logger.error(
        `Job ${job.id} failed after all retries. Error: ${error.message}`,
        error.stack,
      );
    } else {
      this.logger.error(
        `Job failed after all retries. Error: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Worker processor that handles conversation request jobs from the queue.
   * This method is automatically called by BullMQ when a job is ready to be processed.
   *
   * @param job - The BullMQ job containing conversation request data
   * @returns Job result with messageId, tokens, cost, and latency
   *
   * @remarks
   * Processing workflow:
   * 1. Load conversation context (conversation + technique template)
   * 2. Build AI prompt using MessageService
   * 3. Call OpenRouterService to get AI response
   * 4. Add user message and AI response to conversation
   * 5. Archive messages if threshold exceeded
   * 6. Log usage event
   * 7. Return job result
   *
   * Error handling:
   * - Catches and logs all errors
   * - Throws errors to trigger BullMQ retry mechanism
   * - BullMQ automatically retries with exponential backoff
   * - After max attempts, job moves to failed state
   */
  async process(
    job: Job<ConversationRequestJobData, ConversationRequestJobResult>,
  ): Promise<ConversationRequestJobResult> {
    const startTime = Date.now();
    const {
      conversationId,
      message,
      model,
      subscriptionTier: _subscriptionTier,
      technique,
      usedByok,
      userId,
    } = job.data;

    this.logger.log(
      `Processing job ${job.id} for user ${userId}, conversation ${conversationId}`,
    );

    try {
      // Emit processing started event
      this.streamService.emitToConversation(conversationId, {
        data: {
          jobId: job.id!,
          status: 'started',
        },
        type: 'processing',
      });

      // 1. Load conversation context
      const conversation =
        await this.conversationModel.findById(conversationId);

      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Load technique template
      const techniqueDoc = await this.techniqueModel.findOne({
        isActive: true,
        name: technique,
        status: 'approved',
      });

      if (!techniqueDoc) {
        throw new Error(`Technique ${technique} not found or not approved`);
      }

      // 2. Build conversation context
      const context = this.messageService.buildConversationContext(
        conversation,
        techniqueDoc.template,
      );

      // Emit progress event - building prompt
      this.streamService.emitToConversation(conversationId, {
        data: {
          jobId: job.id!,
          status: 'Building prompt...',
        },
        type: 'progress',
      });

      // 3. Build prompt and call OpenRouter
      const effectiveModel = this.validateEffectiveModel(model, usedByok);
      const apiKey = await this.resolveApiKey(userId, usedByok);
      const messages = this.openRouterService.buildPrompt(
        techniqueDoc.template,
        context.messages.map((m) => ({
          content: m.content,
          role: m.role as 'assistant' | 'system' | 'user',
          timestamp: new Date(),
        })),
        message,
      );

      // Emit progress event - calling AI
      this.streamService.emitToConversation(conversationId, {
        data: {
          jobId: job.id!,
          status: 'AI is thinking...',
        },
        type: 'progress',
      });

      const response = await this.openRouterService.sendChatCompletion(
        messages,
        effectiveModel,
        apiKey,
        techniqueDoc.template,
      );

      // 4. Add messages to conversation
      const updatedConversation =
        await this.messageService.addMessageToConversation(
          conversationId,
          message,
          response.content,
          {
            completionTokens: response.completionTokens,
            cost: response.cost,
            latencyMs: Date.now() - startTime,
            model: response.model,
            promptTokens: response.promptTokens,
            totalTokens: response.totalTokens,
          },
        );

      // Get the sequence numbers for the messages
      const userMessageSequence = updatedConversation.recentMessages.length - 1;
      const assistantMessageSequence =
        updatedConversation.recentMessages.length;

      // Emit message event for user message
      this.streamService.emitToConversation(conversationId, {
        data: {
          content: message,
          role: 'user',
          sequence: userMessageSequence,
          timestamp: new Date().toISOString(),
        },
        type: 'message',
      });

      // Emit message event for AI response
      this.streamService.emitToConversation(conversationId, {
        data: {
          content: response.content,
          role: 'assistant',
          sequence: assistantMessageSequence,
          timestamp: new Date().toISOString(),
          tokens: response.totalTokens,
        },
        type: 'message',
      });

      // 5. Archive if needed
      if (updatedConversation.recentMessages.length > 50) {
        await this.messageService.archiveOldMessages(conversationId);
      }

      // 6. Log usage event
      await this.usageEventModel.create({
        eventType: 'QUESTION',
        metadata: {
          completionTokens: response.completionTokens,
          conversationId: new Types.ObjectId(conversationId),
          cost: response.cost,
          latencyMs: Date.now() - startTime,
          model: response.model,
          promptTokens: response.promptTokens,
          technique,
          tokens: response.totalTokens,
        },
        timestamp: new Date(),
        userId: new Types.ObjectId(userId),
      });

      const latency = Date.now() - startTime;

      this.logger.log(
        `Job ${job.id} completed successfully in ${latency}ms. Tokens: ${response.totalTokens}, Cost: ${response.cost}`,
      );

      // Emit complete event
      this.streamService.emitToConversation(conversationId, {
        data: {
          cost: response.cost,
          jobId: job.id!,
          latency,
          tokens: response.totalTokens,
        },
        type: 'complete',
      });

      // 7. Return job result
      return {
        cost: response.cost,
        latency,
        messageId: updatedConversation._id.toString(),
        tokens: response.totalTokens,
      };
    } catch (error) {
      this.logger.error(
        `Job ${job.id} failed: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );

      // Emit error event
      this.streamService.emitToConversation(conversationId, {
        data: {
          code: 'PROCESSING_ERROR',
          message: this.getErrorMessage(error),
          retriable: true,
        },
        type: 'error',
      });

      // Throw error to trigger BullMQ retry mechanism
      throw error;
    }
  }

  private formatId(id: string | Types.ObjectId): string {
    return typeof id === 'string' ? id : id.toString();
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private getErrorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }

  private async resolveApiKey(
    userId: string,
    usedByok: boolean,
  ): Promise<string> {
    if (usedByok) {
      const user = await this.userModel
        .findById(userId)
        .select('+openRouterApiKeyEncrypted')
        .lean();

      if (!user?.openRouterApiKeyEncrypted) {
        throw new Error('OPENROUTER_KEY_MISSING');
      }

      return this.aiSecretsService.decryptString(
        user.openRouterApiKeyEncrypted,
      );
    }

    const serverKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ?? '';

    if (!serverKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    return serverKey;
  }

  /**
   * Sets up event listeners for job lifecycle events.
   * Listens to 'completed' and 'failed' events to log job outcomes.
   *
   * @remarks
   * Event listeners provide visibility into job processing:
   * - 'completed': Logs successful job completion (via onCompleted hook)
   * - 'failed': Logs job failure after all retries exhausted (via onFailed hook)
   *
   * Note: BullMQ workers use lifecycle hooks rather than queue events.
   * The actual event handling is done through the WorkerHost lifecycle methods.
   */
  private setupEventListeners(): void {
    this.logger.log(
      'Job event listeners configured via WorkerHost lifecycle hooks',
    );
  }

  private validateEffectiveModel(model: string, usedByok: boolean): string {
    const trimmed = model.trim();

    if (!trimmed) {
      throw new Error('Model is required');
    }

    if (!usedByok) {
      const isCurated = this.aiPolicyService
        .getCuratedModels()
        .some((allowed) => allowed.id === trimmed);

      if (!isCurated) {
        throw new Error('MODEL_NOT_ALLOWED');
      }
    }

    return trimmed;
  }
}
