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
  @Max(1)
  @Min(0)
  pGuess: number;

  @IsNumber()
  @Max(1)
  @Min(0)
  pInit: number;

  @IsNumber()
  @Max(1)
  @Min(0)
  pLearn: number;

  @IsNumber()
  @Max(1)
  @Min(0)
  pSlip: number;
}

export class CreateConceptDto {
  @IsOptional()
  @Type(() => BKTParametersDto)
  @ValidateNested()
  bktParameters?: BKTParametersDto;

  @IsOptional()
  @IsString()
  briefExplanation?: string;

  @IsNotEmpty()
  @IsString()
  conceptId: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  depthLevel?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['beginner', 'intermediate', 'advanced'])
  @IsOptional()
  difficulty?: 'advanced' | 'beginner' | 'intermediate';

  @IsEnum(['programming', 'mathematics', 'logic', 'problem-solving', 'general'])
  @IsOptional()
  domain?:
    | 'general'
    | 'logic'
    | 'mathematics'
    | 'problem-solving'
    | 'programming';

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  exampleQuestions?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  keywords?: string[];

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  prerequisites?: string[];
}

export class ListConceptsQueryDto {
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  autoDiscovered?: boolean;

  @IsEnum(['beginner', 'intermediate', 'advanced'])
  @IsOptional()
  difficulty?: string;

  @IsEnum(['programming', 'mathematics', 'logic', 'problem-solving', 'general'])
  @IsOptional()
  domain?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  verified?: boolean;
}

export class UpdateConceptDto {
  @IsOptional()
  @Type(() => BKTParametersDto)
  @ValidateNested()
  bktParameters?: BKTParametersDto;

  @IsOptional()
  @IsString()
  briefExplanation?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  depthLevel?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['beginner', 'intermediate', 'advanced'])
  @IsOptional()
  difficulty?: 'advanced' | 'beginner' | 'intermediate';

  @IsEnum(['programming', 'mathematics', 'logic', 'problem-solving', 'general'])
  @IsOptional()
  domain?:
    | 'general'
    | 'logic'
    | 'mathematics'
    | 'problem-solving'
    | 'programming';

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  exampleQuestions?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  prerequisites?: string[];

  @IsBoolean()
  @IsOptional()
  verified?: boolean;
}
