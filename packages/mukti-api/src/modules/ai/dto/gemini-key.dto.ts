import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SetGeminiKeyDto {
  @ApiProperty({
    description: 'User-provided Gemini API key',
    example: 'AIzaSy...',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  apiKey: string;
}
