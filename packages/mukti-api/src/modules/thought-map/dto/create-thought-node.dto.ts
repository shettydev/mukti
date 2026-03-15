import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { ThoughtNodeType } from '../../../schemas/thought-node.schema';

/**
 * DTO for adding a new ThoughtNode to an existing ThoughtMap.
 *
 * @remarks
 * The nodeId is auto-generated server-side as `{type}-{count}`.
 * Depth is derived from the parent node.
 */
export class CreateThoughtNodeDto {
  /**
   * Whether this node was promoted from an AI-generated ghost suggestion.
   */
  @ApiPropertyOptional({
    default: false,
    description: 'Whether this node was promoted from an AI ghost suggestion',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  fromSuggestion?: boolean;

  /**
   * User-visible text label for the node.
   */
  @ApiProperty({
    description: 'User-visible text label for the node',
    example: 'Is the onboarding process unclear?',
    maxLength: 300,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(300, { message: 'Label must be at most 300 characters' })
  label: string;

  /**
   * nodeId of the parent node. Required for all non-root nodes.
   */
  @ApiProperty({
    description: 'nodeId of the parent node (e.g., "topic-0", "thought-2")',
    example: 'topic-0',
  })
  @IsNotEmpty()
  @IsString()
  parentId: string;

  /**
   * Type of the new node — determines Socratic technique and visual style.
   * Defaults to 'thought' if omitted.
   */
  @ApiPropertyOptional({
    description: 'Node type. Defaults to "thought" if omitted',
    enum: ['topic', 'thought', 'question', 'insight'],
    example: 'question',
  })
  @IsEnum(['topic', 'thought', 'question', 'insight'] as const)
  @IsOptional()
  type?: ThoughtNodeType;
}
