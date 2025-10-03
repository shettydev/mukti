import { IsString, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProblemCanvasContextDto {
  @IsString()
  domain: string;

  @IsEnum(['low', 'medium', 'high'])
  urgency: 'low' | 'medium' | 'high';

  @IsArray()
  @IsString({ each: true })
  priorAttempts: string[];
}

export class CreateProblemCanvasDto {
  @IsString()
  initialStatement: string;

  @ValidateNested()
  @Type(() => ProblemCanvasContextDto)
  context: ProblemCanvasContextDto;

  @IsString()
  sessionId: string;
}
