import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

/**
 * DTO for creating a share link for a ThoughtMap.
 *
 * @remarks
 * All fields are optional — a basic share link can be created with an
 * empty body. If expiresAt is omitted the link never expires.
 */
export class CreateShareLinkDto {
  /**
   * Optional ISO 8601 expiry timestamp.
   * If provided the share link becomes invalid after this time.
   */
  @ApiProperty({
    description:
      'Optional ISO 8601 expiry timestamp. Leave empty for a link that never expires.',
    example: '2026-12-31T23:59:59Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
