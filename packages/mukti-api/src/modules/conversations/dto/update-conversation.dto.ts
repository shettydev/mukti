import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * DTO for updating an existing conversation.
 *
 * @remarks
 * All fields are optional. Only provided fields will be updated.
 * Validates that title is not empty if provided, tags are strings,
 * and boolean flags are proper booleans.
 */
export class UpdateConversationDto {
  /**
   * Mark conversation as archived.
   */
  @ApiProperty({
    description: 'Mark as archived',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  /**
   * Mark conversation as favorite.
   */
  @ApiProperty({
    description: 'Mark as favorite',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  /**
   * Updated tags for the conversation.
   */
  @ApiProperty({
    description: 'Updated tags',
    example: ['react', 'performance'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  /**
   * Switch to a different Socratic technique.
   * Must be one of: elenchus, dialectic, maieutics, definitional, analogical, counterfactual
   */
  @ApiProperty({
    description: 'Switch to a different Socratic technique',
    enum: [
      'elenchus',
      'dialectic',
      'maieutics',
      'definitional',
      'analogical',
      'counterfactual',
    ],
    example: 'dialectic',
    required: false,
  })
  @IsOptional()
  @IsString()
  technique?: string;

  /**
   * Updated conversation title.
   * Must not be empty if provided.
   */
  @ApiProperty({
    description: 'Updated conversation title',
    example: 'React Performance - Updated',
    required: false,
  })
  @IsNotEmpty()
  @IsOptional()
  @IsString()
  title?: string;
}
