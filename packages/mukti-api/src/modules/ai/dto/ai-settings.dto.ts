import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateAiSettingsDto {
  @ApiPropertyOptional({
    description: 'Globally active AI model id',
    example: 'default-gpt-5-mini',
  })
  @IsOptional()
  @IsString()
  activeModel?: string;
}
