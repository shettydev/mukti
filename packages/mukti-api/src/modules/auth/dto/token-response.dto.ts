import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for token refresh response
 */
export class TokenResponseDto {
  @ApiProperty({
    description: 'New JWT access token (15 minute expiration)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;
}
