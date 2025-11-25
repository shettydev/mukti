import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

/**
 * DTO for password reset
 */
export class ResetPasswordDto {
  @ApiProperty({
    description:
      'New password (min 8 chars, must contain uppercase, lowercase, number, and special character)',
    example: 'NewSecurePass123!',
    minLength: 8,
  })
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  @MinLength(8)
  newPassword: string;

  @ApiProperty({
    description: 'Password reset token from email',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty()
  @IsString()
  token: string;
}
