import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for sending a message in a node dialogue.
 */
export class DialogueSendMessageDto {
  @ApiProperty({
    description: 'The message content to send',
    example: 'I believe this assumption is valid because...',
    maxLength: 5000,
    minLength: 1,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  @MinLength(1)
  content: string;
}
