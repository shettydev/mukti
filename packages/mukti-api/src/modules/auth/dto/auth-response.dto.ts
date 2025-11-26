import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from './user-response.dto';

/**
 * DTO for authentication response (login/register)
 */
export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token (15 minute expiration)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token (7 day expiration)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'User information',
    type: UserResponseDto,
  })
  user: UserResponseDto;
}
