import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { ComplexityLevel, InquiryTechnique } from '../../../common';

export class InquiryContextDto {
  @IsString()
  domain: string;

  @IsEnum(ComplexityLevel)
  complexity: ComplexityLevel;

  @IsArray()
  @IsString({ each: true })
  constraints: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  priorKnowledge?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  timeConstraints?: {
    session_duration_minutes?: number;
    total_exploration_time?: string;
  };
}

export class InquiryRequestDto {
  @ValidateNested()
  @Type(() => InquiryContextDto)
  context: InquiryContextDto;

  @IsString()
  currentUnderstanding: string;

  @IsEnum(InquiryTechnique)
  technique: InquiryTechnique;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
