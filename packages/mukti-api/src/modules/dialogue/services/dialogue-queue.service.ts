import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job, Queue } from 'bullmq';
import { Model, Types } from 'mongoose';

import type { ProblemStructure } from '../../../schemas/canvas-session.schema';
import type { NodeType } from '../../../schemas/node-dialogue.schema';
import type { DisclosureDescriptor } from '../../data-disclosure/disclosure-descriptor';

import { isLocalMode } from '../../../common/config/local-mode';
import {
  makeInlineJobId,
  runJobInline,
  waitForStreamConnection,
} from '../../../common/queue/inline-runner';
import {
  CanvasSession,
  CanvasSessionDocument,
} from '../../../schemas/canvas-session.schema';
import {
  UsageEvent,
  UsageEventDocument,
} from '../../../schemas/usage-event.schema';
import {
  exchangesFromMessageCount,
  type HelpControl,
} from '../../socratic-turn/help-controls';
import { SocraticTurnEngine } from '../../socratic-turn/socratic-turn.engine';
import { DialogueAIService } from './dialogue-ai.service';
import { DialogueStreamService } from './dialogue-stream.service';
import { DialogueService } from './dialogue.service';

/**
 * Messages of a canvas node's dialogue sent with each turn: the most recent
 * page of its history.
 */
export const CANVAS_DIALOGUE_HISTORY_WINDOW = 50;

/** What a canvas node turn sends to the model (data-flow-disclosure). */
export const CANVAS_NODE_DISCLOSURE: DisclosureDescriptor = {
  historyWindow: CANVAS_DIALOGUE_HISTORY_WINDOW,
  id: 'canvas-node',
  key: 'resolved',
  label: 'Canvas node chat',
  runsIn: ['hosted', 'local'],
  sends: [
    "Mukti's Socratic instructions, with the node's label and type.",
    "The canvas's problem statement, constraints and assumptions.",
    `Up to the last ${CANVAS_DIALOGUE_HISTORY_WINDOW} messages of that node's dialogue, and your new message.`,
  ],
  services: ['DialogueAIService'],
};

/**
 * Job data structure for dialogue request processing.
 */
export interface DialogueRequestJobData {
  /** The learner's help control for this message, if any. */
  helpControl?: HelpControl;
  message: string;
  model: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: NodeType;
  problemStructure: ProblemStructure;
  sessionId: string;
  subscriptionTier: string;
  usedByok: boolean;
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
    private readonly socraticTurnEngine: SocraticTurnEngine,
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
    model: string,
    usedByok: boolean,
    helpControl?: HelpControl,
  ): Promise<{ jobId: string; position: number }> {
    const userIdString = this.formatId(userId);

    this.logger.log(
      `Enqueueing dialogue request for user ${userIdString}, session ${sessionId}, node ${nodeId}`,
    );

    const jobData: DialogueRequestJobData = {
      ...(helpControl ? { helpControl } : {}),
      message,
      model,
      nodeId,
      nodeLabel,
      nodeType,
      problemStructure,
      sessionId,
      subscriptionTier,
      usedByok,
      userId: userIdString,
    };

    // Local mode: process inline with no Redis/BullMQ, preserving the SSE
    // contract via the shared process() path.
    if (isLocalMode()) {
      this.logger.log('Local mode: processing dialogue request inline');
      return this.processInline(jobData);
    }

    try {
      const priority = subscriptionTier === 'paid' ? 10 : 1;

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
      helpControl,
      message,
      model,
      nodeId,
      nodeLabel,
      nodeType,
      problemStructure,
      sessionId,
      subscriptionTier: _subscriptionTier,
      usedByok,
      userId,
    } = job.data;

    this.logger.log(
      `Processing job ${job.id} for user ${userId}, session ${sessionId}, node ${nodeId}`,
    );

    // Get or create dialogue first to have dialogueId for events. Loaded
    // before this turn's user message is stored, so its counts and turn
    // budget describe the dialogue before this exchange.
    const dialogue = await this.dialogueService.getOrCreateDialogue(
      sessionId,
      nodeId,
      nodeType,
      nodeLabel,
      userId,
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
          data: { jobId: job.id!, status: 'Mukti is thinking...' },
          type: 'progress',
        },
      );

      // Get conversation history for context
      const historyResult = await this.dialogueService.getMessages(
        dialogue._id,
        {
          limit: CANVAS_DIALOGUE_HISTORY_WINDOW,
          page: 1,
        },
      );
      const conversationHistory = historyResult.messages.map((m) => ({
        content: m.content,
        role: m.role as 'assistant' | 'user',
        timestamp: m.createdAt,
      }));
      const previousResponseLengths = historyResult.messages
        .filter((m) => m.role === 'user' && m.sequence < userMessage.sequence)
        .map((m) => m.content.trim().length);

      const turn = await this.socraticTurnEngine.prepare({
        conversationHistory,
        exchangesBefore: exchangesFromMessageCount(dialogue.messageCount),
        helpControl,
        model,
        previousResponseLengths,
        state: dialogue,
        timeOnProblem: dialogue.lastMessageAt
          ? Date.now() - dialogue.lastMessageAt.getTime()
          : undefined,
        turnBudget: dialogue.turnBudget,
        usedByok,
        userId,
        userMessage: message,
      });
      const {
        apiKey,
        gapResult,
        model: effectiveModel,
        qualityDirectives,
        scaffoldContext,
      } = turn;

      // RFC-0002: Generate scaffolded AI response
      const aiResponse =
        await this.dialogueAIService.generateScaffoldedResponse(
          { nodeId, nodeLabel, nodeType },
          problemStructure,
          historyResult.messages,
          message,
          effectiveModel,
          apiKey,
          scaffoldContext,
          qualityDirectives,
          turn.responseFormat,
        );

      // RFC-0004: Post-response monitoring
      this.socraticTurnEngine.inspectReply(aiResponse.content, turn.turnKind);

      // Add AI response to dialogue
      const aiMessage = await this.dialogueService.addMessage(
        dialogue._id,
        'assistant',
        aiResponse.content,
        {
          latencyMs: aiResponse.latencyMs,
          model: aiResponse.model,
          tokens: aiResponse.totalTokens,
          turnKind: turn.turnKind,
        },
      );

      const hasPriorAssistantMessage = historyResult.messages.some(
        (m) => m.role === 'assistant' && m.sequence < userMessage.sequence,
      );
      const outcome = await this.socraticTurnEngine.settle(turn, {
        hasPriorAssistantMessage,
      });

      if (outcome.scaffoldUpdate) {
        await this.dialogueService.updateScaffoldState(
          dialogue._id,
          turn.storedLevel,
          outcome.scaffoldUpdate.transition,
          gapResult,
          outcome.scaffoldUpdate.demonstratedUnderstanding,
          outcome.scaffoldUpdate.guard,
        );
      } else {
        this.logger.debug(
          outcome.scaffoldHeld
            ? `Keeping scaffold state for dialogue ${dialogueId} on a ${turn.turnKind} turn`
            : `Skipping response evaluation for dialogue ${dialogueId} because no prior assistant scaffold exists`,
        );
      }

      // RFC-0004: Persist quality state (always, even on first exchange).
      // conclusionOffered records that a wrap-up happened (analytics only).
      await this.dialogueService.updateQualityState(
        dialogue._id,
        outcome.misconception,
        outcome.isBreakthrough,
        turn.turnKind === 'wrap_up',
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
            turnKind: turn.turnKind,
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

      // Emit complete event, with the help state the client shows
      this.dialogueStreamService.emitToNodeDialogue(
        sessionId,
        nodeId,
        dialogueId,
        {
          data: {
            budget: turn.budget,
            conclusionReady: qualityDirectives.conclusionReady ?? false,
            cost: aiResponse.cost,
            jobId: job.id!,
            latency,
            scaffoldLevel: outcome.levelAfter,
            tokens: aiResponse.totalTokens,
            turnKind: turn.turnKind,
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

  /**
   * Processes a dialogue request inline (local mode) instead of enqueuing to
   * BullMQ. Runs the same {@link process} path — so the node-dialogue SSE
   * sequence is identical — deferred via setImmediate, after waiting (bounded)
   * for the client's `sessionId:nodeId` stream so the first event isn't dropped.
   */
  private processInline(jobData: DialogueRequestJobData): {
    jobId: string;
    position: number;
  } {
    return runJobInline({
      jobData,
      makeJobId: () =>
        makeInlineJobId(`${jobData.sessionId}-${jobData.nodeId}`),
      process: (job) =>
        this.process(
          job as Job<DialogueRequestJobData, DialogueRequestJobResult>,
        ),
      waitForConnection: () =>
        waitForStreamConnection(
          () =>
            this.dialogueStreamService.getNodeDialogueConnectionCount(
              jobData.sessionId,
              jobData.nodeId,
            ) > 0,
          {
            label: `node dialogue ${jobData.sessionId}:${jobData.nodeId}`,
            logger: this.logger,
          },
        ),
    });
  }
}
