import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Job, Queue } from 'bullmq';
import { Model, Types } from 'mongoose';

import {
  Conversation,
  ConversationDocument,
  RecentMessage,
} from '../../../schemas/conversation.schema';
import {
  ThoughtMap,
  ThoughtMapDocument,
} from '../../../schemas/thought-map.schema';
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

// ============================================================================
// AI extraction types
// ============================================================================

/**
 * Union of all extraction SSE event payloads.
 *
 * SSE sequence: processing → preview → complete | error
 */
export type ExtractionStreamEvent =
  | {
      /** The full draft ThoughtMap + nodes ready for client review */
      data: {
        map: ThoughtMap;
        nodes: ThoughtNode[];
      };
      type: 'preview';
    }
  | {
      data: { code: string; message: string; retriable: boolean };
      type: 'error';
    }
  | {
      data: { jobId: string; mapId: string; nodeCount: number };
      type: 'complete';
    }
  | {
      data: { jobId: string; status: 'started' };
      type: 'processing';
    };

/**
 * Job data for a map extraction request.
 */
export interface MapExtractionJobData {
  conversationId: string;
  /** OpenRouter model ID */
  model: string;
  subscriptionTier: string;
  usedByok: boolean;
  userId: string;
}

/**
 * Job result for a map extraction request.
 */
export interface MapExtractionJobResult {
  conversationId: string;
  mapId: string;
  nodeCount: number;
}

// ============================================================================
// Job interfaces
// ============================================================================

/**
 * A top-level branch theme extracted from the conversation.
 */
interface ExtractedBranch {
  label: string;
  /** Indices into the recentMessages array that support this branch */
  sourceMessageIndices: number[];
  subPoints: ExtractedSubPoint[];
}

/**
 * A single sub-point extracted under a branch theme.
 */
interface ExtractedSubPoint {
  label: string;
  /** Indices into the recentMessages array that support this sub-point */
  sourceMessageIndices: number[];
}

// ============================================================================
// SSE stream types
// ============================================================================

/**
 * The full extraction result returned by the AI.
 */
interface ExtractionResult {
  branches: ExtractedBranch[];
  centralTopic: string;
  unresolvedQuestions: string[];
}

/**
 * An active SSE listener registered for an extraction job.
 */
interface ExtractionStreamConnection {
  connectionId: string;
  emitFn: (event: ExtractionStreamEvent) => void;
  jobId: string;
}

// ============================================================================
// Service
// ============================================================================

/**
 * Queue service for processing conversation → Thought Map extraction requests.
 *
 * @remarks
 * Uses a dedicated `thought-map-extraction-requests` BullMQ queue.
 * Maintains its own SSE connection map keyed by jobId.
 *
 * SSE events emitted per job:
 *   processing → preview (full draft map JSON) → complete | error
 *
 * Maps created by extraction start with `status: "draft"` and
 * `sourceConversationId` set. The confirm endpoint transitions to "active".
 */
@Injectable()
@Processor('thought-map-extraction-requests')
export class MapExtractionService extends WorkerHost {
  /** Active SSE connections keyed by jobId */
  private readonly connections = new Map<
    string,
    ExtractionStreamConnection[]
  >();

  private readonly logger = new Logger(MapExtractionService.name);

  constructor(
    @InjectQueue('thought-map-extraction-requests')
    private readonly extractionQueue: Queue<
      MapExtractionJobData,
      MapExtractionJobResult
    >,
    @InjectModel(ThoughtMap.name)
    private readonly thoughtMapModel: Model<ThoughtMapDocument>,
    @InjectModel(ThoughtNode.name)
    private readonly thoughtNodeModel: Model<ThoughtNodeDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(UsageEvent.name)
    private readonly usageEventModel: Model<UsageEventDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly aiPolicyService: AiPolicyService,
    private readonly aiSecretsService: AiSecretsService,
  ) {
    super();
  }

  // ============================================================================
  // SSE connection management
  // ============================================================================

  /**
   * Registers a client SSE connection for an extraction job stream.
   *
   * @param jobId - BullMQ job ID
   * @param connectionId - Unique connection identifier
   * @param emitFn - Callback to push events to the client
   * @returns Cleanup function to call on disconnect
   */
  addConnection(
    jobId: string,
    connectionId: string,
    emitFn: (event: ExtractionStreamEvent) => void,
  ): () => void {
    const connection: ExtractionStreamConnection = {
      connectionId,
      emitFn,
      jobId,
    };

    const existing = this.connections.get(jobId) ?? [];
    existing.push(connection);
    this.connections.set(jobId, existing);

    this.logger.log(
      `Extraction SSE connection added: jobId=${jobId} (connectionId=${connectionId})`,
    );

    return () => {
      this.removeConnection(jobId, connectionId);
    };
  }

  /**
   * Enqueues a map extraction request.
   *
   * @param userId - The requesting user
   * @param conversationId - The conversation to extract from
   * @param model - OpenRouter model ID
   * @param usedByok - Whether to use the user's own API key
   * @param subscriptionTier - Used for queue priority
   * @returns Job ID and queue position
   */
  async enqueueExtraction(
    userId: string | Types.ObjectId,
    conversationId: string,
    model: string,
    usedByok: boolean,
    subscriptionTier: string,
  ): Promise<{ jobId: string; position: number }> {
    const userIdString = userId.toString();
    this.logger.log(
      `Enqueueing map extraction: user=${userIdString}, conversation=${conversationId}`,
    );

    const priority = subscriptionTier === 'paid' ? 10 : 1;

    const jobData: MapExtractionJobData = {
      conversationId,
      model,
      subscriptionTier,
      usedByok,
      userId: userIdString,
    };

    const job = await this.extractionQueue.add(
      'process-map-extraction',
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
        const waitingJobs = await this.extractionQueue.getWaiting();
        const idx = waitingJobs.findIndex((j) => j.id === job.id);
        if (idx >= 0) {
          position = idx + 1;
        }
      }
    } catch {
      position = 1;
    }

    this.logger.log(
      `Map extraction job enqueued. ID=${job.id}, position=${position}`,
    );
    return { jobId: job.id!, position };
  }

  async getExtractionJob(
    jobId: string,
  ): Promise<Job<MapExtractionJobData, MapExtractionJobResult> | null> {
    const job = await this.extractionQueue.getJob(jobId);
    return job ?? null;
  }

  // ============================================================================
  // Queue processor
  // ============================================================================

  /**
   * Processes a map extraction job from the queue.
   */
  async process(
    job: Job<MapExtractionJobData, MapExtractionJobResult>,
  ): Promise<MapExtractionJobResult> {
    const { conversationId, model, usedByok, userId } = job.data;

    this.logger.log(
      `Processing extraction job ${job.id}: user=${userId}, conversation=${conversationId}`,
    );

    try {
      this.emit(job.id!, {
        data: { jobId: job.id!, status: 'started' },
        type: 'processing',
      });

      // Load the conversation
      const conversation = await this.conversationModel
        .findOne({
          _id: new Types.ObjectId(conversationId),
          userId: new Types.ObjectId(userId),
        })
        .lean();

      if (!conversation) {
        throw new Error(
          `Conversation ${conversationId} not found or access denied`,
        );
      }

      const apiKey = await this.resolveApiKey(userId, usedByok);
      const effectiveModel = this.validateEffectiveModel(model, usedByok);

      // Extract the map structure from the conversation
      const extraction = await this.extractMapFromConversation(
        conversation.recentMessages,
        conversation.title,
        effectiveModel,
        apiKey,
      );

      // Persist the draft ThoughtMap + nodes
      const { map, nodes } = await this.persistDraftMap(
        userId,
        conversationId,
        extraction,
      );

      // Record usage
      await this.usageEventModel.create({
        eventType: 'THOUGHT_MAP_EXTRACTION',
        metadata: {
          conversationId: new Types.ObjectId(conversationId),
          mapId: map._id,
          model: effectiveModel,
          nodeCount: nodes.length,
        },
        timestamp: new Date(),
        userId: new Types.ObjectId(userId),
      });

      // Send preview event with the full draft map
      this.emit(job.id!, {
        data: { map, nodes },
        type: 'preview',
      });

      const nodeCount = nodes.length;

      this.emit(job.id!, {
        data: { jobId: job.id!, mapId: map._id.toString(), nodeCount },
        type: 'complete',
      });

      this.logger.log(
        `Extraction job ${job.id} completed: mapId=${map._id.toString()}, nodes=${nodeCount}`,
      );

      return {
        conversationId,
        mapId: map._id.toString(),
        nodeCount,
      };
    } catch (error) {
      this.logger.error(
        `Extraction job ${job.id} failed: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );

      this.emit(job.id!, {
        data: {
          code: 'EXTRACTION_ERROR',
          message: this.getErrorMessage(error),
          retriable: true,
        },
        type: 'error',
      });

      throw error;
    }
  }

  /**
   * Removes a specific SSE connection.
   */
  removeConnection(jobId: string, connectionId: string): void {
    const existing = this.connections.get(jobId) ?? [];
    const filtered = existing.filter((c) => c.connectionId !== connectionId);

    if (filtered.length === 0) {
      this.connections.delete(jobId);
    } else {
      this.connections.set(jobId, filtered);
    }
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private buildExtractionPrompt(
    messages: RecentMessage[],
    conversationTitle: string,
  ): string {
    const messageContext = messages
      .map(
        (m, i) =>
          `[${i}] ${m.role.toUpperCase()}: ${this.sanitizeLabel(m.content)}`,
      )
      .join('\n');

    return [
      'You are Mukti, a Socratic thinking assistant. Analyze the following conversation and extract a structured Thought Map.',
      '',
      `Conversation title: "${this.sanitizeLabel(conversationTitle)}"`,
      '',
      'Conversation messages:',
      messageContext,
      '',
      'Extract a Thought Map with the following structure:',
      '- centralTopic: The main question or theme of the conversation (concise, ≤ 100 chars)',
      '- branches: 3–7 key themes or ideas discussed (each ≤ 80 chars)',
      '  - Each branch has sub-points: 1–4 deeper observations or questions (each ≤ 80 chars)',
      '  - Sub-points and branches must be phrased as questions or insights — never conclusions',
      '  - Include sourceMessageIndices: array of message indices [0-based] that support each item',
      '- unresolvedQuestions: 1–3 open questions that were not resolved in the conversation',
      '',
      'Rules:',
      '- Maximum 3 levels deep (centralTopic → branch → sub-point)',
      '- All suggestions must be questions, never direct answers (Socratic philosophy)',
      '- Keep labels concise and thought-provoking',
      '- Do NOT summarize or conclude — surface tensions and open threads',
      '',
      'Respond with a JSON object matching this exact schema:',
      '{',
      '  "centralTopic": "string",',
      '  "branches": [',
      '    {',
      '      "label": "string",',
      '      "sourceMessageIndices": [number],',
      '      "subPoints": [',
      '        { "label": "string", "sourceMessageIndices": [number] }',
      '      ]',
      '    }',
      '  ],',
      '  "unresolvedQuestions": ["string"]',
      '}',
      '',
      'Return ONLY the JSON object, no other text.',
    ].join('\n');
  }

  private emit(jobId: string, event: ExtractionStreamEvent): void {
    const conns = this.connections.get(jobId) ?? [];

    if (conns.length === 0) {
      this.logger.debug(`No extraction SSE connections for jobId=${jobId}`);
      return;
    }

    for (const conn of conns) {
      try {
        conn.emitFn(event);
      } catch (err) {
        this.logger.warn(
          `Failed to emit extraction event to connection ${conn.connectionId}: ${this.getErrorMessage(err)}`,
        );
      }
    }
  }

  private async extractMapFromConversation(
    messages: RecentMessage[],
    conversationTitle: string,
    model: string,
    apiKey: string,
  ): Promise<ExtractionResult> {
    const prompt = this.buildExtractionPrompt(messages, conversationTitle);

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        body: JSON.stringify({
          messages: [
            { content: prompt, role: 'system' },
            { content: 'Extract the Thought Map now.', role: 'user' },
          ],
          model,
          temperature: 0.3,
        }),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://mukti.chat',
          'X-Title': 'Mukti Thought Map Extraction',
        },
        method: 'POST',
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const content = data.choices[0]?.message?.content ?? '{}';
    return this.parseExtractionResult(content);
  }

  private fallbackExtraction(conversationTitle: string): ExtractionResult {
    return {
      branches: [
        {
          label: 'What are the core assumptions here?',
          sourceMessageIndices: [],
          subPoints: [
            {
              label: 'Which assumptions are most worth challenging?',
              sourceMessageIndices: [],
            },
          ],
        },
        {
          label: 'What evidence was presented?',
          sourceMessageIndices: [],
          subPoints: [
            {
              label: 'What would stronger evidence look like?',
              sourceMessageIndices: [],
            },
          ],
        },
      ],
      centralTopic: this.sanitizeLabel(conversationTitle),
      unresolvedQuestions: ['What remains unresolved from this conversation?'],
    };
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getErrorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }

  private parseExtractionResult(content: string): ExtractionResult {
    try {
      const cleaned = content.replace(/```(?:json)?\n?/g, '').trim();
      const parsed = JSON.parse(cleaned) as unknown;

      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        typeof (parsed as Record<string, unknown>).centralTopic !== 'string'
      ) {
        this.logger.warn(
          'AI returned invalid extraction shape, using fallback',
        );
        return this.fallbackExtraction('Extracted conversation');
      }

      const raw = parsed as {
        branches?: unknown;
        centralTopic: string;
        unresolvedQuestions?: unknown;
      };

      const branches: ExtractedBranch[] = Array.isArray(raw.branches)
        ? (raw.branches as unknown[])
            .filter(
              (
                b,
              ): b is {
                label: string;
                sourceMessageIndices?: number[];
                subPoints?: unknown[];
              } =>
                typeof b === 'object' &&
                b !== null &&
                typeof (b as Record<string, unknown>).label === 'string',
            )
            .slice(0, 7)
            .map((b) => ({
              label: String(b.label).trim().slice(0, 80),
              sourceMessageIndices: Array.isArray(b.sourceMessageIndices)
                ? (b.sourceMessageIndices as unknown[]).filter(
                    (i): i is number => typeof i === 'number',
                  )
                : [],
              subPoints: Array.isArray(b.subPoints)
                ? b.subPoints
                    .filter(
                      (
                        sp,
                      ): sp is {
                        label: string;
                        sourceMessageIndices?: number[];
                      } =>
                        typeof sp === 'object' &&
                        sp !== null &&
                        typeof (sp as Record<string, unknown>).label ===
                          'string',
                    )
                    .slice(0, 4)
                    .map((sp) => ({
                      label: String(sp.label).trim().slice(0, 80),
                      sourceMessageIndices: Array.isArray(
                        sp.sourceMessageIndices,
                      )
                        ? (sp.sourceMessageIndices as unknown[]).filter(
                            (i): i is number => typeof i === 'number',
                          )
                        : [],
                    }))
                : [],
            }))
        : [];

      const unresolvedQuestions: string[] = Array.isArray(
        raw.unresolvedQuestions,
      )
        ? (raw.unresolvedQuestions as unknown[])
            .filter((q): q is string => typeof q === 'string')
            .slice(0, 3)
        : [];

      return {
        branches,
        centralTopic: raw.centralTopic.trim().slice(0, 100),
        unresolvedQuestions,
      };
    } catch {
      this.logger.warn('Failed to parse AI extraction JSON, using fallback');
      return this.fallbackExtraction('Extracted conversation');
    }
  }

  /**
   * Creates the draft ThoughtMap and all ThoughtNode documents in the database.
   */
  private async persistDraftMap(
    userId: string,
    conversationId: string,
    extraction: ExtractionResult,
  ): Promise<{ map: ThoughtMap; nodes: ThoughtNode[] }> {
    const userObjectId = new Types.ObjectId(userId);
    const conversationObjectId = new Types.ObjectId(conversationId);
    const rootNodeId = 'topic-0';

    // Create the draft ThoughtMap
    const map = await this.thoughtMapModel.create({
      rootNodeId,
      sourceConversationId: conversationObjectId,
      status: 'draft',
      title: extraction.centralTopic,
      userId: userObjectId,
    });

    const mapObjectId = map._id;
    const nodes: ThoughtNode[] = [];

    // Create root topic node
    const rootNode = await this.thoughtNodeModel.create({
      depth: 0,
      label: extraction.centralTopic,
      mapId: mapObjectId,
      nodeId: rootNodeId,
      position: { x: 0, y: 0 },
      type: 'topic',
    });
    nodes.push(rootNode);

    // Allocate stable, monotonic IDs per node type across the full draft map.
    let nextQuestionIndex = 0;
    let nextThoughtIndex = 0;

    for (const branch of extraction.branches) {
      const branchNodeId = `thought-${nextThoughtIndex}`;
      nextThoughtIndex++;

      const branchNode = await this.thoughtNodeModel.create({
        depth: 1,
        label: branch.label,
        mapId: mapObjectId,
        nodeId: branchNodeId,
        parentId: rootNodeId,
        position: { x: 0, y: 0 },
        sourceMessageIndices: branch.sourceMessageIndices,
        type: 'thought',
      });
      nodes.push(branchNode);

      for (const subPoint of branch.subPoints) {
        const subNodeId = `thought-${nextThoughtIndex}`;
        nextThoughtIndex++;

        const subNode = await this.thoughtNodeModel.create({
          depth: 2,
          label: subPoint.label,
          mapId: mapObjectId,
          nodeId: subNodeId,
          parentId: branchNodeId,
          position: { x: 0, y: 0 },
          sourceMessageIndices: subPoint.sourceMessageIndices,
          type: 'thought',
        });
        nodes.push(subNode);
      }
    }

    // Create unresolved question nodes as direct children of the root
    for (const question of extraction.unresolvedQuestions) {
      const questionNodeId = `question-${nextQuestionIndex}`;
      nextQuestionIndex++;

      const questionNode = await this.thoughtNodeModel.create({
        depth: 1,
        label: question,
        mapId: mapObjectId,
        nodeId: questionNodeId,
        parentId: rootNodeId,
        position: { x: 0, y: 0 },
        type: 'question',
      });
      nodes.push(questionNode);
    }

    this.logger.log(
      `Draft map persisted: mapId=${mapObjectId.toString()}, nodes=${nodes.length}`,
    );

    return { map, nodes };
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
   * Strips HTML tags, backticks, quotes, and backslashes from labels.
   * Limits to 200 chars to prevent prompt flooding.
   */
  private sanitizeLabel(label: string): string {
    return label
      .replace(/<[^>]*>/g, '')
      .replace(/[`"\\]/g, ' ')
      .trim()
      .slice(0, 200);
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
