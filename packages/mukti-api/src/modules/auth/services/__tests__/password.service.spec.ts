import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { PasswordService } from '../password.service';

jest.mock('bcrypt');

describe('PasswordService', () => {
  let service: PasswordService;
  const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── hashPassword ──────────────────────────────────────────────────────────

  describe('hashPassword', () => {
    it('should return a bcrypt hash for a valid password', async () => {
      // Arrange
      const plaintext = 'SecurePass123!';
      const mockHash = '$2b$12$somehashedvalue';
      mockedBcrypt.hash.mockResolvedValue(mockHash as never);

      // Act
      const result = await service.hashPassword(plaintext);

      // Assert
      expect(result).toBe(mockHash);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(plaintext, 12);
    });

    it('should use bcrypt cost factor 12', async () => {
      // Arrange
      mockedBcrypt.hash.mockResolvedValue('hash' as never);

      // Act
      await service.hashPassword('AnyPass1!');

      // Assert
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(expect.any(String), 12);
    });

    it('should throw when bcrypt.hash rejects', async () => {
      // Arrange
      mockedBcrypt.hash.mockRejectedValue(
        new Error('bcrypt internal error') as never,
      );

      // Act & Assert
      await expect(service.hashPassword('SecurePass123!')).rejects.toThrow(
        'Failed to hash password',
      );
    });
  });

  // ─── comparePassword ───────────────────────────────────────────────────────

  describe('comparePassword', () => {
    it('should return true when password matches hash', async () => {
      // Arrange
      mockedBcrypt.compare.mockResolvedValue(true as never);

      // Act
      const result = await service.comparePassword(
        'SecurePass123!',
        '$2b$12$hash',
      );

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when password does not match hash', async () => {
      // Arrange
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act
      const result = await service.comparePassword(
        'WrongPass123!',
        '$2b$12$hash',
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when bcrypt.compare throws', async () => {
      // Arrange
      mockedBcrypt.compare.mockRejectedValue(
        new Error('malformed hash') as never,
      );

      // Act
      const result = await service.comparePassword(
        'SecurePass123!',
        'not-a-hash',
      );

      // Assert — should NOT rethrow; returns false defensively
      expect(result).toBe(false);
    });
  });

  // ─── validatePasswordStrength ──────────────────────────────────────────────

  describe('validatePasswordStrength', () => {
    it('should return true for a password meeting all requirements', () => {
      expect(service.validatePasswordStrength('SecurePass123!')).toBe(true);
    });

    it('should return false when password is too short (< 8 chars)', () => {
      expect(service.validatePasswordStrength('Sh0rt!')).toBe(false);
    });

    it('should return false when password has no uppercase letter', () => {
      expect(service.validatePasswordStrength('securepass123!')).toBe(false);
    });

    it('should return false when password has no lowercase letter', () => {
      expect(service.validatePasswordStrength('SECUREPASS123!')).toBe(false);
    });

    it('should return false when password has no digit', () => {
      expect(service.validatePasswordStrength('SecurePass!!!')).toBe(false);
    });

    it('should return false when password has no special character', () => {
      expect(service.validatePasswordStrength('SecurePass123')).toBe(false);
    });

    it('should return false for an empty string', () => {
      expect(service.validatePasswordStrength('')).toBe(false);
    });

    it('should accept all recognised special characters', () => {
      for (const special of ['@', '$', '!', '%', '*', '?', '&']) {
        expect(service.validatePasswordStrength(`SecurePass1${special}`)).toBe(
          true,
        );
      }
    });
  });

  // ─── getPasswordValidationDetails ─────────────────────────────────────────

  describe('getPasswordValidationDetails', () => {
    it('should return isValid=true with empty failures for a strong password', () => {
      // Arrange & Act
      const result = service.getPasswordValidationDetails('SecurePass123!');

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('should report TOO_SHORT for a password under 8 characters', () => {
      const result = service.getPasswordValidationDetails('Sh0!');
      expect(result.failures).toContain('TOO_SHORT');
      expect(result.isValid).toBe(false);
    });

    it('should report MISSING_UPPERCASE when no uppercase letter', () => {
      const result = service.getPasswordValidationDetails('securepass123!');
      expect(result.failures).toContain('MISSING_UPPERCASE');
    });

    it('should report MISSING_LOWERCASE when no lowercase letter', () => {
      const result = service.getPasswordValidationDetails('SECUREPASS123!');
      expect(result.failures).toContain('MISSING_LOWERCASE');
    });

    it('should report MISSING_NUMBER when no digit', () => {
      const result = service.getPasswordValidationDetails('SecurePass!!!');
      expect(result.failures).toContain('MISSING_NUMBER');
    });

    it('should report MISSING_SPECIAL when no special character', () => {
      const result = service.getPasswordValidationDetails('SecurePass123');
      expect(result.failures).toContain('MISSING_SPECIAL');
    });

    it('should report multiple failures for a completely weak password', () => {
      const result = service.getPasswordValidationDetails('weak');
      expect(result.failures).toContain('TOO_SHORT');
      expect(result.failures).toContain('MISSING_UPPERCASE');
      expect(result.failures).toContain('MISSING_NUMBER');
      expect(result.failures).toContain('MISSING_SPECIAL');
      expect(result.isValid).toBe(false);
    });

    it('should return isValid=false and TOO_SHORT for null-like empty string', () => {
      const result = service.getPasswordValidationDetails('');
      expect(result.failures).toContain('TOO_SHORT');
      expect(result.isValid).toBe(false);
    });
  });
});
