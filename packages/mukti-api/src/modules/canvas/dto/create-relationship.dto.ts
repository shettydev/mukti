import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * DTO for creating a relationship edge between an assumption and a constraint.
 *
 * @remarks
 * Validates the relationship:
 * - sourceNodeId: Must be a Root node (root-*)
 * - targetNodeId: Must be a Soil node (soil-*)
 */
export class CreateRelationshipDto {
  /**
   * The source node ID (must be a Root/assumption node).
   */
  @ApiProperty({
    description: 'The source node ID (must be a root-* node)',
    example: 'root-0',
    pattern: '^root-\\d+$',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^root-\d+$/, {
    message: 'sourceNodeId must be a root node (e.g., root-0, root-1)',
  })
  sourceNodeId: string;

  /**
   * The target node ID (must be a Soil/constraint node).
   */
  @ApiProperty({
    description: 'The target node ID (must be a soil-* node)',
    example: 'soil-0',
    pattern: '^soil-\\d+$',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^soil-\d+$/, {
    message: 'targetNodeId must be a soil node (e.g., soil-0, soil-1)',
  })
  targetNodeId: string;
}
