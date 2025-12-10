import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for adding a new assumption (Root node) to a canvas session.
 *
 * @remarks
 * Validates the assumption text:
 * - Must be between 5-200 characters
 * - Will be added as a new Root node connected to the Seed
 */
export class AddAssumptionDto {
  /**
   * The assumption text to add as a new Root node.
   */
  @ApiProperty({
    description: 'The assumption text (5-200 characters)',
    example: 'We assume the team needs better tools',
    maxLength: 200,
    minLength: 5,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200, { message: 'Assumption must be less than 200 characters' })
  @MinLength(5, { message: 'Assumption must be at least 5 characters' })
  assumption: string;
}
