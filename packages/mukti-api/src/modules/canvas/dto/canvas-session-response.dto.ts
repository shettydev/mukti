import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import type { CanvasSession } from '../../../schemas/canvas-session.schema';

/**
 * Problem structure DTO for API responses.
 */
export class ProblemStructureDto {
  @ApiProperty({
    description: 'Core assumptions about the problem (Roots)',
    example: ['We need to hire more people', 'The workload is too high'],
    isArray: true,
    type: [String],
  })
  @Expose()
  roots: string[];

  @ApiProperty({
    description: 'The main problem statement (Seed)',
    example: 'My team is burned out and productivity has dropped significantly',
  })
  @Expose()
  seed: string;

  @ApiProperty({
    description: 'Context and constraints surrounding the problem (Soil)',
    example: ['Budget is tight', 'Deadline in 2 weeks', 'Remote team'],
    isArray: true,
    type: [String],
  })
  @Expose()
  soil: string[];
}

/**
 * DTO for canvas session response.
 *
 * @remarks
 * Maps canvas session document to response format.
 */
export class CanvasSessionResponseDto {
  @ApiProperty({
    description: 'Canvas session ID',
    example: '507f1f77bcf86cd799439011',
  })
  @Expose()
  _id: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-01-01T00:00:00Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'The problem structure containing Seed, Soil, and Roots',
    type: ProblemStructureDto,
  })
  @Expose()
  @Type(() => ProblemStructureDto)
  problemStructure: ProblemStructureDto;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-01-01T00:00:00Z',
  })
  @Expose()
  updatedAt: Date;

  @ApiProperty({
    description: 'User ID who owns the canvas session',
    example: '507f1f77bcf86cd799439012',
  })
  @Expose()
  userId: string;

  /**
   * Static factory method to create DTO from canvas session document.
   *
   * @param session - The canvas session document
   * @returns Formatted canvas session response DTO
   */
  static fromDocument(session: CanvasSession): CanvasSessionResponseDto {
    const dto = new CanvasSessionResponseDto();
    dto._id = session._id?.toString() ?? String(session._id);
    dto.userId = session.userId?.toString() ?? String(session.userId);
    dto.problemStructure = {
      roots: session.problemStructure.roots ?? [],
      seed: session.problemStructure.seed,
      soil: session.problemStructure.soil ?? [],
    };
    dto.createdAt = session.createdAt;
    dto.updatedAt = session.updatedAt;
    return dto;
  }
}
