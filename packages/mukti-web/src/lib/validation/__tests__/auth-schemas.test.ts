/**
 * Tests for authentication validation schemas
 *
 */

import { describe, expect, it } from '@jest/globals';

import {
  changePasswordSchema,
  checkPasswordRequirements,
  emailSchema,
  forgotPasswordSchema,
  getPasswordStrength,
  getPasswordStrengthLabel,
  isValidPhoneNumber,
  loginSchema,
  nameSchema,
  passwordSchema,
  phoneSchema,
  registerSchema,
  resetPasswordSchema,
} from '../auth-schemas';

describe('Email Schema', () => {
  it('should accept valid email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@example.com',
      'user+tag@example.co.uk',
      'test123@test-domain.com',
    ];

    validEmails.forEach((email) => {
      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid email addresses', () => {
    const invalidEmails = ['', 'invalid', 'invalid@', '@example.com', 'test@', 'test @example.com'];

    invalidEmails.forEach((email) => {
      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(false);
    });
  });

  it('should provide appropriate error messages', () => {
    const emptyResult = emailSchema.safeParse('');
    expect(emptyResult.success).toBe(false);
    if (!emptyResult.success) {
      expect(emptyResult.error.issues[0].message).toBe('Email is required');
    }

    const invalidResult = emailSchema.safeParse('invalid');
    expect(invalidResult.success).toBe(false);
    if (!invalidResult.success) {
      expect(invalidResult.error.issues[0].message).toBe('Please enter a valid email address');
    }
  });
});

describe('Password Schema', () => {
  it('should accept valid passwords', () => {
    const validPasswords = ['MyP@ssw0rd', 'Str0ng!Pass', 'C0mpl3x@Pass', 'Test123!@#'];

    validPasswords.forEach((password) => {
      const result = passwordSchema.safeParse(password);
      expect(result.success).toBe(true);
    });
  });

  it('should reject passwords that are too short', () => {
    const result = passwordSchema.safeParse('Short1!');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 8 characters');
    }
  });

  it('should reject passwords without lowercase letters', () => {
    const result = passwordSchema.safeParse('PASSWORD123!');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('lowercase'))).toBe(true);
    }
  });

  it('should reject passwords without uppercase letters', () => {
    const result = passwordSchema.safeParse('password123!');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('uppercase'))).toBe(true);
    }
  });

  it('should reject passwords without numbers', () => {
    const result = passwordSchema.safeParse('Password!');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('number'))).toBe(true);
    }
  });

  it('should reject passwords without special characters', () => {
    const result = passwordSchema.safeParse('Password123');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('special character'))).toBe(
        true
      );
    }
  });
});

describe('Phone Schema', () => {
  it('should accept valid E.164 phone numbers', () => {
    const validPhones = ['+14155552671', '+442071838750', '+33123456789'];

    validPhones.forEach((phone) => {
      const result = phoneSchema.safeParse(phone);
      expect(result.success).toBe(true);
    });
  });

  it('should accept undefined (optional field)', () => {
    const result = phoneSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it('should accept empty string (optional field)', () => {
    const result = phoneSchema.safeParse('');
    expect(result.success).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    const invalidPhones = ['123456', '415-555-2671', '(415) 555-2671', '+1'];

    invalidPhones.forEach((phone) => {
      const result = phoneSchema.safeParse(phone);
      expect(result.success).toBe(false);
    });
  });
});

describe('Name Schema', () => {
  it('should accept valid names', () => {
    const validNames = ['John', 'Mary-Jane', "O'Brien", 'Jean-Pierre', 'Anna Maria'];

    validNames.forEach((name) => {
      const result = nameSchema.safeParse(name);
      expect(result.success).toBe(true);
    });
  });

  it('should reject names that are too short', () => {
    const result = nameSchema.safeParse('A');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 2 characters');
    }
  });

  it('should reject names that are too long', () => {
    const result = nameSchema.safeParse('A'.repeat(51));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('less than 50 characters');
    }
  });

  it('should reject names with invalid characters', () => {
    const invalidNames = ['John123', 'Mary@Jane', 'Test!Name'];

    invalidNames.forEach((name) => {
      const result = nameSchema.safeParse(name);
      expect(result.success).toBe(false);
    });
  });
});

describe('Register Schema', () => {
  it('should accept valid registration data', () => {
    const validData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'MyP@ssw0rd123',
      phone: '+14155552671',
    };

    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should accept registration without phone', () => {
    const validData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'MyP@ssw0rd123',
    };

    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject registration with invalid data', () => {
    const invalidData = {
      email: 'invalid-email',
      firstName: 'J',
      lastName: 'D',
      password: 'weak',
      phone: 'invalid',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('Login Schema', () => {
  it('should accept valid login data', () => {
    const validData = {
      email: 'test@example.com',
      password: 'anypassword',
      rememberMe: true,
    };

    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should accept login without rememberMe', () => {
    const validData = {
      email: 'test@example.com',
      password: 'anypassword',
    };

    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject login with empty password', () => {
    const invalidData = {
      email: 'test@example.com',
      password: '',
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('Forgot Password Schema', () => {
  it('should accept valid email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

describe('Reset Password Schema', () => {
  it('should accept matching passwords', () => {
    const validData = {
      confirmPassword: 'MyP@ssw0rd123',
      newPassword: 'MyP@ssw0rd123',
    };

    const result = resetPasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject non-matching passwords', () => {
    const invalidData = {
      confirmPassword: 'Different123!',
      newPassword: 'MyP@ssw0rd123',
    };

    const result = resetPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('do not match'))).toBe(
        true
      );
    }
  });

  it('should reject weak passwords', () => {
    const invalidData = {
      confirmPassword: 'weak',
      newPassword: 'weak',
    };

    const result = resetPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('Change Password Schema', () => {
  it('should accept valid password change', () => {
    const validData = {
      confirmPassword: 'NewP@ssw0rd456',
      currentPassword: 'OldP@ssw0rd123',
      newPassword: 'NewP@ssw0rd456',
    };

    const result = changePasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject when new password matches current password', () => {
    const invalidData = {
      confirmPassword: 'MyP@ssw0rd123',
      currentPassword: 'MyP@ssw0rd123',
      newPassword: 'MyP@ssw0rd123',
    };

    const result = changePasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('must be different'))).toBe(
        true
      );
    }
  });

  it('should reject when passwords do not match', () => {
    const invalidData = {
      confirmPassword: 'Different789!',
      currentPassword: 'OldP@ssw0rd123',
      newPassword: 'NewP@ssw0rd456',
    };

    const result = changePasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('Password Strength Helpers', () => {
  describe('getPasswordStrength', () => {
    it('should return 0 for empty password', () => {
      expect(getPasswordStrength('')).toBe(0);
    });

    it('should return low score for weak password', () => {
      const score = getPasswordStrength('password');
      expect(score).toBeLessThanOrEqual(3);
    });

    it('should return high score for strong password', () => {
      const score = getPasswordStrength('MyP@ssw0rd123');
      expect(score).toBeGreaterThanOrEqual(5);
    });

    it('should give bonus for length >= 12', () => {
      const shortScore = getPasswordStrength('MyP@ss0rd');
      const longScore = getPasswordStrength('MyP@ssw0rd123');
      expect(longScore).toBeGreaterThan(shortScore);
    });
  });

  describe('getPasswordStrengthLabel', () => {
    it('should return "weak" for weak passwords', () => {
      expect(getPasswordStrengthLabel('password')).toBe('weak');
      expect(getPasswordStrengthLabel('12345678')).toBe('weak');
    });

    it('should return "medium" for medium passwords', () => {
      expect(getPasswordStrengthLabel('Password1')).toBe('medium');
      expect(getPasswordStrengthLabel('Pass123!')).toBe('medium');
    });

    it('should return "strong" for strong passwords', () => {
      expect(getPasswordStrengthLabel('MyP@ssw0rd123')).toBe('strong');
      expect(getPasswordStrengthLabel('Str0ng!Password')).toBe('strong');
    });
  });

  describe('checkPasswordRequirements', () => {
    it('should check all requirements correctly', () => {
      const result = checkPasswordRequirements('MyP@ssw0rd123');
      expect(result).toEqual({
        hasLowercase: true,
        hasNumber: true,
        hasSpecialChar: true,
        hasUppercase: true,
        isValid: true,
        minLength: true,
      });
    });

    it('should identify missing requirements', () => {
      const result = checkPasswordRequirements('password');
      expect(result).toEqual({
        hasLowercase: true,
        hasNumber: false,
        hasSpecialChar: false,
        hasUppercase: false,
        isValid: false,
        minLength: true,
      });
    });

    it('should handle empty password', () => {
      const result = checkPasswordRequirements('');
      expect(result.isValid).toBe(false);
      expect(result.minLength).toBe(false);
    });
  });
});

describe('Phone Number Helpers', () => {
  describe('isValidPhoneNumber', () => {
    it('should accept valid E.164 phone numbers', () => {
      expect(isValidPhoneNumber('+14155552671')).toBe(true);
      expect(isValidPhoneNumber('+442071838750')).toBe(true);
      expect(isValidPhoneNumber('+33123456789')).toBe(true);
    });

    it('should accept undefined (optional)', () => {
      expect(isValidPhoneNumber(undefined)).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhoneNumber('123456')).toBe(false);
      expect(isValidPhoneNumber('415-555-2671')).toBe(false);
      expect(isValidPhoneNumber('+1')).toBe(false);
    });
  });
});
