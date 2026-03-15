import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * DTO for updating the auto-suggestion settings on a ThoughtMap.
 *
 * @remarks
 * All fields are optional — only the provided fields are updated.
 */
export class UpdateThoughtMapSettingsDto {
  /**
   * Whether AI ghost-node auto-suggestions are enabled for this map.
   */
  @ApiProperty({
    description: 'Enable or disable AI auto-suggestions for this map',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  autoSuggestEnabled?: boolean;

  /**
   * Idle seconds before auto-suggestion is triggered.
   * Must be between 5 and 120 seconds.
   */
  @ApiProperty({
    description: 'Idle seconds before auto-suggestion fires (5–120)',
    example: 10,
    maximum: 120,
    minimum: 5,
    required: false,
  })
  @IsInt()
  @IsOptional()
  @Max(120)
  @Min(5)
  autoSuggestIdleSeconds?: number;

  /**
   * Maximum ghost-node suggestions shown per node at once.
   * Must be between 1 and 8.
   */
  @ApiProperty({
    description: 'Max AI suggestions shown per node at a time (1–8)',
    example: 4,
    maximum: 8,
    minimum: 1,
    required: false,
  })
  @IsInt()
  @IsOptional()
  @Max(8)
  @Min(1)
  maxSuggestionsPerNode?: number;
}
