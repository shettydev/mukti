import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SwitchProviderDto {
  @ApiProperty({
    description:
      'Local AI CLI to make active: `claude`, `codex` or `agy` (former names `claude-code` and `antigravity` are accepted)',
    example: 'codex',
  })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiPropertyOptional({
    description:
      'Also save this CLI as the default for later launches, once the switch succeeds',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  saveAsDefault?: boolean;
}
