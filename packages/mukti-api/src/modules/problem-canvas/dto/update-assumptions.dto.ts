import {
  IsArray,
  ValidateNested,
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AssumptionMappingDto {
  @IsString()
  assumption: string;

  @IsNumber()
  confidence: number; // 1-10

  @IsEnum(['low', 'medium', 'high'])
  impact: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsString()
  validationMethod?: string;

  @IsBoolean()
  tested: boolean;
}

export class UpdateAssumptionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssumptionMappingDto)
  assumptionMappings: AssumptionMappingDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  newAssumptions?: string[];
}
