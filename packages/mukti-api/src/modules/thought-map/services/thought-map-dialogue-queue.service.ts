import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Job, Queue } from 'bullmq';
import { Model, Types } from 'mongoose';

import type { NodeType } from '../../../schemas/node-dialogue.schema';

import {
  DialogueMessage,
  DialogueMessageDocument,
} from '../../../schemas/dialogue-message.schema';
import {
  NodeDialogue,
  NodeDialogueDocument,
} from '../../../schemas/node-dialogue.schema';
import {
  ThoughtNode,
  ThoughtNodeDocument,
} from '../../../schemas/thought-node.schema';
import {
  UsageEvent,
  UsageEventDocument,
} from '../../../schemas/usage-event.schema';
import { User, UserDocument } from '../../../schemas/user.schema';
import { AiPolicyService } from '../../ai/services/ai-policy.service';
import { AiSecretsService } from '../../ai/services/ai-secrets.service';
import { DialogueAIService } from '../../dialogue/services/dialogue-ai.service';
import { DialogueStreamService } from '../../dialogue/services/dialogue-stream.service';
import { DialogueService } from '../../dialogue/services/dialogue.service';
import {
  buildThoughtMapSystemPrompt,
  selectTechniqueForNode,
  type ThoughtMapNodeTechniqueContext,
} from '../../dialogue/utils/prompt-builder';
import {
  type GapDetectionResult,
  type ScaffoldContext,
  ScaffoldLevel,
} from '../../scaffolding/interfaces/scaffolding.interface';
import { KnowledgeGapDetectorService } from '../../scaffolding/services/knowledge-gap-detector.service';
import { ResponseEvaluatorService } from '../../scaffolding/services/response-evaluator.service';
import { ScaffoldFadeService } from '../../scaffolding/services/scaffold-fade.service';

/**
 * Job data for a Thought Map dialogue request.
 */
export interface ThoughtMapDialogueJobData {
  /** Depth of this node in the map tree */
  depth: number;
  /** Whether the node was created from an AI suggestion */
  fromSuggestion: boolean;
  mapId: string;
  message: string;
  model: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: NodeType;
  /** Parent node type for technique selection */
  parentType?: NodeType;
  /** Number of siblings (same-parent nodes) for technique selection */
  siblings: number;
  subscriptionTier: string;
  usedByok: boolean;
  userId: string;
}

/**
 * Job result for a Thought Map dialogue request.
 */
export interface ThoughtMapDialogueJobResult {
  assistantMessageId: string;
  cost: number;
  dialogueId: string;
  latency: number;
  tokens: number;
  userMessageId: string;
}

/**
 * SSE stream key prefix for Thought Map dialogues.
 * Uses `map:{mapId}` as the "sessionId" component to avoid collisions with canvas sessions.
 */
const mapStreamKey = (mapId: string): string => `map:${mapId}`;

/**
 * Queue service for processing Thought Map node dialogue requests asynchronously.
 *
 * @remarks
 * Uses a dedicated queue (`thought-map-dialogue-requests`) separate from the canvas
 * dialogue queue. Reuses `DialogueAIService`, `DialogueStreamService`, and gap-detection
 * services from `DialogueModule`, but queries `NodeDialogue` by `{ mapId, nodeId }`
 * instead of `{ sessionId, nodeId }`.
 */
@Injectable()
@Processor('thought-map-dialogue-requests')
export class ThoughtMapDialogueQueueService extends WorkerHost {
  private readonly logger = new Logger(ThoughtMapDialogueQueueService.name);

  constructor(
    @InjectQueue('thought-map-dialogue-requests')
    private readonly thoughtMapDialogueQueue: Queue<
      ThoughtMapDialogueJobData,
      ThoughtMapDialogueJobResult
    >,
    @InjectModel(NodeDialogue.name)
    private readonly nodeDialogueModel: Model<NodeDialogueDocument>,
    @InjectModel(DialogueMessage.name)
    private readonly dialogueMessageModel: Model<DialogueMessageDocument>,
    @InjectModel(ThoughtNode.name)
    private readonly thoughtNodeModel: Model<ThoughtNodeDocument>,
    @InjectModel(UsageEvent.name)
    private readonly usageEventModel: Model<UsageEventDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly aiPolicyService: AiPolicyService,
    private readonly aiSecretsService: AiSecretsService,
    private readonly dialogueAIService: DialogueAIService,
    private readonly dialogueService: DialogueService,
    private readonly dialogueStreamService: DialogueStreamService,
    private readonly knowledgeGapDetector: KnowledgeGapDetectorService,
    private readonly scaffoldFadeService: ScaffoldFadeService,
    private readonly responseEvaluator: ResponseEvaluatorService,
  ) {
    super();
  }

  /**
   * Enqueues a Thought Map dialogue request for asynchronous AI processing.
   *
   * @param userId - The requesting user
   * @param mapId - The Thought Map ID
   * @param nodeId - The node identifier (e.g., 'thought-0')
   * @param nodeType - The node type
   * @param nodeLabel - The node's visible text label
   * @param depth - Tree depth of this node
   * @param fromSuggestion - Whether promoted from AI ghost suggestion
   * @param siblings - Number of sibling nodes (for technique selection)
   * @param parentType - Parent node type (for technique selection)
   * @param message - The user's message text
   * @param subscriptionTier - Used for queue priority
   * @param model - OpenRouter model ID
   * @param usedByok - Whether to use the user's own API key
   * @returns Job ID and queue position
   */
  async enqueueMapNodeRequest(
    userId: string | Types.ObjectId,
    mapId: string,
    nodeId: string,
    nodeType: NodeType,
    nodeLabel: string,
    depth: number,
    fromSuggestion: boolean,
    siblings: number,
    parentType: NodeType | undefined,
    message: string,
    subscriptionTier: string,
    model: string,
    usedByok: boolean,
  ): Promise<{ jobId: string; position: number }> {
    const userIdString = userId.toString();
    this.logger.log(
      `Enqueueing ThoughtMap dialogue request: user=${userIdString}, map=${mapId}, node=${nodeId}`,
    );

    const priority = subscriptionTier === 'paid' ? 10 : 1;

    const jobData: ThoughtMapDialogueJobData = {
      depth,
      fromSuggestion,
      mapId,
      message,
      model,
      nodeId,
      nodeLabel,
      nodeType,
      parentType,
      siblings,
      subscriptionTier,
      usedByok,
      userId: userIdString,
    };

    const job = await this.thoughtMapDialogueQueue.add(
      'process-thought-map-dialogue',
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
        const waitingJobs = await this.thoughtMapDialogueQueue.getWaiting();
        const idx = waitingJobs.findIndex((j) => j.id === job.id);
        if (idx >= 0) {
          position = idx + 1;
        }
      }
    } catch {
      position = 1;
    }

    this.logger.log(
      `ThoughtMap dialogue job enqueued. ID=${job.id}, position=${position}`,
    );
    return { jobId: job.id!, position };
  }

  /**
   * Finds an existing NodeDialogue for a Thought Map node without creating one.
   * Returns null if no dialogue exists yet.
   *
   * @param mapId - The Thought Map ID
   * @param nodeId - The node identifier
   */
  async findMapDialogue(
    mapId: string,
    nodeId: string,
  ): Promise<NodeDialogueDocument | null> {
    return this.nodeDialogueModel.findOne({
      mapId: new Types.ObjectId(mapId),
      nodeId,
    });
  }

  /**
   * Gets or creates a NodeDialogue scoped to a Thought Map node.
   * Queries by `{ mapId, nodeId }` — no sessionId involved.
   */
  async getOrCreateMapDialogue(
    mapId: string,
    nodeId: string,
    nodeType: NodeType,
    nodeLabel: string,
  ): Promise<NodeDialogue> {
    const mapObjectId = new Types.ObjectId(mapId);
    const dialogue = await this.nodeDialogueModel.findOneAndUpdate(
      {
        mapId: mapObjectId,
        nodeId,
      },
      {
        $setOnInsert: {
          mapId: mapObjectId,
          messageCount: 0,
          nodeId,
          nodeLabel,
          nodeType,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );
    if (!dialogue) {
      throw new Error(
        `Failed to upsert NodeDialogue for map=${mapId}, node=${nodeId}`,
      );
    }

    return dialogue;
  }

  /**
   * Worker that processes a Thought Map dialogue job from the queue.
   */
  async process(
    job: Job<ThoughtMapDialogueJobData, ThoughtMapDialogueJobResult>,
  ): Promise<ThoughtMapDialogueJobResult> {
    const startTime = Date.now();
    const {
      depth,
      fromSuggestion,
      mapId,
      message,
      model,
      nodeId,
      nodeLabel,
      nodeType,
      parentType,
      siblings,
      usedByok,
      userId,
    } = job.data;

    this.logger.log(
      `Processing ThoughtMap job ${job.id}: user=${userId}, map=${mapId}, node=${nodeId}`,
    );

    const streamKey = mapStreamKey(mapId);
    const dialogue = await this.getOrCreateMapDialogue(
      mapId,
      nodeId,
      nodeType,
      nodeLabel,
    );
    const dialogueId = dialogue._id.toString();

    try {
      // Emit processing started
      this.dialogueStreamService.emitToNodeDialogue(
        streamKey,
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

      // Mark the ThoughtNode as explored on first user message
      await this.thoughtNodeModel.updateOne(
        { mapId: new Types.ObjectId(mapId), nodeId },
        { $set: { isExplored: true } },
      );

      this.dialogueStreamService.emitToNodeDialogue(
        streamKey,
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

      this.dialogueStreamService.emitToNodeDialogue(
        streamKey,
        nodeId,
        dialogueId,
        {
          data: { jobId: job.id!, status: 'Mukti is thinking...' },
          type: 'progress',
        },
      );

      // Retrieve conversation history
      const historyResult = await this.dialogueService.getMessages(
        dialogue._id,
        {
          limit: 50,
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

      const effectiveModel = this.validateEffectiveModel(model, usedByok);
      const apiKey = await this.resolveApiKey(userId, usedByok);

      // RFC-0001: Detect knowledge gaps
      const gapResult: GapDetectionResult =
        await this.knowledgeGapDetector.analyze({
          aiApiKey: apiKey,
          aiModel: effectiveModel,
          conceptContext: dialogue.detectedConcepts,
          conversationHistory,
          previousResponseLengths,
          timeOnProblem: dialogue.lastMessageAt
            ? Date.now() - dialogue.lastMessageAt.getTime()
            : undefined,
          userId,
          userMessage: message,
        });

      // RFC-0002: Build scaffold context
      const storedLevel =
        dialogue.currentScaffoldLevel ?? ScaffoldLevel.PURE_SOCRATIC;
      const effectiveLevel = Math.max(
        gapResult.scaffoldLevel,
        storedLevel,
      ) as ScaffoldLevel;

      const scaffoldContext: ScaffoldContext = {
        conceptContext: gapResult.detectedConcepts,
        consecutiveFailures: dialogue.consecutiveFailures ?? 0,
        consecutiveSuccesses: dialogue.consecutiveSuccesses ?? 0,
        level: effectiveLevel,
        rootGap: gapResult.rootGap ?? undefined,
      };

      // Select technique via RFC §5.1.1 algorithm
      const techniqueCtx: ThoughtMapNodeTechniqueContext = {
        depth,
        fromSuggestion,
        parentType,
        siblings,
        type: nodeType,
      };
      const technique = selectTechniqueForNode(techniqueCtx);

      // Fetch map title for system prompt context
      const mapTitle = await this.resolveMapTitle(mapId, nodeId);

      // Build the ThoughtMap-specific system prompt (not canvas problem structure)
      const systemPrompt = buildThoughtMapSystemPrompt(
        { nodeId, nodeLabel, nodeType },
        mapTitle,
        technique,
      );

      // Generate AI response using the raw OpenRouter method via DialogueAIService
      // We pass a synthetic ProblemStructure shaped so the scaffold augment works
      const aiResponse =
        await this.dialogueAIService.generateScaffoldedResponseWithPrompt(
          systemPrompt,
          historyResult.messages,
          message,
          effectiveModel,
          apiKey,
          scaffoldContext,
        );

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

      // RFC-0002: Evaluate user response quality if prior assistant message exists
      const hasPriorAssistantMessage = historyResult.messages.some(
        (m) => m.role === 'assistant' && m.sequence < userMessage.sequence,
      );

      if (hasPriorAssistantMessage) {
        const responseQuality = this.responseEvaluator.evaluate({
          conceptKeywords:
            dialogue.detectedConcepts ?? gapResult.detectedConcepts,
          scaffoldLevel: storedLevel as number,
          userResponse: message,
        });

        const fadeState = {
          consecutiveFailures: dialogue.consecutiveFailures ?? 0,
          consecutiveSuccesses: dialogue.consecutiveSuccesses ?? 0,
          currentLevel: storedLevel as number,
          transitionHistory: [],
        };
        const transition = this.scaffoldFadeService.evaluateAndTransition(
          fadeState,
          responseQuality.quality,
        );

        const demonstratedUnderstanding =
          responseQuality.quality.demonstratesUnderstanding;

        // RFC-0001: Update per-user knowledge state
        const conceptsToUpdate = new Set(gapResult.detectedConcepts);
        if (gapResult.rootGap) {
          conceptsToUpdate.add(gapResult.rootGap);
        }

        if (conceptsToUpdate.size > 0) {
          await Promise.all(
            Array.from(conceptsToUpdate).map((conceptId) =>
              this.knowledgeGapDetector.updateKnowledgeState(
                userId,
                conceptId,
                demonstratedUnderstanding,
              ),
            ),
          );
        }

        await this.dialogueService.updateScaffoldState(
          dialogue._id,
          fadeState.currentLevel,
          transition,
          gapResult,
          demonstratedUnderstanding,
        );
      }

      this.dialogueStreamService.emitToNodeDialogue(
        streamKey,
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

      // Log usage event (no sessionId for Thought Map)
      await this.usageEventModel.create({
        eventType: 'THOUGHT_MAP_DIALOGUE_MESSAGE',
        metadata: {
          completionTokens: aiResponse.completionTokens,
          cost: aiResponse.cost,
          dialogueId: dialogue._id,
          latencyMs: aiResponse.latencyMs,
          mapId: new Types.ObjectId(mapId),
          model: aiResponse.model,
          nodeId,
          nodeType,
          promptTokens: aiResponse.promptTokens,
          tokens: aiResponse.totalTokens,
        },
        timestamp: new Date(),
        userId: new Types.ObjectId(userId),
      });

      const latency = Date.now() - startTime;

      this.dialogueStreamService.emitToNodeDialogue(
        streamKey,
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
        `ThoughtMap dialogue job ${job.id} completed in ${latency}ms`,
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
        `ThoughtMap dialogue job ${job.id} failed: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );

      this.dialogueStreamService.emitToNodeDialogue(
        streamKey,
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
   * Resolves the map title from the root topic node for use in system prompts.
   * Falls back to nodeId if the root node cannot be found.
   */
  private async resolveMapTitle(
    mapId: string,
    _nodeId: string,
  ): Promise<string> {
    const rootNode = await this.thoughtNodeModel
      .findOne({ depth: 0, mapId: new Types.ObjectId(mapId), type: 'topic' })
      .lean();
    return rootNode?.label ?? 'Unknown topic';
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
