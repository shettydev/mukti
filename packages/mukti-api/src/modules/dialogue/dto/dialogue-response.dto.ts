import type { TurnKind } from '@muktiai/contracts';

import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import type { DialogueMessage } from '../../../schemas/dialogue-message.schema';
import type { NodeDialogue } from '../../../schemas/node-dialogue.schema';

import { normaliseTurnBudget } from '../../socratic-turn/help-controls';

/**
 * DTO for dialogue message metadata in API responses.
 */
export class DialogueMessageMetadataDto {
  @ApiProperty({
    description: 'Time taken to generate the response in milliseconds',
    example: 1500,
    required: false,
  })
  @Expose()
  latencyMs?: number;

  @ApiProperty({
    description: 'AI model used for generation',
    example: 'gpt-4',
    required: false,
  })
  @Expose()
  model?: string;

  @ApiProperty({
    description: 'Token count for the message',
    example: 150,
    required: false,
  })
  @Expose()
  tokens?: number;

  @ApiProperty({
    description:
      'What kind of reply this is: an explanation or a wrap-up summary the learner asked for, a reply after More help, or an ordinary Socratic reply. Absent on older replies and opening questions (ordinary).',
    enum: ['ordinary', 'more_help', 'explain', 'wrap_up'],
    example: 'explain',
    required: false,
  })
  @Expose()
  turnKind?: TurnKind;
}

/**
 * DTO for dialogue message in API responses.
 */
export class DialogueMessageResponseDto {
  @ApiProperty({
    description: 'The message content',
    example: 'I believe this assumption is valid because...',
  })
  @Expose()
  content: string;

  @ApiProperty({
    description: 'Parent dialogue ID',
    example: '507f1f77bcf86cd799439012',
  })
  @Expose()
  dialogueId: string;

  @ApiProperty({
    description: 'Message ID',
    example: '507f1f77bcf86cd799439011',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description:
      'Optional metadata for AI-generated messages, including the turn kind of a reply to a learner turn',
    required: false,
    type: DialogueMessageMetadataDto,
  })
  @Expose()
  @Type(() => DialogueMessageMetadataDto)
  metadata?: DialogueMessageMetadataDto;

  @ApiProperty({
    description: 'Role of the message sender',
    enum: ['user', 'assistant'],
    example: 'user',
  })
  @Expose()
  role: 'assistant' | 'user';

  @ApiProperty({
    description: 'Sequence number for ordering',
    example: 0,
  })
  @Expose()
  sequence: number;

  @ApiProperty({
    description: 'Message timestamp',
    example: '2026-01-01T00:00:00Z',
  })
  @Expose()
  timestamp: string;

  /**
   * Creates a response DTO from a dialogue message document.
   */
  static fromDocument(message: DialogueMessage): DialogueMessageResponseDto {
    const dto = new DialogueMessageResponseDto();
    dto.id = message._id?.toString() ?? String(message._id);
    dto.dialogueId =
      message.dialogueId?.toString() ?? String(message.dialogueId);
    dto.role = message.role;
    dto.content = message.content;
    dto.sequence = message.sequence;
    dto.timestamp =
      message.createdAt?.toISOString() ?? new Date().toISOString();
    dto.metadata = message.metadata;
    return dto;
  }
}

/**
 * DTO for node dialogue in API responses.
 */
export class NodeDialogueResponseDto {
  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-01-01T00:00:00Z',
  })
  @Expose()
  createdAt: string;

  @ApiProperty({
    description:
      'Current help level, 0 (questions only) to 4 (brief explanations)',
    example: 1,
    maximum: 4,
    minimum: 0,
  })
  @Expose()
  currentScaffoldLevel: number;

  @ApiProperty({
    description: 'Dialogue ID',
    example: '507f1f77bcf86cd799439011',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Timestamp of the last message',
    example: '2026-01-01T00:00:00Z',
    required: false,
  })
  @Expose()
  lastMessageAt?: string;

  @ApiProperty({
    description: 'Number of messages in this dialogue',
    example: 5,
  })
  @Expose()
  messageCount: number;

  @ApiProperty({
    description: 'Node identifier',
    example: 'root-0',
  })
  @Expose()
  nodeId: string;

  @ApiProperty({
    description: 'Node content/label',
    example: 'We need to hire more people',
  })
  @Expose()
  nodeLabel: string;

  @ApiProperty({
    description: 'Type of node',
    enum: ['seed', 'soil', 'root', 'insight'],
    example: 'root',
  })
  @Expose()
  nodeType: string;

  @ApiProperty({
    description: 'Parent canvas session ID',
    example: '507f1f77bcf86cd799439012',
  })
  @Expose()
  sessionId: string;

  @ApiProperty({
    description:
      'Turn budget in exchanges, or null when the dialogue has none. The exchange that reaches it is answered with a wrap-up summary.',
    example: 10,
    nullable: true,
    type: Number,
  })
  @Expose()
  turnBudget: null | number;

  /**
   * Creates a response DTO from a node dialogue document.
   */
  static fromDocument(dialogue: NodeDialogue): NodeDialogueResponseDto {
    const dto = new NodeDialogueResponseDto();
    dto.id = dialogue._id?.toString() ?? String(dialogue._id);
    dto.sessionId = dialogue.sessionId?.toString() ?? '';
    dto.nodeId = dialogue.nodeId;
    dto.nodeType = dialogue.nodeType;
    dto.nodeLabel = dialogue.nodeLabel;
    dto.messageCount = dialogue.messageCount;
    dto.lastMessageAt = dialogue.lastMessageAt?.toISOString();
    dto.createdAt =
      dialogue.createdAt?.toISOString() ?? new Date().toISOString();
    dto.currentScaffoldLevel = dialogue.currentScaffoldLevel ?? 0;
    dto.turnBudget = normaliseTurnBudget(dialogue.turnBudget);
    return dto;
  }
}

/**
 * DTO for paginated messages response.
 */
export class PaginatedMessagesResponseDto {
  @ApiProperty({
    description: 'Dialogue information',
    type: NodeDialogueResponseDto,
  })
  @Expose()
  @Type(() => NodeDialogueResponseDto)
  dialogue: NodeDialogueResponseDto;

  @ApiProperty({
    description: 'Array of dialogue messages',
    isArray: true,
    type: DialogueMessageResponseDto,
  })
  @Expose()
  @Type(() => DialogueMessageResponseDto)
  messages: DialogueMessageResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      hasMore: true,
      limit: 20,
      page: 1,
      total: 50,
      totalPages: 3,
    },
  })
  @Expose()
  pagination: {
    hasMore: boolean;
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
}
