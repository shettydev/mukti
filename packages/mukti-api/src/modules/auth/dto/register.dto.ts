import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * DTO for user registration
 */
export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    minLength: 2,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    minLength: 2,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiProperty({
    description: 'User password',
    example: 'mypassword',
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({
    description: 'User phone number (optional)',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber(undefined, {
    message: 'Phone number must be a valid phone number',
  })
  @Transform(({ value }: { value: unknown }): string | undefined =>
    value === '' ? undefined : (value as string),
  )
  phone?: string;
}
