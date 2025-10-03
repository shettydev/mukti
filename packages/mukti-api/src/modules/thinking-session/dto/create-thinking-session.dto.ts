import {
  IsString,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

import { ComplexityLevel, InquiryTechnique } from '../../../common';

export class ThinkingSessionContextDto {
  @IsString()
  domain: string;

  @IsEnum(['low', 'medium', 'high'])
  urgency: 'low' | 'medium' | 'high';

  @IsEnum(ComplexityLevel)
  complexity: ComplexityLevel;

  @IsArray()
  @IsString({ each: true })
  priorAttempts: string[];

  @IsArray()
  @IsString({ each: true })
  learningGoals: string[];
}

export class CreateThinkingSessionDto {
  @IsString()
  initialStatement: string;

  @ValidateNested()
  @Type(() => ThinkingSessionContextDto)
  context: ThinkingSessionContextDto;

  @IsOptional()
  @IsEnum(InquiryTechnique)
  preferredTechnique?: InquiryTechnique;
}
