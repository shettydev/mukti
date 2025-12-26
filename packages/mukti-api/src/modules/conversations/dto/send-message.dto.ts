import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO for sending a message to a conversation.
 *
 * @remarks
 * Validates that the message content is not empty.
 */
export class SendMessageDto {
  /**
   * The message content from the user.
   */
  @ApiProperty({
    description: 'User message content',
    example: 'How can I optimize React component rendering?',
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'OpenRouter model id to use for this message',
    example: 'openai/gpt-5-mini',
  })
  @IsOptional()
  @IsString()
  model?: string;
}
