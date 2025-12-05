import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for creating a new canvas session with problem structure.
 *
 * @remarks
 * Validates the three key elements of a Thinking Canvas:
 * - Seed: Main problem statement (10-500 characters)
 * - Soil: Context and constraints (0-10 items, 5-200 chars each)
 * - Roots: Core assumptions (1-8 items, 5-200 chars each)
 */
export class CreateCanvasSessionDto {
  /**
   * Core assumptions the user holds about the problem (Roots).
   */
  @ApiProperty({
    description: 'Core assumptions about the problem (Roots)',
    example: ['We need to hire more people', 'The workload is too high'],
    isArray: true,
    maxItems: 8,
    minItems: 1,
    type: [String],
  })
  @ArrayMaxSize(8, { message: 'Maximum 8 assumptions allowed' })
  @ArrayMinSize(1, { message: 'At least one assumption is required' })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, {
    each: true,
    message: 'Each assumption must be less than 200 characters',
  })
  @MinLength(5, {
    each: true,
    message: 'Each assumption must be at least 5 characters',
  })
  roots: string[];

  /**
   * The main problem statement (Seed).
   */
  @ApiProperty({
    description: 'The main problem statement (Seed)',
    example: 'My team is burned out and productivity has dropped significantly',
    maxLength: 500,
    minLength: 10,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500, {
    message: 'Problem statement must be less than 500 characters',
  })
  @MinLength(10, {
    message: 'Problem statement must be at least 10 characters',
  })
  seed: string;

  /**
   * Context and constraints surrounding the problem (Soil).
   */
  @ApiProperty({
    description: 'Context and constraints surrounding the problem (Soil)',
    example: ['Budget is tight', 'Deadline in 2 weeks', 'Remote team'],
    isArray: true,
    maxItems: 10,
    type: [String],
  })
  @ArrayMaxSize(10, { message: 'Maximum 10 context items allowed' })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, {
    each: true,
    message: 'Each context item must be less than 200 characters',
  })
  @MinLength(5, {
    each: true,
    message: 'Each context item must be at least 5 characters',
  })
  soil: string[];
}
