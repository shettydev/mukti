import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  HELP_CONTROLS,
  type HelpControl,
} from '../../socratic-turn/help-controls';

/**
 * DTO for sending a message to a conversation.
 *
 * @remarks
 * Validates that the message content is not empty, and that a help control,
 * when present, is one the API knows (an unknown one is a 400 and nothing is
 * enqueued).
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

  /**
   * At most one learner help control for this message.
   */
  @ApiPropertyOptional({
    description:
      'Help control for this message: more_help raises the help level for the reply, explain explains the one missing piece for this reply only, wrap_up returns a closing summary.',
    enum: HELP_CONTROLS,
    example: 'explain',
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

  /**
   * @deprecated Send `helpControl: 'wrap_up'`. Still accepted; when both are
   * sent, `helpControl` wins.
   */
  @ApiPropertyOptional({
    deprecated: true,
    description:
      'Deprecated alias for helpControl: "wrap_up". Ignored when helpControl is sent.',
  })
  @IsBoolean()
  @IsOptional()
  wrapUpRequested?: boolean;
}

/**
 * The help control a chat message carries, honouring the deprecated
 * `wrapUpRequested` flag when no `helpControl` is sent.
 */
export function resolveChatHelpControl(
  dto: Pick<SendMessageDto, 'helpControl' | 'wrapUpRequested'>,
): HelpControl | undefined {
  return dto.helpControl ?? (dto.wrapUpRequested ? 'wrap_up' : undefined);
}
