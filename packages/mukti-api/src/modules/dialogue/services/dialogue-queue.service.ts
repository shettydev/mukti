import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job, Queue } from 'bullmq';
import { Model, Types } from 'mongoose';

import type { ProblemStructure } from '../../../schemas/canvas-session.schema';
import type { NodeType } from '../../../schemas/node-dialogue.schema';

import {
  CanvasSession,
  CanvasSessionDocument,
} from '../../../schemas/canvas-session.schema';
import {
  UsageEvent,
  UsageEventDocument,
} from '../../../schemas/usage-event.schema';
import { DialogueAIService } from '../dialogue-ai.service';
import { DialogueService } from '../dialogue.service';
import { DialogueStreamService } from './dialogue-stream.service';

/**
 * Job data structure for dialogue request processing.
 */
export interface DialogueRequestJobData {
  message: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: NodeType;
  problemStructure: ProblemStructure;
  sessionId: string;
  subscriptionTier: string;
  userId: string;
}

/**
 * Job result returned on successful completion.
 */
export interface DialogueRequestJobResult {
  assistantMessageId: string;
  cost: number;
  dialogueId: string;
  latency: number;
  tokens: number;
  userMessageId: string;
}

/**
 * Service responsible for managing asynchronous dialogue request processing.
 * Uses BullMQ with Redis backend for priority-based queue management.
 */
@Injectable()
@Processor('dialogue-requests')
export class DialogueQueueService extends WorkerHost {
  private readonly logger = new Logger(DialogueQueueService.name);

  constructor(
    @InjectQueue('dialogue-requests')
    private dialogueRequestsQueue: Queue<
      DialogueRequestJobData,
      DialogueRequestJobResult
    >,
    @InjectModel(CanvasSession.name)
    private canvasSessionModel: Model<CanvasSessionDocument>,
    @InjectModel(UsageEvent.name)
    private usageEventModel: Model<UsageEventDocument>,
    private readonly dialogueAIService: DialogueAIService,
    private readonly dialogueService: DialogueService,
    private readonly dialogueStreamService: DialogueStreamService,
  ) {
    super();
  }

  /**
   * Adds a dialogue request to the BullMQ queue with priority based on subscription tier.
   */
  async enqueueRequest(
    userId: string | Types.ObjectId,
    sessionId: string,
    nodeId: string,
    nodeType: NodeType,
    nodeLabel: string,
    problemStructure: ProblemStructure,
    message: string,
    subscriptionTier: string,
  ): Promise<{ jobId: string; position: number }> {
    const userIdString = this.formatId(userId);

    this.logger.log(
      `Enqueueing dialogue request for user ${userIdString}, session ${sessionId}, node ${nodeId}`,
    );

    try {
      const priority = subscriptionTier === 'paid' ? 10 : 1;

      const jobData: DialogueRequestJobData = {
        message,
        nodeId,
        nodeLabel,
        nodeType,
        problemStructure,
        sessionId,
        subscriptionTier,
        userId: userIdString,
      };

      const job = await this.dialogueRequestsQueue.add(
        'process-dialogue-request',
        jobData,
        { priority },
      );

      let position = 1;
      try {
        const state = await job.getState();
        if (
          state === 'waiting' ||
          state === 'delayed' ||
          state === 'prioritized'
        ) {
          const waitingJobs = await this.dialogueRequestsQueue.getWaiting();
          const foundIndex = waitingJobs.findIndex((j) => j.id === job.id);
          if (foundIndex >= 0) {
            position = foundIndex + 1;
          }
        }
      } catch {
        position = 1;
      }

      this.logger.log(
        `Request enqueued. Job ID: ${job.id}, Position: ${position}, Priority: ${priority}`,
      );

      return { jobId: job.id!, position };
    } catch (error) {
      this.logger.error(
        `Failed to enqueue request: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Retrieves the current status of a job by its ID.
   */
  async getJobStatus(jobId: string): Promise<{
    progress?: unknown;
    result?: DialogueRequestJobResult;
    state: string;
  }> {
    const job = await this.dialogueRequestsQueue.getJob(jobId);

    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    return {
      progress: job.progress,
      result: job.returnvalue,
      state: await job.getState(),
    };
  }

  /**
   * Retrieves queue health metrics.
   */
  async getQueueMetrics(): Promise<{
    active: number;
    completed: number;
    failed: number;
    waiting: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.dialogueRequestsQueue.getWaitingCount(),
      this.dialogueRequestsQueue.getActiveCount(),
      this.dialogueRequestsQueue.getCompletedCount(),
      this.dialogueRequestsQueue.getFailedCount(),
    ]);

    return { active, completed, failed, waiting };
  }

  /**
   * Worker processor that handles dialogue request jobs from the queue.
   */
  async process(
    job: Job<DialogueRequestJobData, DialogueRequestJobResult>,
  ): Promise<DialogueRequestJobResult> {
    const startTime = Date.now();
    const {
      message,
      nodeId,
      nodeLabel,
      nodeType,
      problemStructure,
      sessionId,
      subscriptionTier,
      userId,
    } = job.data;

    this.logger.log(
      `Processing job ${job.id} for user ${userId}, session ${sessionId}, node ${nodeId}`,
    );

    // Get or create dialogue first to have dialogueId for events
    const dialogue = await this.dialogueService.getOrCreateDialogue(
      sessionId,
      nodeId,
      nodeType,
      nodeLabel,
    );
    const dialogueId = dialogue._id.toString();

    try {
      // Emit processing started event
      this.dialogueStreamService.emitToNodeDialogue(
        sessionId,
        nodeId,
        dialogueId,
        {
          data: { jobId: job.id!, status: 'started' },
          type: 'processing',
        },
      );

      // Add user message
      const userMessage = await this.dialogueService.addMessage(
        dialogue._id,
        'user',
        message,
      );

      // Emit user message event
      this.dialogueStreamService.emitToNodeDialogue(
        sessionId,
        nodeId,
        dialogueId,
        {
          data: {
            content: message,
            role: 'user',
            sequence: userMessage.sequence,
            timestamp: userMessage.createdAt.toISOString(),
          },
          type: 'message',
        },
      );

      // Emit progress event
      this.dialogueStreamService.emitToNodeDialogue(
        sessionId,
        nodeId,
        dialogueId,
        {
          data: { jobId: job.id!, status: 'AI is thinking...' },
          type: 'progress',
        },
      );

      // Get conversation history for context
      const historyResult = await this.dialogueService.getMessages(
        dialogue._id,
        {
          limit: 50,
          page: 1,
        },
      );

      // Generate AI response
      const aiResponse = await this.dialogueAIService.generateResponse(
        { nodeId, nodeLabel, nodeType },
        problemStructure,
        historyResult.messages,
        message,
        subscriptionTier,
      );

      // Add AI response to dialogue
      const aiMessage = await this.dialogueService.addMessage(
        dialogue._id,
        'assistant',
        aiResponse.content,
        {
          latencyMs: aiResponse.latencyMs,
          model: aiResponse.model,
          tokens: aiResponse.totalTokens,
        },
      );

      // Emit AI message event
      this.dialogueStreamService.emitToNodeDialogue(
        sessionId,
        nodeId,
        dialogueId,
        {
          data: {
            content: aiResponse.content,
            role: 'assistant',
            sequence: aiMessage.sequence,
            timestamp: aiMessage.createdAt.toISOString(),
            tokens: aiResponse.totalTokens,
          },
          type: 'message',
        },
      );

      // Log usage event
      await this.usageEventModel.create({
        eventType: 'DIALOGUE_MESSAGE',
        metadata: {
          completionTokens: aiResponse.completionTokens,
          cost: aiResponse.cost,
          dialogueId: dialogue._id,
          latencyMs: aiResponse.latencyMs,
          model: aiResponse.model,
          nodeId,
          nodeType,
          promptTokens: aiResponse.promptTokens,
          sessionId: new Types.ObjectId(sessionId),
          tokens: aiResponse.totalTokens,
        },
        timestamp: new Date(),
        userId: new Types.ObjectId(userId),
      });

      const latency = Date.now() - startTime;

      // Emit complete event
      this.dialogueStreamService.emitToNodeDialogue(
        sessionId,
        nodeId,
        dialogueId,
        {
          data: {
            cost: aiResponse.cost,
            jobId: job.id!,
            latency,
            tokens: aiResponse.totalTokens,
          },
          type: 'complete',
        },
      );

      this.logger.log(
        `Job ${job.id} completed in ${latency}ms. Tokens: ${aiResponse.totalTokens}`,
      );

      return {
        assistantMessageId: aiMessage._id.toString(),
        cost: aiResponse.cost,
        dialogueId,
        latency,
        tokens: aiResponse.totalTokens,
        userMessageId: userMessage._id.toString(),
      };
    } catch (error) {
      this.logger.error(
        `Job ${job.id} failed: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );

      // Emit error event
      this.dialogueStreamService.emitToNodeDialogue(
        sessionId,
        nodeId,
        dialogueId,
        {
          data: {
            code: 'PROCESSING_ERROR',
            message: this.getErrorMessage(error),
            retriable: true,
          },
          type: 'error',
        },
      );

      throw error;
    }
  }

  private formatId(id: string | Types.ObjectId): string {
    return typeof id === 'string' ? id : id.toString();
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getErrorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }
}
