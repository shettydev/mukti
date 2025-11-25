import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Service responsible for password hashing, comparison, and validation.
 * Implements secure password handling using bcrypt with constant-time comparison.
 *
 * @remarks
 * This service ensures passwords are securely hashed with bcrypt (cost factor 12)
 * and validates password strength according to security requirements.
 */
@Injectable()
export class PasswordService {
  private readonly BCRYPT_ROUNDS = 12;
  private readonly logger = new Logger(PasswordService.name);

  /**
   * Compares a plaintext password with a bcrypt hash using constant-time comparison.
   * This prevents timing attacks by ensuring comparison time is consistent.
   *
   * @param password - The plaintext password to verify
   * @param hash - The bcrypt hash to compare against
   * @returns True if password matches hash, false otherwise
   *
   * @example
   * ```typescript
   * const isValid = await passwordService.comparePassword('SecurePass123!', hash);
   * ```
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      this.logger.debug('Comparing password with hash');
      // bcrypt.compare uses constant-time comparison internally
      const isMatch = await bcrypt.compare(password, hash);
      this.logger.debug(`Password comparison result: ${isMatch}`);
      return isMatch;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to compare password: ${errorMessage}`,
        errorStack,
      );
      return false;
    }
  }

  /**
   * Gets a detailed validation result with specific failure reasons.
   * Useful for providing user feedback on password requirements.
   *
   * @param password - The password to validate
   * @returns Object containing validation result and specific failures
   *
   * @example
   * ```typescript
   * const result = passwordService.getPasswordValidationDetails('weak');
   * // Returns: {
   * //   failures: ['TOO_SHORT', 'MISSING_UPPERCASE', 'MISSING_NUMBER', 'MISSING_SPECIAL'],
   * //   isValid: false
   * // }
   * ```
   */
  getPasswordValidationDetails(password: string): {
    failures: string[];
    isValid: boolean;
  } {
    const failures: string[] = [];

    if (!password || password.length < 8) {
      failures.push('TOO_SHORT');
    }

    if (!/[A-Z]/.test(password)) {
      failures.push('MISSING_UPPERCASE');
    }

    if (!/[a-z]/.test(password)) {
      failures.push('MISSING_LOWERCASE');
    }

    if (!/\d/.test(password)) {
      failures.push('MISSING_NUMBER');
    }

    if (!/[@$!%*?&]/.test(password)) {
      failures.push('MISSING_SPECIAL');
    }

    return {
      failures,
      isValid: failures.length === 0,
    };
  }

  /**
   * Hashes a plaintext password using bcrypt with cost factor 12.
   *
   * @param password - The plaintext password to hash
   * @returns The bcrypt hash of the password
   * @throws {Error} If hashing fails
   *
   * @example
   * ```typescript
   * const hash = await passwordService.hashPassword('SecurePass123!');
   * ```
   */
  async hashPassword(password: string): Promise<string> {
    try {
      this.logger.debug('Hashing password');
      const hash = await bcrypt.hash(password, this.BCRYPT_ROUNDS);
      this.logger.debug('Password hashed successfully');
      return hash;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to hash password: ${errorMessage}`, errorStack);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Validates password strength according to security requirements.
   * Password must contain:
   * - At least 8 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   * - At least one special character
   *
   * @param password - The password to validate
   * @returns True if password meets all requirements, false otherwise
   *
   * @example
   * ```typescript
   * const isStrong = passwordService.validatePasswordStrength('SecurePass123!');
   * // Returns: true
   *
   * const isWeak = passwordService.validatePasswordStrength('weak');
   * // Returns: false
   * ```
   */
  validatePasswordStrength(password: string): boolean {
    if (!password || password.length < 8) {
      this.logger.debug('Password validation failed: too short');
      return false;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    const isValid = hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

    if (!isValid) {
      this.logger.debug(
        `Password validation failed: uppercase=${hasUppercase}, lowercase=${hasLowercase}, number=${hasNumber}, special=${hasSpecialChar}`,
      );
    }

    return isValid;
  }
}
