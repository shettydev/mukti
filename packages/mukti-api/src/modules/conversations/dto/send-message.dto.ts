import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

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
}
