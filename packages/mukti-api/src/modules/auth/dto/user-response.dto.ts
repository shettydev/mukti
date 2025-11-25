import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * DTO for user response (excludes sensitive fields)
 */
@Exclude()
export class UserResponseDto {
  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'User email address',
    example: 'john@example.com',
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: 'Whether email is verified',
    example: false,
  })
  @Expose()
  emailVerified: boolean;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @Expose()
  firstName: string;

  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Whether account is active',
    example: true,
  })
  @Expose()
  isActive: boolean;

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  @Expose()
  lastLoginAt?: Date;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @Expose()
  lastName: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    required: false,
  })
  @Expose()
  phone?: string;

  @ApiProperty({
    description: 'User role',
    enum: ['user', 'moderator', 'admin'],
    example: 'user',
  })
  @Expose()
  role: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  @Expose()
  updatedAt: Date;
}
