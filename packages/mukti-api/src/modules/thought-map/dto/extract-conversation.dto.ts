import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

/**
 * DTO for requesting a Thought Map extraction from a conversation.
 */
export class ExtractConversationDto {
  /**
   * The ID of the conversation to extract a Thought Map from.
   */
  @ApiProperty({
    description: 'MongoDB ObjectId of the source conversation',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  conversationId: string;

  /**
   * Optional OpenRouter model override. Falls back to server default if omitted.
   */
  @ApiProperty({
    description: 'Optional OpenRouter model ID override',
    example: 'openai/gpt-4o-mini',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;
}
