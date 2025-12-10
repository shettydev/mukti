import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for adding a new context item (Soil node) to a canvas session.
 *
 * @remarks
 * Validates the context text:
 * - Must be between 5-200 characters
 * - Will be added as a new Soil node connected to the Seed
 */
export class AddContextDto {
  /**
   * The context text to add as a new Soil node.
   */
  @ApiProperty({
    description: 'The context/constraint text (5-200 characters)',
    example: 'Limited budget for new hires',
    maxLength: 200,
    minLength: 5,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200, { message: 'Context must be less than 200 characters' })
  @MinLength(5, { message: 'Context must be at least 5 characters' })
  context: string;
}
