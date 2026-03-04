import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class BKTParametersDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  pGuess: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  pInit: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  pLearn: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  pSlip: number;
}

export class CreateConceptDto {
  @IsNotEmpty()
  @IsString()
  conceptId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  difficulty?: 'advanced' | 'beginner' | 'intermediate';

  @IsOptional()
  @IsEnum(['programming', 'mathematics', 'logic', 'problem-solving', 'general'])
  domain?:
    | 'general'
    | 'logic'
    | 'mathematics'
    | 'problem-solving'
    | 'programming';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @IsOptional()
  @IsString()
  briefExplanation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exampleQuestions?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BKTParametersDto)
  bktParameters?: BKTParametersDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depthLevel?: number;
}

export class UpdateConceptDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  difficulty?: 'advanced' | 'beginner' | 'intermediate';

  @IsOptional()
  @IsEnum(['programming', 'mathematics', 'logic', 'problem-solving', 'general'])
  domain?:
    | 'general'
    | 'logic'
    | 'mathematics'
    | 'problem-solving'
    | 'programming';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @IsOptional()
  @IsString()
  briefExplanation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exampleQuestions?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BKTParametersDto)
  bktParameters?: BKTParametersDto;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depthLevel?: number;
}

export class ListConceptsQueryDto {
  @IsOptional()
  @IsEnum(['programming', 'mathematics', 'logic', 'problem-solving', 'general'])
  domain?: string;

  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  difficulty?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  autoDiscovered?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  verified?: boolean;
}
