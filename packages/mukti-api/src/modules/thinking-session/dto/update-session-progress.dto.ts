import { IsString, IsArray, IsOptional } from 'class-validator';

export class UpdateSessionProgressDto {
  @IsArray()
  @IsString({ each: true })
  discoveries: string[];

  @IsString()
  newUnderstanding: string;

  @IsArray()
  @IsString({ each: true })
  questionsAnswered: string[];

  @IsArray()
  @IsString({ each: true })
  resourcesUsed: string[];

  @IsOptional()
  @IsString()
  currentStage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  completedStages?: string[];
}
