import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateAiSettingsDto {
  @ApiPropertyOptional({
    description: 'Globally active OpenRouter model id',
    example: 'openai/gpt-5-mini',
  })
  @IsOptional()
  @IsString()
  activeModel?: string;
}
