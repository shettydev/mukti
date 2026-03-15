import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for converting a CanvasSession into a new ThoughtMap.
 *
 * @remarks
 * The canvas sessionId is supplied as a route param, so this DTO
 * carries only the title override. If no title is supplied the
 * Seed text is used as the map title.
 */
export class ConvertCanvasDto {
  /**
   * Optional title override for the new Thought Map.
   * When omitted the CanvasSession's seed text is used as the title.
   */
  @ApiProperty({
    description:
      'Optional title for the resulting Thought Map. Defaults to the canvas seed text.',
    example: 'Why is our team losing motivation?',
    maxLength: 500,
    required: false,
  })
  @IsNotEmpty()
  @IsString()
  title?: string;
}
