import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO for requesting AI branch suggestions for a Thought Map node.
 */
export class RequestBranchSuggestionsDto {
  /**
   * Optional model override. Falls back to user's active model if omitted.
   */
  @ApiProperty({
    description: 'Optional OpenRouter model ID override',
    example: 'openai/gpt-4o-mini',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;

  /**
   * The nodeId of the node to generate suggestions from.
   */
  @ApiProperty({
    description: 'nodeId of the parent node to suggest branches from',
    example: 'topic-0',
  })
  @IsString()
  @MinLength(1)
  parentNodeId: string;
}
