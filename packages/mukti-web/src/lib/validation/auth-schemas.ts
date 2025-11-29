/**
 * Authentication form validation schemas
 *
 * Centralized Zod schemas for all authentication forms.
 * These schemas enforce security requirements and provide
 * consistent validation across the application.
 */

import { z } from 'zod';

/**
 * Password validation regex patterns
 */
const PASSWORD_PATTERNS = {
  lowercase: /[a-z]/,
  number: /\d/,
  specialChar: /[@$!%*?&]/,
  uppercase: /[A-Z]/,
} as const;

/**
 * Custom password strength validator
 *
 * Validates that password meets all security requirements:
 * - At least 8 characters
 * - Contains lowercase letter
 * - Contains uppercase letter
 * - Contains number
 * - Contains special character (@$!%*?&)
 *
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(PASSWORD_PATTERNS.lowercase, 'Password must contain at least one lowercase letter')
  .regex(PASSWORD_PATTERNS.uppercase, 'Password must contain at least one uppercase letter')
  .regex(PASSWORD_PATTERNS.number, 'Password must contain at least one number')
  .regex(
    PASSWORD_PATTERNS.specialChar,
    'Password must contain at least one special character (@$!%*?&)'
  );

/**
 * Email validation schema
 *
 * Validates email format with proper error messages
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

/**
 * Phone number validation schema
 *
 * Validates international phone numbers using E.164 format.
 * The react-phone-number-input library handles the actual formatting.
 */
export const phoneSchema = z
  .string()
  .optional()
  .refine(
    (value) => {
      // If no value provided, it's valid (optional field)
      if (!value) {
        return true;
      }

      // Basic E.164 format validation: starts with +, followed by 1-15 digits
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      return e164Regex.test(value);
    },
    {
      message: 'Please enter a valid phone number',
    }
  );

/**
 * Name validation schema
 *
 * Validates first and last names with reasonable length constraints
 */
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

/**
 * Registration form validation schema
 *
 * @example
 * ```typescript
 * const form = useForm<RegisterFormData>({
 *   resolver: zodResolver(registerSchema),
 * });
 * ```
 */
export const registerSchema = z.object({
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  password: passwordSchema,
  phone: phoneSchema,
});

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Login form validation schema
 *
 * @example
 * ```typescript
 * const form = useForm<LoginFormData>({
 *   resolver: zodResolver(loginSchema),
 * });
 * ```
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Forgot password form validation schema
 *
 * @example
 * ```typescript
 * const form = useForm<ForgotPasswordFormData>({
 *   resolver: zodResolver(forgotPasswordSchema),
 * });
 * ```
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password form validation schema
 *
 * Includes password confirmation validation to ensure
 * both passwords match.
 *
 * @example
 * ```typescript
 * const form = useForm<ResetPasswordFormData>({
 *   resolver: zodResolver(resetPasswordSchema),
 * });
 * ```
 */
export const resetPasswordSchema = z
  .object({
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    newPassword: passwordSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Change password form validation schema
 *
 * Used for authenticated users changing their password.
 * Includes current password validation.
 *
 * @example
 * ```typescript
 * const form = useForm<ChangePasswordFormData>({
 *   resolver: zodResolver(changePasswordSchema),
 * });
 * ```
 */
export const changePasswordSchema = z
  .object({
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * Email verification form validation schema
 *
 * @example
 * ```typescript
 * const form = useForm<VerifyEmailFormData>({
 *   resolver: zodResolver(verifyEmailSchema),
 * });
 * ```
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;

/**
 * Helper function to check if password meets all requirements
 *
 * @param password - Password to check
 * @returns Object with boolean flags for each requirement
 *
 * @example
 * ```typescript
 * const checks = checkPasswordRequirements('MyP@ssw0rd');
 * // Returns:
 * // {
 * //   minLength: true,
 * //   hasLowercase: true,
 * //   hasUppercase: true,
 * //   hasNumber: true,
 * //   hasSpecialChar: true,
 * //   isValid: true
 * // }
 * ```
 */
export function checkPasswordRequirements(password: string) {
  return {
    hasLowercase: PASSWORD_PATTERNS.lowercase.test(password),
    hasNumber: PASSWORD_PATTERNS.number.test(password),
    hasSpecialChar: PASSWORD_PATTERNS.specialChar.test(password),
    hasUppercase: PASSWORD_PATTERNS.uppercase.test(password),
    isValid:
      password.length >= 8 &&
      PASSWORD_PATTERNS.lowercase.test(password) &&
      PASSWORD_PATTERNS.uppercase.test(password) &&
      PASSWORD_PATTERNS.number.test(password) &&
      PASSWORD_PATTERNS.specialChar.test(password),
    minLength: password.length >= 8,
  };
}

/**
 * Helper function to check password strength
 *
 * Returns a score from 0-5 based on password criteria:
 * - Length >= 8: +1
 * - Length >= 12: +1
 * - Contains lowercase: +1
 * - Contains uppercase: +1
 * - Contains number: +1
 * - Contains special char: +1
 *
 * @param password - Password to check
 * @returns Score from 0-6
 *
 * @example
 * ```typescript
 * const strength = getPasswordStrength('MyP@ssw0rd');
 * // Returns 6 (strong)
 * ```
 */
export function getPasswordStrength(password: string): number {
  if (!password) {
    return 0;
  }

  let score = 0;

  // Length checks
  if (password.length >= 8) {
    score++;
  }
  if (password.length >= 12) {
    score++;
  }

  // Character variety checks
  if (PASSWORD_PATTERNS.lowercase.test(password)) {
    score++;
  }
  if (PASSWORD_PATTERNS.uppercase.test(password)) {
    score++;
  }
  if (PASSWORD_PATTERNS.number.test(password)) {
    score++;
  }
  if (PASSWORD_PATTERNS.specialChar.test(password)) {
    score++;
  }

  return score;
}

/**
 * Helper function to get password strength label
 *
 * @param password - Password to check
 * @returns 'weak' | 'medium' | 'strong'
 *
 * @example
 * ```typescript
 * const label = getPasswordStrengthLabel('MyP@ssw0rd');
 * // Returns 'strong'
 * ```
 */
export function getPasswordStrengthLabel(password: string): 'medium' | 'strong' | 'weak' {
  const score = getPasswordStrength(password);

  if (score <= 3) {
    return 'weak';
  }
  if (score <= 5) {
    return 'medium';
  }
  return 'strong';
}

/**
 * Helper function to validate phone number format
 *
 * Checks if phone number is in valid E.164 format
 *
 *
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidPhoneNumber('+14155552671'); // true
 * isValidPhoneNumber('415-555-2671'); // false
 * ```
 */
export function isValidPhoneNumber(phone: string | undefined): boolean {
  if (!phone) {
    return true;
  } // Optional field

  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}
