import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Job, Queue } from 'bullmq';
import { Model, Types } from 'mongoose';

import type { ThoughtNodeType } from '../../../schemas/thought-node.schema';

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
// Constants
// ============================================================================

/** Number of suggestions to generate per invocation */
const SUGGESTION_COUNT = 3;

// ============================================================================
// SSE types for suggestions
// ============================================================================

/**
 * A single AI-generated branch suggestion.
 */
export interface BranchSuggestion {
  /** Question text — always phrased as a question */
  label: string;
  /** nodeId of the parent this should branch from */
  parentId: string;
  /** Suggested type for the new node */
  suggestedType: 'question' | 'thought';
}

/**
 * Job data for a branch suggestion request.
 */
export interface BranchSuggestionJobData {
  /** Sanitized labels of all existing nodes (for AI context) */
  existingNodeLabels: string[];
  mapId: string;
  /** OpenRouter model ID */
  model: string;
  /** nodeId of the node to suggest branches for */
  parentNodeId: string;
  /** Sanitized label of the parent node */
  parentNodeLabel: string;
  /** Type of the parent node */
  parentNodeType: ThoughtNodeType;
  subscriptionTier: string;
  usedByok: boolean;
  userId: string;
}

/**
 * Job result for a branch suggestion request.
 */
export interface BranchSuggestionJobResult {
  count: number;
  mapId: string;
  parentNodeId: string;
  suggestions: BranchSuggestion[];
}

// ============================================================================
// Job interfaces
// ============================================================================

/**
 * Union of all suggestion SSE event payloads.
 */
export type SuggestionStreamEvent =
  | {
      data: BranchSuggestion;
      type: 'suggestion';
    }
  | {
      data: { code: string; message: string; retriable: boolean };
      type: 'error';
    }
  | {
      data: { jobId: string; status: 'started' };
      type: 'processing';
    }
  | {
      data: { jobId: string; suggestionCount: number };
      type: 'complete';
    };

/**
 * An active SSE listener registered for a suggestion job.
 */
interface SuggestionStreamConnection {
  connectionId: string;
  emitFn: (event: SuggestionStreamEvent) => void;
  mapId: string;
  parentNodeId: string;
}

// ============================================================================
// Service
// ============================================================================

/**
 * Queue service for processing branch suggestion requests asynchronously.
 *
 * @remarks
 * Uses a dedicated `thought-map-suggestion-requests` BullMQ queue.
 * Maintains its own suggestion SSE connection map (separate from DialogueStreamService)
 * because the event shape differs from dialogue events.
 *
 * SSE events emitted per job:
 *   processing → suggestion (×2–4) → complete | error
 *
 * Each `suggestion` event carries `{ label, parentId, suggestedType }`.
 */
@Injectable()
@Processor('thought-map-suggestion-requests')
export class BranchSuggestionService extends WorkerHost {
  /** Active SSE connections keyed by `{mapId}:{parentNodeId}` */
  private readonly connections = new Map<
    string,
    SuggestionStreamConnection[]
  >();

  private readonly logger = new Logger(BranchSuggestionService.name);

  constructor(
    @InjectQueue('thought-map-suggestion-requests')
    private readonly suggestionQueue: Queue<
      BranchSuggestionJobData,
      BranchSuggestionJobResult
    >,
    @InjectModel(ThoughtNode.name)
    private readonly thoughtNodeModel: Model<ThoughtNodeDocument>,
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
   * Registers a client SSE connection for a suggestion job stream.
   *
   * @param mapId - Thought Map ID
   * @param parentNodeId - Node being suggested from
   * @param connectionId - Unique connection identifier
   * @param emitFn - Callback to push events to the client
   * @returns Cleanup function to call on disconnect
   */
  addConnection(
    mapId: string,
    parentNodeId: string,
    connectionId: string,
    emitFn: (event: SuggestionStreamEvent) => void,
  ): () => void {
    const key = this.streamKey(mapId, parentNodeId);
    const connection: SuggestionStreamConnection = {
      connectionId,
      emitFn,
      mapId,
      parentNodeId,
    };

    const existing = this.connections.get(key) ?? [];
    existing.push(connection);
    this.connections.set(key, existing);

    this.logger.log(
      `Suggestion SSE connection added: ${key} (connectionId=${connectionId})`,
    );

    return () => {
      this.removeConnection(mapId, parentNodeId, connectionId);
    };
  }

  /**
   * Enqueues a branch suggestion request.
   *
   * @param userId - The requesting user
   * @param mapId - The Thought Map ID
   * @param parentNodeId - The node to suggest branches from
   * @param subscriptionTier - Used for queue priority
   * @param model - OpenRouter model ID
   * @param usedByok - Whether to use the user's own API key
   * @returns Job ID and queue position
   */
  async enqueueSuggestion(
    userId: string | Types.ObjectId,
    mapId: string,
    parentNodeId: string,
    subscriptionTier: string,
    model: string,
    usedByok: boolean,
  ): Promise<{ jobId: string; position: number }> {
    const userIdString = userId.toString();
    this.logger.log(
      `Enqueueing branch suggestion: user=${userIdString}, map=${mapId}, node=${parentNodeId}`,
    );

    const mapObjectId = new Types.ObjectId(mapId);
    const [parentNode, allNodes] = await Promise.all([
      this.thoughtNodeModel
        .findOne({ mapId: mapObjectId, nodeId: parentNodeId })
        .lean(),
      this.thoughtNodeModel
        .find({ mapId: mapObjectId })
        .select('label nodeId')
        .lean(),
    ]);

    const parentNodeLabel = this.sanitizeLabel(
      parentNode?.label ?? parentNodeId,
    );
    const parentNodeType: ThoughtNodeType = parentNode?.type ?? 'thought';
    const existingNodeLabels = allNodes.map((n) => this.sanitizeLabel(n.label));

    const priority = subscriptionTier === 'paid' ? 10 : 1;

    const jobData: BranchSuggestionJobData = {
      existingNodeLabels,
      mapId,
      model,
      parentNodeId,
      parentNodeLabel,
      parentNodeType,
      subscriptionTier,
      usedByok,
      userId: userIdString,
    };

    const job = await this.suggestionQueue.add(
      'process-branch-suggestion',
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
        const waitingJobs = await this.suggestionQueue.getWaiting();
        const idx = waitingJobs.findIndex((j) => j.id === job.id);
        if (idx >= 0) {
          position = idx + 1;
        }
      }
    } catch {
      position = 1;
    }

    this.logger.log(
      `Branch suggestion job enqueued. ID=${job.id}, position=${position}`,
    );
    return { jobId: job.id!, position };
  }

  async getSuggestionJob(
    jobId: string,
  ): Promise<Job<BranchSuggestionJobData, BranchSuggestionJobResult> | null> {
    const job = await this.suggestionQueue.getJob(jobId);
    return job ?? null;
  }

  async getSuggestionJobStatus(jobId: string): Promise<{
    result?: BranchSuggestionJobResult;
    state: string;
  }> {
    const job = await this.getSuggestionJob(jobId);

    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    return {
      result: job.returnvalue,
      state: await job.getState(),
    };
  }

  // ============================================================================
  // Queue management
  // ============================================================================

  /**
   * Processes a branch suggestion job from the queue.
   */
  async process(
    job: Job<BranchSuggestionJobData, BranchSuggestionJobResult>,
  ): Promise<BranchSuggestionJobResult> {
    const {
      existingNodeLabels,
      mapId,
      model,
      parentNodeId,
      parentNodeLabel,
      parentNodeType,
      usedByok,
      userId,
    } = job.data;

    this.logger.log(
      `Processing suggestion job ${job.id}: user=${userId}, map=${mapId}, node=${parentNodeId}`,
    );

    try {
      this.emit(mapId, parentNodeId, {
        data: { jobId: job.id!, status: 'started' },
        type: 'processing',
      });

      const apiKey = await this.resolveApiKey(userId, usedByok);
      const effectiveModel = this.validateEffectiveModel(model, usedByok);

      const suggestions = await this.generateSuggestions(
        parentNodeLabel,
        parentNodeType,
        parentNodeId,
        existingNodeLabels,
        effectiveModel,
        apiKey,
      );

      for (const suggestion of suggestions) {
        this.emit(mapId, parentNodeId, {
          data: suggestion,
          type: 'suggestion',
        });
      }

      await this.usageEventModel.create({
        eventType: 'THOUGHT_MAP_BRANCH_SUGGESTION',
        metadata: {
          mapId: new Types.ObjectId(mapId),
          model: effectiveModel,
          parentNodeId,
          suggestionCount: suggestions.length,
        },
        timestamp: new Date(),
        userId: new Types.ObjectId(userId),
      });

      this.emit(mapId, parentNodeId, {
        data: { jobId: job.id!, suggestionCount: suggestions.length },
        type: 'complete',
      });

      this.logger.log(
        `Suggestion job ${job.id} completed with ${suggestions.length} suggestions`,
      );

      return {
        count: suggestions.length,
        mapId,
        parentNodeId,
        suggestions,
      };
    } catch (error) {
      this.logger.error(
        `Suggestion job ${job.id} failed: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );

      this.emit(mapId, parentNodeId, {
        data: {
          code: 'SUGGESTION_ERROR',
          message: this.getErrorMessage(error),
          retriable: true,
        },
        type: 'error',
      });

      throw error;
    }
  }

  // ============================================================================
  // Worker
  // ============================================================================

  /**
   * Removes a specific SSE connection.
   */
  removeConnection(
    mapId: string,
    parentNodeId: string,
    connectionId: string,
  ): void {
    const key = this.streamKey(mapId, parentNodeId);
    const existing = this.connections.get(key) ?? [];
    const filtered = existing.filter((c) => c.connectionId !== connectionId);

    if (filtered.length === 0) {
      this.connections.delete(key);
    } else {
      this.connections.set(key, filtered);
    }
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private buildSystemPrompt(
    parentLabel: string,
    parentType: ThoughtNodeType,
    existingLabels: string[],
  ): string {
    const nodeContext =
      parentType === 'topic'
        ? `The user is exploring a central topic: "${parentLabel}".`
        : `The user has a thought node: "${parentLabel}".`;

    const existingContext =
      existingLabels.length > 0
        ? `The map already contains these ideas: ${existingLabels.map((l) => `"${l}"`).join(', ')}. Avoid repeating them.`
        : '';

    return [
      'You are Mukti, a Socratic thinking assistant. Your role is to help users think more deeply — never to give answers.',
      '',
      nodeContext,
      existingContext,
      '',
      `Generate exactly ${SUGGESTION_COUNT} Socratic questions that would help the user explore this thought further.`,
      'Rules:',
      '- Each suggestion MUST be phrased as a question (end with "?")',
      '- Questions should probe assumptions, explore consequences, or challenge perspectives',
      '- Do NOT provide answers, advice, or conclusions',
      '- Keep each question concise (under 15 words)',
      '- Questions should be distinct — no overlapping themes',
      '',
      'Respond with a JSON array of objects. Each object must have:',
      '  - "label": the question text (string)',
      '  - "suggestedType": either "question" or "thought" (string)',
      '',
      'Example: [{"label": "What evidence supports this assumption?", "suggestedType": "question"}]',
      '',
      'Return ONLY the JSON array, no other text.',
    ].join('\n');
  }

  private emit(
    mapId: string,
    parentNodeId: string,
    event: SuggestionStreamEvent,
  ): void {
    const key = this.streamKey(mapId, parentNodeId);
    const conns = this.connections.get(key) ?? [];

    if (conns.length === 0) {
      this.logger.debug(`No suggestion SSE connections for ${key}`);
      return;
    }

    for (const conn of conns) {
      try {
        conn.emitFn(event);
      } catch (err) {
        this.logger.warn(
          `Failed to emit suggestion event to connection ${conn.connectionId}: ${this.getErrorMessage(err)}`,
        );
      }
    }
  }

  private fallbackSuggestions(parentNodeId: string): BranchSuggestion[] {
    return [
      {
        label: 'What assumptions are you making here?',
        parentId: parentNodeId,
        suggestedType: 'question',
      },
      {
        label: 'What evidence supports this?',
        parentId: parentNodeId,
        suggestedType: 'question',
      },
      {
        label: 'What would change if this were false?',
        parentId: parentNodeId,
        suggestedType: 'question',
      },
    ];
  }

  private async generateSuggestions(
    parentLabel: string,
    parentType: ThoughtNodeType,
    parentNodeId: string,
    existingLabels: string[],
    model: string,
    apiKey: string,
  ): Promise<BranchSuggestion[]> {
    const systemPrompt = this.buildSystemPrompt(
      parentLabel,
      parentType,
      existingLabels,
    );

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        body: JSON.stringify({
          messages: [
            { content: systemPrompt, role: 'system' },
            { content: 'Generate branch suggestions now.', role: 'user' },
          ],
          model,
          temperature: 0.8,
        }),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://mukti.chat',
          'X-Title': 'Mukti Thought Map',
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

    const content = data.choices[0]?.message?.content ?? '[]';
    return this.parseJsonSuggestions(content, parentNodeId);
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getErrorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }

  private parseJsonSuggestions(
    content: string,
    parentNodeId: string,
  ): BranchSuggestion[] {
    try {
      const cleaned = content.replace(/```(?:json)?\n?/g, '').trim();
      const parsed = JSON.parse(cleaned) as unknown;

      if (!Array.isArray(parsed)) {
        this.logger.warn(
          'AI returned non-array suggestion response, using fallback',
        );
        return this.fallbackSuggestions(parentNodeId);
      }

      const valid = parsed
        .filter(
          (item): item is { label: string; suggestedType: string } =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as Record<string, unknown>).label === 'string' &&
            typeof (item as Record<string, unknown>).suggestedType === 'string',
        )
        .slice(0, SUGGESTION_COUNT)
        .map((item) => ({
          label: item.label.trim(),
          parentId: parentNodeId,
          suggestedType:
            item.suggestedType === 'thought'
              ? ('thought' as const)
              : ('question' as const),
        }));

      return valid.length > 0 ? valid : this.fallbackSuggestions(parentNodeId);
    } catch {
      this.logger.warn('Failed to parse AI suggestion JSON, using fallback');
      return this.fallbackSuggestions(parentNodeId);
    }
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
   * Strips HTML tags, backticks, quotes, and backslashes from node labels.
   * Limits to 200 chars to prevent prompt flooding (RFC §9 security requirement).
   */
  private sanitizeLabel(label: string): string {
    return label
      .replace(/<[^>]*>/g, '')
      .replace(/[`"\\]/g, ' ')
      .trim()
      .slice(0, 200);
  }

  private streamKey(mapId: string, parentNodeId: string): string {
    return `${mapId}:${parentNodeId}`;
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
