import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import {
  TURN_BUDGET_MAX,
  TURN_BUDGET_MIN,
} from '../../socratic-turn/help-controls';

/**
 * DTO for updating a node dialogue's settings (canvas or thought map).
 */
export class UpdateNodeDialogueDto {
  /**
   * Turn budget in exchanges (dialogue-help-controls). `null` clears it.
   * Takes effect on the next message.
   */
  @ApiPropertyOptional({
    description:
      'Turn budget in exchanges; the exchange that reaches it is answered with a wrap-up summary. null clears it.',
    example: 5,
    maximum: TURN_BUDGET_MAX,
    minimum: TURN_BUDGET_MIN,
    nullable: true,
    type: Number,
  })
  @IsInt()
  @IsOptional()
  @Max(TURN_BUDGET_MAX)
  @Min(TURN_BUDGET_MIN)
  turnBudget?: null | number;
}
