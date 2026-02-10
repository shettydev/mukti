import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class SetProviderApiKeyDto {
  @ApiProperty({
    description: 'Provider API key to store on the server',
    example: 'sk-...',
  })
  @IsNotEmpty()
  @IsString()
  apiKey: string;
}

export class ToggleProviderDto {
  @ApiProperty({
    description: 'Whether this provider is active for model routing',
    example: true,
  })
  @IsBoolean()
  isActive: boolean;
}
