import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';

import { PasswordService } from '../../password.service';

/**
 * Property-Based Tests for Password Validation
 *
 * Feature: auth-system, Property 3: Password validation enforces security requirements
 * Validates: Requirements 1.3, 4.3, 11.5
 *
 * These tests verify that password validation correctly enforces security requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (@$!%*?&)
 */
describe('PasswordService - Property 3: Password validation enforces security requirements', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  /**
   * Property: For any password shorter than 8 characters, validation should fail.
   */
  it('should reject passwords shorter than 8 characters', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 7 }), (password) => {
        const isValid = service.validatePasswordStrength(password);
        expect(isValid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: For any password without uppercase letters, validation should fail.
   */
  it('should reject passwords without uppercase letters', () => {
    // Generate passwords with lowercase, numbers, and special chars but no uppercase
    const passwordWithoutUppercase = fc
      .tuple(
        fc.array(
          fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'),
          {
            maxLength: 10,
            minLength: 5,
          },
        ),
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5'), {
          maxLength: 3,
          minLength: 1,
        }),
        fc.array(fc.constantFrom('@', '$', '!', '%', '*', '?', '&'), {
          maxLength: 3,
          minLength: 1,
        }),
      )
      .map(
        ([letters, numbers, special]) =>
          letters.join('') + numbers.join('') + special.join(''),
      );

    fc.assert(
      fc.property(passwordWithoutUppercase, (password) => {
        const isValid = service.validatePasswordStrength(password);
        expect(isValid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: For any password without lowercase letters, validation should fail.
   */
  it('should reject passwords without lowercase letters', () => {
    // Generate passwords with uppercase, numbers, and special chars but no lowercase
    const passwordWithoutLowercase = fc
      .tuple(
        fc.array(
          fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'),
          {
            maxLength: 10,
            minLength: 5,
          },
        ),
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5'), {
          maxLength: 3,
          minLength: 1,
        }),
        fc.array(fc.constantFrom('@', '$', '!', '%', '*', '?', '&'), {
          maxLength: 3,
          minLength: 1,
        }),
      )
      .map(
        ([letters, numbers, special]) =>
          letters.join('') + numbers.join('') + special.join(''),
      );

    fc.assert(
      fc.property(passwordWithoutLowercase, (password) => {
        const isValid = service.validatePasswordStrength(password);
        expect(isValid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: For any password without numbers, validation should fail.
   */
  it('should reject passwords without numbers', () => {
    // Generate passwords with letters and special chars but no numbers
    const passwordWithoutNumbers = fc
      .tuple(
        fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e'), {
          maxLength: 5,
          minLength: 3,
        }),
        fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E'), {
          maxLength: 5,
          minLength: 3,
        }),
        fc.array(fc.constantFrom('@', '$', '!', '%', '*', '?', '&'), {
          maxLength: 3,
          minLength: 1,
        }),
      )
      .map(
        ([lower, upper, special]) =>
          lower.join('') + upper.join('') + special.join(''),
      );

    fc.assert(
      fc.property(passwordWithoutNumbers, (password) => {
        const isValid = service.validatePasswordStrength(password);
        expect(isValid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: For any password without special characters, validation should fail.
   */
  it('should reject passwords without special characters', () => {
    // Generate passwords with letters and numbers but no special chars
    const passwordWithoutSpecial = fc
      .tuple(
        fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e'), {
          maxLength: 5,
          minLength: 3,
        }),
        fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E'), {
          maxLength: 5,
          minLength: 3,
        }),
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5'), {
          maxLength: 3,
          minLength: 1,
        }),
      )
      .map(
        ([lower, upper, numbers]) =>
          lower.join('') + upper.join('') + numbers.join(''),
      );

    fc.assert(
      fc.property(passwordWithoutSpecial, (password) => {
        const isValid = service.validatePasswordStrength(password);
        expect(isValid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: For any password that meets all requirements, validation should succeed.
   */
  it('should accept passwords that meet all security requirements', () => {
    // Generate valid passwords with all required components
    const validPassword = fc
      .tuple(
        fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'), {
          maxLength: 5,
          minLength: 2,
        }),
        fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'), {
          maxLength: 5,
          minLength: 2,
        }),
        fc.array(
          fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
          {
            maxLength: 3,
            minLength: 1,
          },
        ),
        fc.array(fc.constantFrom('@', '$', '!', '%', '*', '?', '&'), {
          maxLength: 3,
          minLength: 1,
        }),
      )
      .map(
        ([lower, upper, numbers, special]) =>
          lower.join('') + upper.join('') + numbers.join('') + special.join(''),
      )
      .filter((pwd) => pwd.length >= 8); // Ensure at least 8 characters

    fc.assert(
      fc.property(validPassword, (password) => {
        const isValid = service.validatePasswordStrength(password);
        expect(isValid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: getPasswordValidationDetails should return correct failure reasons
   * for passwords missing specific requirements.
   */
  it('should provide detailed validation failures for invalid passwords', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 7 }), (password) => {
        const result = service.getPasswordValidationDetails(password);

        // Should always include TOO_SHORT for passwords < 8 chars
        expect(result.failures).toContain('TOO_SHORT');
        expect(result.isValid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: getPasswordValidationDetails should return no failures
   * for valid passwords.
   */
  it('should return no failures for valid passwords', () => {
    const validPassword = fc
      .tuple(
        fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e'), {
          maxLength: 5,
          minLength: 2,
        }),
        fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E'), {
          maxLength: 5,
          minLength: 2,
        }),
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5'), {
          maxLength: 3,
          minLength: 1,
        }),
        fc.array(fc.constantFrom('@', '$', '!', '%', '*', '?', '&'), {
          maxLength: 3,
          minLength: 1,
        }),
      )
      .map(
        ([lower, upper, numbers, special]) =>
          lower.join('') + upper.join('') + numbers.join('') + special.join(''),
      )
      .filter((pwd) => pwd.length >= 8);

    fc.assert(
      fc.property(validPassword, (password) => {
        const result = service.getPasswordValidationDetails(password);

        expect(result.failures).toHaveLength(0);
        expect(result.isValid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Validation should be consistent - calling validatePasswordStrength
   * and getPasswordValidationDetails should agree on validity.
   */
  it('should have consistent validation results between methods', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 50 }), (password) => {
        const isValid = service.validatePasswordStrength(password);
        const details = service.getPasswordValidationDetails(password);

        // Both methods should agree on validity
        expect(isValid).toBe(details.isValid);

        // If invalid, there should be failures
        if (!isValid) {
          expect(details.failures.length).toBeGreaterThan(0);
        }

        // If valid, there should be no failures
        if (isValid) {
          expect(details.failures).toHaveLength(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Empty or null passwords should always be rejected.
   */
  it('should reject empty or null passwords', () => {
    expect(service.validatePasswordStrength('')).toBe(false);
    expect(service.validatePasswordStrength(null as any)).toBe(false);
    expect(service.validatePasswordStrength(undefined as any)).toBe(false);

    const emptyResult = service.getPasswordValidationDetails('');
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.failures).toContain('TOO_SHORT');
  });

  /**
   * Property: Known valid passwords should always pass validation.
   */
  it('should accept known valid password examples', () => {
    const validPasswords = [
      'SecurePass123!',
      'MyP@ssw0rd',
      'Test1234!',
      'Abcd1234@',
      'P@ssw0rdTest',
    ];

    validPasswords.forEach((password) => {
      expect(service.validatePasswordStrength(password)).toBe(true);
      const details = service.getPasswordValidationDetails(password);
      expect(details.isValid).toBe(true);
      expect(details.failures).toHaveLength(0);
    });
  });

  /**
   * Property: Known invalid passwords should always fail validation.
   */
  it('should reject known invalid password examples', () => {
    const invalidPasswords = [
      'short', // Too short
      'nouppercase123!', // No uppercase
      'NOLOWERCASE123!', // No lowercase
      'NoNumbers!', // No numbers
      'NoSpecial123', // No special chars
      '', // Empty
      'abc', // Too short and missing requirements
    ];

    invalidPasswords.forEach((password) => {
      expect(service.validatePasswordStrength(password)).toBe(false);
      const details = service.getPasswordValidationDetails(password);
      expect(details.isValid).toBe(false);
      expect(details.failures.length).toBeGreaterThan(0);
    });
  });
});
