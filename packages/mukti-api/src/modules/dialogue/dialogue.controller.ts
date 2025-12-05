import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import type { NodeType } from '../../schemas/node-dialogue.schema';
import type { User } from '../../schemas/user.schema';

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
} from './dto/dialogue.swagger';
import { SendMessageDto } from './dto/send-message.dto';
import { generateInitialQuestion } from './utils/prompt-builder';

/**
 * Controller for node dialogue management endpoints.
 * Handles message sending, retrieval, and dialogue initialization.
 *
 * @remarks
 * All endpoints require JWT authentication and validate canvas session ownership.
 * Implements the Context-aware Chat feature for the Thinking Canvas.
 */
@ApiTags('Dialogue')
@Controller('canvas')
@UseGuards(JwtAuthGuard)
export class DialogueController {
  constructor(private readonly dialogueService: DialogueService) {}

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
   * Sends a message to a node dialogue and receives an AI response.
   *
   * @param sessionId - The canvas session ID
   * @param nodeId - The node identifier
   * @param sendMessageDto - The message content
   * @param user - The authenticated user
   * @returns The user message and AI response
   */
  @ApiSendNodeMessage()
  @HttpCode(HttpStatus.CREATED)
  @Post(':sessionId/nodes/:nodeId/messages')
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Param('nodeId') nodeId: string,
    @Body() sendMessageDto: SendMessageDto,
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

    // Get or create dialogue
    const dialogue = await this.dialogueService.getOrCreateDialogue(
      sessionId,
      nodeId,
      nodeType,
      nodeLabel,
    );

    // Add user message
    const userMessage = await this.dialogueService.addMessage(
      dialogue._id,
      'user',
      sendMessageDto.content,
    );

    // TODO: Integrate with AI service for actual response generation
    // For now, generate a placeholder Socratic response
    const aiResponseContent = this.generatePlaceholderResponse(
      nodeType,
      nodeLabel,
      sendMessageDto.content,
    );

    const aiMessage = await this.dialogueService.addMessage(
      dialogue._id,
      'assistant',
      aiResponseContent,
      {
        latencyMs: 0,
        model: 'placeholder',
      },
    );

    // Get updated dialogue info
    const updatedDialogue = await this.dialogueService.getDialogue(
      sessionId,
      nodeId,
    );

    return {
      data: {
        aiResponse: DialogueMessageResponseDto.fromDocument(aiMessage),
        dialogue: NodeDialogueResponseDto.fromDocument(updatedDialogue!),
        userMessage: DialogueMessageResponseDto.fromDocument(userMessage),
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
   * Generates a placeholder Socratic response.
   * TODO: Replace with actual AI service integration.
   */
  private generatePlaceholderResponse(
    nodeType: NodeType,
    _nodeLabel: string,
    _userMessage: string,
  ): string {
    const responses: Record<NodeType, string[]> = {
      insight: [
        'How does this insight change your understanding of the original problem?',
        'What new questions does this discovery raise?',
        'How might you apply this insight going forward?',
      ],
      root: [
        "That's an interesting perspective. What evidence supports this assumption?",
        'Have you considered what might happen if this assumption were incorrect?',
        'What led you to believe this in the first place?',
      ],
      seed: [
        'What do you think is the underlying cause of this problem?',
        'How long has this been an issue, and what has changed?',
        'What would success look like if this problem were solved?',
      ],
      soil: [
        'Is this constraint truly fixed, or might there be flexibility?',
        'What would change if this constraint were removed?',
        'Have you explored ways to work within or around this limitation?',
      ],
    };

    const nodeResponses = responses[nodeType] || responses.seed;
    return nodeResponses[Math.floor(Math.random() * nodeResponses.length)];
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
