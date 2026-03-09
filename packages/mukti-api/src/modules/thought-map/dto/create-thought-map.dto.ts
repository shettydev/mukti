import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * DTO for creating a new ThoughtMap.
 *
 * @remarks
 * The title becomes the label for the root topic node at depth 0.
 */
export class CreateThoughtMapDto {
  /**
   * The central topic or title of the Thought Map.
   */
  @ApiProperty({
    description: 'Central topic or title of the Thought Map',
    example: 'Why is our team losing motivation?',
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500, { message: 'Title must be at most 500 characters' })
  title: string;
}
