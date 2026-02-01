import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SetAnthropicKeyDto {
  @ApiProperty({
    description: 'User-provided Anthropic API key',
    example: 'sk-ant-...',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  apiKey: string;
}
