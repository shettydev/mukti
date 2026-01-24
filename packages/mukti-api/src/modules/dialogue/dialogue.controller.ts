import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
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
import { Model } from 'mongoose';
import { Observable } from 'rxjs';

import type { NodeType } from '../../schemas/node-dialogue.schema';
import type { Subscription } from '../../schemas/subscription.schema';

import { User, type UserDocument } from '../../schemas/user.schema';
import { AiPolicyService } from '../ai/services/ai-policy.service';
import { AiSecretsService } from '../ai/services/ai-secrets.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DialogueService } from './dialogue.service';
import {
  DialogueMessageResponseDto,
  NodeDialogueResponseDto,
} from './dto/dialogue-response.dto';
import {
  ApiGetNodeMessages,
  ApiSendNodeMessage,
  ApiStartNodeDialogue,
  ApiStreamNodeDialogue,
} from './dto/dialogue.swagger';
import { DialogueSendMessageDto } from './dto/send-message.dto';
import { DialogueQueueService } from './services/dialogue-queue.service';
import { DialogueStreamService } from './services/dialogue-stream.service';
import { generateInitialQuestion } from './utils/prompt-builder';

/**
 * Controller for node dialogue management endpoints.
 * Handles message sending, retrieval, dialogue initialization, and real-time streaming.
 *
 * @remarks
 * All endpoints require JWT authentication and validate canvas session ownership.
 * Implements the Context-aware Chat feature for the Thinking Canvas.
 * Uses queue-based processing with SSE for real-time AI response streaming.
 */
@ApiTags('Dialogue')
@Controller('canvas')
@UseGuards(JwtAuthGuard)
export class DialogueController {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly aiPolicyService: AiPolicyService,
    private readonly aiSecretsService: AiSecretsService,
    private readonly dialogueQueueService: DialogueQueueService,
    private readonly dialogueService: DialogueService,
    private readonly dialogueStreamService: DialogueStreamService,
  ) {}

  /**
   * Gets dialogue messages for a node with pagination.
   *
   * @param sessionId - The canvas session ID
   * @param nodeId - The node identifier
   * @param page - Page number (1-indexed)
   * @param limit - Number of messages per page
   * @param user - The authenticated user
   * @returns Paginated messages with dialogue info
   */
  @ApiGetNodeMessages()
  @Get(':sessionId/nodes/:nodeId/messages')
  async getMessages(
    @Param('sessionId') sessionId: string,
    @Param('nodeId') nodeId: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @CurrentUser() user?: User,
  ) {
    // Validate session ownership
    await this.dialogueService.validateSessionOwnership(sessionId, user!._id);

    // Get messages (returns null if no dialogue exists)
    const result = await this.dialogueService.getMessagesByNode(
      sessionId,
      nodeId,
      { limit, page },
    );

    if (!result) {
      // No dialogue exists yet - return empty result
      return {
        data: {
          dialogue: null,
          messages: [],
          pagination: {
            hasMore: false,
            limit: limit ?? 20,
            page: 1,
            total: 0,
            totalPages: 0,
          },
        },
        meta: {
          requestId: this.generateRequestId(),
          timestamp: new Date().toISOString(),
        },
        success: true,
      };
    }

    return {
      data: {
        dialogue: NodeDialogueResponseDto.fromDocument(result.dialogue),
        messages: result.messages.map((msg) =>
          DialogueMessageResponseDto.fromDocument(msg),
        ),
        pagination: result.pagination,
      },
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Sends a message to a node dialogue and enqueues it for AI processing.
   * Returns immediately with job ID. Use SSE endpoint to receive real-time updates.
   *
   * @param sessionId - The canvas session ID
   * @param nodeId - The node identifier
   * @param sendMessageDto - The message content
   * @param user - The authenticated user
   * @returns Job ID and queue position (202 Accepted)
   */
  @ApiSendNodeMessage()
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':sessionId/nodes/:nodeId/messages')
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Param('nodeId') nodeId: string,
    @Body() sendMessageDto: DialogueSendMessageDto,
    @CurrentUser() user: User,
  ) {
    // Validate session ownership
    const session = await this.dialogueService.validateSessionOwnership(
      sessionId,
      user._id,
    );

    // Determine node type and label from the session
    const { nodeLabel, nodeType } = this.resolveNodeInfo(
      nodeId,
      session.problemStructure,
    );

    // Get subscription tier from user
    const userWithSubscription = user as User & { subscription?: Subscription };
    const subscriptionTier: 'free' | 'paid' =
      userWithSubscription.subscription?.tier === 'paid' ? 'paid' : 'free';

    const userRecord = await this.userModel
      .findById(user._id)
      .select('+openRouterApiKeyEncrypted preferences')
      .lean();

    if (!userRecord) {
      throw new Error('User not found');
    }

    const usedByok = !!userRecord.openRouterApiKeyEncrypted;
    const serverApiKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ?? '';

    if (!usedByok && !serverApiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const validationApiKey = usedByok
      ? this.aiSecretsService.decryptString(
          userRecord.openRouterApiKeyEncrypted!,
        )
      : serverApiKey;

    const effectiveModel = await this.aiPolicyService.resolveEffectiveModel({
      hasByok: usedByok,
      requestedModel: sendMessageDto.model,
      userActiveModel: userRecord.preferences?.activeModel,
      validationApiKey,
    });

    const shouldPersistModel =
      !!sendMessageDto.model || !userRecord.preferences?.activeModel;

    if (shouldPersistModel) {
      await this.userModel.updateOne(
        { _id: user._id },
        { $set: { 'preferences.activeModel': effectiveModel } },
      );
    }

    // Enqueue request for processing
    const result = await this.dialogueQueueService.enqueueRequest(
      user._id,
      sessionId,
      nodeId,
      nodeType,
      nodeLabel,
      session.problemStructure,
      sendMessageDto.content,
      subscriptionTier,
      effectiveModel,
      usedByok,
    );

    return {
      data: {
        jobId: result.jobId,
        position: result.position,
      },
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Starts a new dialogue with an initial AI question.
   *
   * @param sessionId - The canvas session ID
   * @param nodeId - The node identifier
   * @param user - The authenticated user
   * @returns The dialogue with initial question
   */
  @ApiStartNodeDialogue()
  @HttpCode(HttpStatus.CREATED)
  @Post(':sessionId/nodes/:nodeId/start')
  async startDialogue(
    @Param('sessionId') sessionId: string,
    @Param('nodeId') nodeId: string,
    @CurrentUser() user: User,
  ) {
    // Validate session ownership
    const session = await this.dialogueService.validateSessionOwnership(
      sessionId,
      user._id,
    );

    // Determine node type and label
    const { nodeLabel, nodeType } = this.resolveNodeInfo(
      nodeId,
      session.problemStructure,
    );

    // Get or create dialogue
    const dialogue = await this.dialogueService.getOrCreateDialogue(
      sessionId,
      nodeId,
      nodeType,
      nodeLabel,
    );

    // Check if dialogue already has messages
    const existingMessages = await this.dialogueService.getMessages(
      dialogue._id,
      { limit: 1, page: 1 },
    );

    if (existingMessages.pagination.total > 0) {
      // Return existing dialogue info
      return {
        data: {
          dialogue: NodeDialogueResponseDto.fromDocument(dialogue),
          initialQuestion: DialogueMessageResponseDto.fromDocument(
            existingMessages.messages[0],
          ),
        },
        meta: {
          requestId: this.generateRequestId(),
          timestamp: new Date().toISOString(),
        },
        success: true,
      };
    }

    // Generate initial question
    const initialQuestionContent = generateInitialQuestion(nodeType, nodeLabel);

    const initialQuestion = await this.dialogueService.addMessage(
      dialogue._id,
      'assistant',
      initialQuestionContent,
      {
        model: 'system',
      },
    );

    // Get updated dialogue
    const updatedDialogue = await this.dialogueService.getDialogue(
      sessionId,
      nodeId,
    );

    return {
      data: {
        dialogue: NodeDialogueResponseDto.fromDocument(updatedDialogue!),
        initialQuestion:
          DialogueMessageResponseDto.fromDocument(initialQuestion),
      },
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Establishes a Server-Sent Events (SSE) connection for real-time dialogue updates.
   * The connection streams events including message processing status, new messages, completion, and errors.
   *
   * @param sessionId - The canvas session ID
   * @param nodeId - The node identifier
   * @param user - The authenticated user
   * @returns Observable stream of SSE MessageEvents
   */
  @ApiStreamNodeDialogue()
  @Sse(':sessionId/nodes/:nodeId/stream')
  async streamDialogue(
    @Param('sessionId') sessionId: string,
    @Param('nodeId') nodeId: string,
    @CurrentUser() user: User,
  ): Promise<Observable<MessageEvent>> {
    // Validate session ownership
    try {
      await this.dialogueService.validateSessionOwnership(sessionId, user._id);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(
          `Canvas session with ID ${sessionId} not found`,
        );
      }
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException(
          'You do not have permission to access this canvas session',
        );
      }
      throw error;
    }

    // Create an Observable that manages the SSE connection
    return new Observable<MessageEvent>((observer) => {
      const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Register the connection with DialogueStreamService
      this.dialogueStreamService.addConnection(
        sessionId,
        nodeId,
        user._id.toString(),
        connectionId,
        (event) => {
          observer.next({
            data: event,
            type: 'message',
          } as MessageEvent);
        },
      );

      // Handle client disconnect
      return () => {
        this.dialogueStreamService.removeConnection(
          sessionId,
          nodeId,
          connectionId,
        );
      };
    });
  }

  /**
   * Generates a unique request ID for tracking.
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Resolves node type and label from the node ID and problem structure.
   */
  private resolveNodeInfo(
    nodeId: string,
    problemStructure: { roots: string[]; seed: string; soil: string[] },
  ): { nodeLabel: string; nodeType: NodeType } {
    if (nodeId === 'seed') {
      return { nodeLabel: problemStructure.seed, nodeType: 'seed' };
    }

    if (nodeId.startsWith('soil-')) {
      const index = parseInt(nodeId.replace('soil-', ''), 10);
      if (isNaN(index) || index < 0 || index >= problemStructure.soil.length) {
        throw new BadRequestException(`Invalid soil node ID: ${nodeId}`);
      }
      return { nodeLabel: problemStructure.soil[index], nodeType: 'soil' };
    }

    if (nodeId.startsWith('root-')) {
      const index = parseInt(nodeId.replace('root-', ''), 10);
      if (isNaN(index) || index < 0 || index >= problemStructure.roots.length) {
        throw new BadRequestException(`Invalid root node ID: ${nodeId}`);
      }
      return { nodeLabel: problemStructure.roots[index], nodeType: 'root' };
    }

    if (nodeId.startsWith('insight-')) {
      // For insight nodes, we need to look up the label from the dialogue
      // For now, use a placeholder - this will be enhanced when insight nodes are created
      return { nodeLabel: 'Insight', nodeType: 'insight' };
    }

    throw new BadRequestException(`Unknown node ID format: ${nodeId}`);
  }
}
