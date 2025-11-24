import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO for creating a new conversation.
 *
 * @remarks
 * Validates the required fields for conversation creation including
 * technique selection and optional metadata like title and tags.
 */
export class CreateConversationDto {
  /**
   * Optional tags for organizing the conversation.
   */
  @ApiProperty({
    description: 'Tags for organizing the conversation',
    example: ['react', 'performance', 'optimization'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  /**
   * The Socratic technique to use for this conversation.
   * Must be one of: elenchus, dialectic, maieutics, definitional, analogical, counterfactual
   */
  @ApiProperty({
    description: 'Socratic technique for the conversation',
    enum: [
      'elenchus',
      'dialectic',
      'maieutics',
      'definitional',
      'analogical',
      'counterfactual',
    ],
    example: 'elenchus',
  })
  @IsNotEmpty()
  @IsString()
  technique: string;

  /**
   * The title of the conversation.
   */
  @ApiProperty({
    description: 'Conversation title',
    example: 'React Performance Optimization',
  })
  @IsNotEmpty()
  @IsString()
  title: string;
}
