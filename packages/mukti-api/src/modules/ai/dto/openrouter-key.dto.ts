import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SetOpenRouterKeyDto {
  @ApiProperty({
    description: 'User-provided OpenRouter API key',
    example: 'sk-or-v1-...',
  })
  @IsNotEmpty()
  @IsString()
  apiKey: string;
}
