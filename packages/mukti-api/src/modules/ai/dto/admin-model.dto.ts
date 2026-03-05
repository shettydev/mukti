import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { AI_PROVIDER_VALUES } from '../../../schemas/ai-provider-config.schema';

export class AiModelPricingDto {
  @ApiProperty({
    description: 'Prompt price in USD per 1M input tokens',
    example: 0.15,
  })
  @IsNumber()
  @Min(0)
  promptUsdPer1M: number;

  @ApiProperty({
    description: 'Completion price in USD per 1M output tokens',
    example: 0.6,
  })
  @IsNumber()
  @Min(0)
  completionUsdPer1M: number;
}

export class UpsertAiModelDto {
  @ApiProperty({
    description: 'Client-facing model label',
    example: 'GPT-4.1 Mini',
  })
  @IsNotEmpty()
  @IsString()
  label: string;

  @ApiProperty({
    description: 'Provider for this model',
    enum: AI_PROVIDER_VALUES,
    example: 'openai',
  })
  @IsIn(AI_PROVIDER_VALUES)
  provider: string;

  @ApiProperty({
    description: 'Provider-specific model identifier',
    example: 'gpt-4.1-mini',
  })
  @IsNotEmpty()
  @IsString()
  providerModel: string;

  @ApiProperty({
    description: 'Pricing configuration for deterministic cost tracking',
    type: AiModelPricingDto,
  })
  @Type(() => AiModelPricingDto)
  @ValidateNested()
  pricing: AiModelPricingDto;

  @ApiPropertyOptional({
    description: 'Whether this model is available to users',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ToggleAiModelDto {
  @ApiProperty({
    description: 'Whether this model is active',
    example: true,
  })
  @IsBoolean()
  isActive: boolean;
}
