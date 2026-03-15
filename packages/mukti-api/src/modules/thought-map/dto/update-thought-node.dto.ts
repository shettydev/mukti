import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * Position coordinates DTO for updating a ThoughtNode's canvas position.
 */
export class ThoughtNodePositionDto {
  @ApiPropertyOptional({
    description: 'X coordinate on the canvas',
    example: 100,
  })
  @IsNumber()
  @IsOptional()
  x?: number;

  @ApiPropertyOptional({
    description: 'Y coordinate on the canvas',
    example: 200,
  })
  @IsNumber()
  @IsOptional()
  y?: number;
}

/**
 * DTO for updating an existing ThoughtNode.
 *
 * @remarks
 * All fields are optional — only provided fields are applied.
 */
export class UpdateThoughtNodeDto {
  /**
   * Whether the node's children are collapsed in the UI.
   */
  @ApiPropertyOptional({
    description: "Whether the node's children are collapsed",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isCollapsed?: boolean;

  /**
   * Updated text label for the node.
   */
  @ApiPropertyOptional({
    description: 'Updated text label for the node',
    example: 'Why is motivation dropping in Q4?',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Label must be at most 300 characters' })
  label?: string;

  /**
   * Updated canvas position for the node.
   */
  @ApiPropertyOptional({
    description: 'Updated canvas position',
    type: ThoughtNodePositionDto,
  })
  @IsOptional()
  @Type(() => ThoughtNodePositionDto)
  @ValidateNested()
  position?: ThoughtNodePositionDto;
}
