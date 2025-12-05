import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/**
 * DTO for node position data.
 */
export class NodePositionDto {
  @ApiProperty({
    description: 'Unique identifier for the node',
    example: 'seed',
  })
  @IsString()
  nodeId: string;

  @ApiProperty({
    description: 'X coordinate on the canvas',
    example: 0,
  })
  @IsNumber()
  x: number;

  @ApiProperty({
    description: 'Y coordinate on the canvas',
    example: 0,
  })
  @IsNumber()
  y: number;
}

/**
 * DTO for updating a canvas session.
 *
 * @remarks
 * Supports updating node positions and explored nodes for Phase 3 integration.
 * All fields are optional to allow partial updates.
 */
export class UpdateCanvasSessionDto {
  /**
   * Array of node IDs that have been explored through Socratic dialogue.
   */
  @ApiProperty({
    description: 'Node IDs that have been explored through dialogue',
    example: ['seed', 'root-0'],
    isArray: true,
    required: false,
    type: [String],
  })
  @ArrayMaxSize(50, { message: 'Maximum 50 explored nodes allowed' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  exploredNodes?: string[];

  /**
   * Custom node positions set by the user through drag operations.
   */
  @ApiProperty({
    description: 'Custom node positions on the canvas',
    example: [
      { nodeId: 'seed', x: 0, y: 0 },
      { nodeId: 'soil-0', x: -200, y: -100 },
    ],
    isArray: true,
    required: false,
    type: [NodePositionDto],
  })
  @ArrayMaxSize(50, { message: 'Maximum 50 node positions allowed' })
  @IsArray()
  @IsOptional()
  @Type(() => NodePositionDto)
  @ValidateNested({ each: true })
  nodePositions?: NodePositionDto[];
}
