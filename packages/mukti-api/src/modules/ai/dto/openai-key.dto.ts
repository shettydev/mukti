import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SetOpenAiKeyDto {
  @ApiProperty({
    description: 'User-provided OpenAI API key',
    example: 'sk-...',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  apiKey: string;
}
