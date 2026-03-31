import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  MessageEvent,
  NotFoundException,
  Param,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Model, Types } from 'mongoose';
import { Observable } from 'rxjs';

import type { NodeType } from '../../schemas/node-dialogue.schema';
import type { Subscription } from '../../schemas/subscription.schema';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ThoughtNode,
  ThoughtNodeDocument,
} from '../../schemas/thought-node.schema';
import { User, type UserDocument } from '../../schemas/user.schema';
import { AiPolicyService } from '../ai/services/ai-policy.service';
import { AiSecretsService } from '../ai/services/ai-secrets.service';
import {
  DialogueMessageResponseDto,
  NodeDialogueResponseDto,
} from '../dialogue/dto/dialogue-response.dto';
import { DialogueSendMessageDto } from '../dialogue/dto/send-message.dto';
import { DialogueStreamService } from '../dialogue/services/dialogue-stream.service';
import { DialogueService } from '../dialogue/services/dialogue.service';
import {
  ApiGetThoughtMapNodeMessages,
  ApiSendThoughtMapNodeMessage,
  ApiStartThoughtMapNodeDialogue,
  ApiStreamThoughtMapNodeDialogue,
} from './dto/thought-map-dialogue.swagger';
import { ThoughtMapDialogueQueueService } from './services/thought-map-dialogue-queue.service';
import { ThoughtMapService } from './services/thought-map.service';

/**
 * Controller for Thought Map node dialogue endpoints.
 *
 * @remarks
 * All endpoints are scoped under `/thought-maps/:mapId/nodes/:nodeId/`.
 * Ownership is validated via `ThoughtMapService.findMapById` on every request.
 * SSE stream keys use `map:{mapId}` as the session-scope prefix to avoid collision
 * with canvas dialogue stream keys.
 */
@ApiTags('ThoughtMapDialogue')
@Controller('thought-maps')
@UseGuards(JwtAuthGuard)
export class ThoughtMapDialogueController {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(ThoughtNode.name)
    private readonly thoughtNodeModel: Model<ThoughtNodeDocument>,
    private readonly configService: ConfigService,
    private readonly aiPolicyService: AiPolicyService,
    private readonly aiSecretsService: AiSecretsService,
    private readonly dialogueService: DialogueService,
    private readonly dialogueStreamService: DialogueStreamService,
    private readonly thoughtMapService: ThoughtMapService,
    private readonly thoughtMapDialogueQueueService: ThoughtMapDialogueQueueService,
  ) {}

  /**
   * Starts dialogue on a Thought Map node.
   *
   * - If dialogue already has messages → returns existing dialogue + first message (sync).
   * - If dialogue is empty (first open) → enqueues an AI job to generate the
   *   initial Socratic question, returns `{ dialogue, jobId, position }` (async, 202).
   *   The AI-generated question arrives via the SSE stream.
   *
   * Marks the node as explored immediately in both cases.
   */
  @ApiStartThoughtMapNodeDialogue()
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':mapId/nodes/:nodeId/start')
  async startDialogue(
    @Param('mapId') mapId: string,
    @Param('nodeId') nodeId: string,
    @CurrentUser() user: User,
  ) {
    // Validate map ownership
    await this.thoughtMapService.findMapById(mapId, user._id);

    // Resolve full node context (type, label, depth, siblings, parentType)
    const { depth, fromSuggestion, nodeLabel, nodeType, parentType, siblings } =
      await this.resolveNodeContext(mapId, nodeId);

    // Get or create dialogue (scoped to mapId+nodeId)
    const dialogue =
      await this.thoughtMapDialogueQueueService.getOrCreateMapDialogue(
        mapId,
        nodeId,
        nodeType,
        nodeLabel,
      );

    // Mark the node as explored immediately (idempotent $set)
    await this.thoughtNodeModel.updateOne(
      { mapId: new Types.ObjectId(mapId), nodeId },
      { $set: { isExplored: true } },
    );

    // If dialogue already has messages, return existing first message
    const existingMessages = await this.dialogueService.getMessages(
      dialogue._id,
      {
        limit: 1,
        page: 1,
      },
    );

    if (existingMessages.pagination.total > 0) {
      return {
        dialogue: NodeDialogueResponseDto.fromDocument(dialogue),
        initialQuestion: DialogueMessageResponseDto.fromDocument(
          existingMessages.messages[0],
        ),
      };
    }

    // First open: enqueue an AI job to generate the initial Socratic question.
    // The user will see this response — use BYOK if available, fall back to server key.
    const userRecord = await this.userModel
      .findById(user._id)
      .select('+openRouterApiKeyEncrypted preferences')
      .lean();
    if (!userRecord) {
      throw new NotFoundException('User not found');
    }

    const usedByok = !!userRecord.openRouterApiKeyEncrypted;
    const serverApiKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ?? '';
    if (!usedByok && !serverApiKey) {
      throw new InternalServerErrorException(
        'OPENROUTER_API_KEY not configured',
      );
    }

    const validationApiKey = usedByok
      ? this.aiSecretsService.decryptString(
          userRecord.openRouterApiKeyEncrypted!,
        )
      : serverApiKey;

    const effectiveModel = await this.aiPolicyService.resolveEffectiveModel({
      hasByok: usedByok,
      userActiveModel: userRecord.preferences?.activeModel,
      validationApiKey,
    });

    const userWithSubscription = user as User & { subscription?: Subscription };
    const subscriptionTier: 'free' | 'paid' =
      userWithSubscription.subscription?.tier === 'paid' ? 'paid' : 'free';

    const result =
      await this.thoughtMapDialogueQueueService.enqueueMapNodeRequest(
        user._id,
        mapId,
        nodeId,
        nodeType,
        nodeLabel,
        depth,
        fromSuggestion,
        siblings,
        parentType,
        '', // No user message for initial question
        subscriptionTier,
        effectiveModel,
        usedByok,
        true, // isInitialQuestion flag
      );

    return {
      dialogue: NodeDialogueResponseDto.fromDocument(dialogue),
      jobId: result.jobId,
      position: result.position,
    };
  }

  /**
   * Returns paginated dialogue messages for a Thought Map node.
   */
  @ApiGetThoughtMapNodeMessages()
  @Get(':mapId/nodes/:nodeId/messages')
  async getMessages(
    @Param('mapId') mapId: string,
    @Param('nodeId') nodeId: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @CurrentUser() user?: User,
  ) {
    await this.thoughtMapService.findMapById(mapId, user!._id);

    // Read-only lookup — avoids accidentally creating a ghost NodeDialogue
    const dialogue = await this.thoughtMapDialogueQueueService.findMapDialogue(
      mapId,
      nodeId,
    );

    const result = dialogue
      ? await this.dialogueService.getMessages(dialogue._id, { limit, page })
      : null;

    if (!result) {
      return {
        dialogue: null,
        messages: [],
        pagination: {
          hasMore: false,
          limit: limit ?? 20,
          page: 1,
          total: 0,
          totalPages: 0,
        },
      };
    }

    return {
      dialogue: NodeDialogueResponseDto.fromDocument(result.dialogue),
      messages: result.messages.map((msg) =>
        DialogueMessageResponseDto.fromDocument(msg),
      ),
      pagination: result.pagination,
    };
  }

  /**
   * Sends a user message to a Thought Map node dialogue.
   * Returns 202 Accepted with job ID. Use the SSE stream to receive real-time updates.
   */
  @ApiSendThoughtMapNodeMessage()
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':mapId/nodes/:nodeId/messages')
  async sendMessage(
    @Param('mapId') mapId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: DialogueSendMessageDto,
    @CurrentUser() user: User,
  ) {
    await this.thoughtMapService.findMapById(mapId, user._id);

    const { depth, fromSuggestion, nodeLabel, nodeType, parentType, siblings } =
      await this.resolveNodeContext(mapId, nodeId);

    const userWithSubscription = user as User & { subscription?: Subscription };
    const subscriptionTier: 'free' | 'paid' =
      userWithSubscription.subscription?.tier === 'paid' ? 'paid' : 'free';

    const userRecord = await this.userModel
      .findById(user._id)
      .select('+openRouterApiKeyEncrypted preferences')
      .lean();
    if (!userRecord) {
      throw new NotFoundException('User not found');
    }

    const usedByok = !!userRecord.openRouterApiKeyEncrypted;
    const serverApiKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ?? '';
    if (!usedByok && !serverApiKey) {
      throw new InternalServerErrorException(
        'OPENROUTER_API_KEY not configured',
      );
    }

    const validationApiKey = usedByok
      ? this.aiSecretsService.decryptString(
          userRecord.openRouterApiKeyEncrypted!,
        )
      : serverApiKey;

    const effectiveModel = await this.aiPolicyService.resolveEffectiveModel({
      hasByok: usedByok,
      requestedModel: dto.model,
      userActiveModel: userRecord.preferences?.activeModel,
      validationApiKey,
    });

    const shouldPersistModel =
      !!dto.model || !userRecord.preferences?.activeModel;
    if (shouldPersistModel) {
      await this.userModel.updateOne(
        { _id: user._id },
        { $set: { 'preferences.activeModel': effectiveModel } },
      );
    }

    const result =
      await this.thoughtMapDialogueQueueService.enqueueMapNodeRequest(
        user._id,
        mapId,
        nodeId,
        nodeType,
        nodeLabel,
        depth,
        fromSuggestion,
        siblings,
        parentType,
        dto.content,
        subscriptionTier,
        effectiveModel,
        usedByok,
      );

    return { jobId: result.jobId, position: result.position };
  }

  /**
   * Establishes an SSE stream for real-time Thought Map node dialogue events.
   */
  @ApiStreamThoughtMapNodeDialogue()
  @SkipEnvelope()
  @Sse(':mapId/nodes/:nodeId/stream')
  async streamDialogue(
    @Param('mapId') mapId: string,
    @Param('nodeId') nodeId: string,
    @CurrentUser() user: User,
  ): Promise<Observable<MessageEvent>> {
    try {
      await this.thoughtMapService.findMapById(mapId, user._id);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw error;
    }

    // Use `map:{mapId}` as the SSE stream key prefix to avoid collision with canvas sessions
    const streamKey = `map:${mapId}`;

    return new Observable<MessageEvent>((observer) => {
      const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      this.dialogueStreamService.addConnection(
        streamKey,
        nodeId,
        user._id.toString(),
        connectionId,
        (event) => {
          observer.next({ data: event, type: 'message' } as MessageEvent);
        },
      );

      return () => {
        this.dialogueStreamService.removeConnection(
          streamKey,
          nodeId,
          connectionId,
        );
      };
    });
  }

  /**
   * Looks up the ThoughtNode document and extracts type + label.
   */
  private async resolveNodeInfo(
    mapId: string,
    nodeId: string,
  ): Promise<{ nodeLabel: string; nodeType: NodeType }> {
    const node = await this.thoughtNodeModel.findOne({
      mapId: new Types.ObjectId(mapId),
      nodeId,
    });
    if (!node) {
      throw new NotFoundException(`Node "${nodeId}" not found in map ${mapId}`);
    }
    return { nodeLabel: node.label, nodeType: node.type as NodeType };
  }

  /**
   * Resolves full ThoughtMapNodeTechniqueContext fields from the node document.
   */
  private async resolveNodeContext(
    mapId: string,
    nodeId: string,
  ): Promise<{
    depth: number;
    fromSuggestion: boolean;
    nodeLabel: string;
    nodeType: NodeType;
    parentType: NodeType | undefined;
    siblings: number;
  }> {
    const mapObjectId = new Types.ObjectId(mapId);

    const node = await this.thoughtNodeModel.findOne({
      mapId: mapObjectId,
      nodeId,
    });
    if (!node) {
      throw new NotFoundException(`Node "${nodeId}" not found in map ${mapId}`);
    }

    const [siblings, parentNode] = await Promise.all([
      node.parentId
        ? this.thoughtNodeModel.countDocuments({
            mapId: mapObjectId,
            parentId: node.parentId,
          })
        : Promise.resolve(0),
      node.parentId
        ? this.thoughtNodeModel
            .findOne({ mapId: mapObjectId, nodeId: node.parentId })
            .lean()
        : Promise.resolve(null),
    ]);

    return {
      depth: node.depth,
      fromSuggestion: node.fromSuggestion,
      nodeLabel: node.label,
      nodeType: node.type as NodeType,
      parentType: parentNode ? (parentNode.type as NodeType) : undefined,
      siblings,
    };
  }
}
