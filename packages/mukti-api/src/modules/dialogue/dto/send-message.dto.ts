import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  HELP_CONTROLS,
  type HelpControl,
} from '../../socratic-turn/help-controls';

/**
 * DTO for sending a message in a node dialogue (canvas or thought map).
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

  /**
   * At most one learner help control for this message.
   */
  @ApiPropertyOptional({
    description:
      'Help control for this message: more_help raises the help level for the reply, explain explains the one missing piece for this reply only, wrap_up returns a closing summary.',
    enum: HELP_CONTROLS,
    example: 'more_help',
  })
  @IsIn(HELP_CONTROLS)
  @IsOptional()
  helpControl?: HelpControl;

  @ApiPropertyOptional({
    description: 'OpenRouter model id to use for this message',
    example: 'openai/gpt-5-mini',
  })
  @IsOptional()
  @IsString()
  model?: string;
}
