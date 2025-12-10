import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for creating a new insight node in a canvas session.
 *
 * @remarks
 * Validates the insight node data including:
 * - Label: The insight text (5-200 characters)
 * - ParentNodeId: The ID of the parent node this insight spawns from
 * - Position: X and Y coordinates for canvas placement
 */
export class CreateInsightNodeDto {
  /**
   * The insight label/text describing the discovery or realization.
   */
  @ApiProperty({
    description: 'The insight label/text (5-200 characters)',
    example: 'The real issue might be communication, not workload',
    maxLength: 200,
    minLength: 5,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200, { message: 'Label must be less than 200 characters' })
  @MinLength(5, { message: 'Label must be at least 5 characters' })
  label: string;

  /**
   * The ID of the parent node from which this insight originates.
   */
  @ApiProperty({
    description: 'The ID of the parent node (e.g., root-0, soil-1, seed)',
    example: 'root-0',
  })
  @IsNotEmpty()
  @IsString()
  parentNodeId: string;

  /**
   * X coordinate for the insight node position on the canvas.
   */
  @ApiProperty({
    description: 'X coordinate for canvas placement',
    example: 150,
  })
  @IsNumber()
  x: number;

  /**
   * Y coordinate for the insight node position on the canvas.
   */
  @ApiProperty({
    description: 'Y coordinate for canvas placement',
    example: 200,
  })
  @IsNumber()
  y: number;
}
