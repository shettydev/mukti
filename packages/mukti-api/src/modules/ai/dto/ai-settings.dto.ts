import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import {
  TURN_BUDGET_MAX,
  TURN_BUDGET_MIN,
} from '../../socratic-turn/help-controls';

export class UpdateAiSettingsDto {
  @ApiPropertyOptional({
    description: 'Globally active OpenRouter model id',
    example: 'openai/gpt-5-mini',
  })
  @IsOptional()
  @IsString()
  activeModel?: string;

  /**
   * Turn budget applied to each new dialogue. `null` clears it; omitting the
   * field leaves it unchanged.
   */
  @ApiPropertyOptional({
    description:
      'Turn budget (exchanges) for new dialogues; null clears it. Existing dialogues keep their own budget.',
    example: 10,
    maximum: TURN_BUDGET_MAX,
    minimum: TURN_BUDGET_MIN,
    nullable: true,
    type: Number,
  })
  @IsInt()
  @IsOptional()
  @Max(TURN_BUDGET_MAX)
  @Min(TURN_BUDGET_MIN)
  defaultTurnBudget?: null | number;
}
