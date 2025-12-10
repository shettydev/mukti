import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateInsightNodeDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isExplored?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  x?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  y?: number;
}
