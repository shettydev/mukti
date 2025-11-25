import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';

import { PasswordService } from '../../password.service';

/**
 * Property-Based Tests for Password Hashing
 *
 * Feature: auth-system, Property 28: Passwords are hashed with bcrypt
 * Validates: Requirements 11.1
 *
 * These tests verify that passwords are securely hashed using bcrypt
 * with a cost factor of at least 12, ensuring cryptographic security.
 */
describe('PasswordService - Property 28: Passwords are hashed with bcrypt', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  /**
   * Property: For any password string, hashing should produce a bcrypt hash
   * that starts with the bcrypt identifier and contains the cost factor.
   */
  it('should hash all passwords with bcrypt format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 72, minLength: 1 }), // bcrypt max length is 72
        async (password) => {
          const hash = await service.hashPassword(password);

          // Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
          const bcryptPattern = /^\$2[aby]\$\d{2}\$/;
          expect(hash).toMatch(bcryptPattern);

          // Verify the hash is not the plaintext password
          expect(hash).not.toBe(password);

          // Verify hash length is appropriate for bcrypt (60 characters)
          expect(hash.length).toBe(60);
        },
      ),
      { numRuns: 20 }, // Reduced runs due to bcrypt computational cost
    );
  }, 120000); // 120 second timeout

  /**
   * Property: For any password, the hash should contain cost factor 12
   * as specified in the requirements.
   */
  it('should use cost factor 12 for all password hashes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 72, minLength: 1 }),
        async (password) => {
          const hash = await service.hashPassword(password);

          // Extract cost factor from bcrypt hash (format: $2a$12$...)
          const costFactorMatch = /^\$2[aby]\$(\d{2})\$/.exec(hash);
          expect(costFactorMatch).not.toBeNull();

          const costFactor = parseInt(costFactorMatch![1], 10);
          expect(costFactor).toBe(12);
        },
      ),
      { numRuns: 20 },
    );
  }, 120000);

  /**
   * Property: For any password, hashing twice should produce different hashes
   * due to bcrypt's salt generation (non-deterministic hashing).
   */
  it('should produce different hashes for the same password (salted)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 72, minLength: 1 }),
        async (password) => {
          const hash1 = await service.hashPassword(password);
          const hash2 = await service.hashPassword(password);

          // Different hashes due to different salts
          expect(hash1).not.toBe(hash2);

          // But both should verify against the original password
          const isValid1 = await service.comparePassword(password, hash1);
          const isValid2 = await service.comparePassword(password, hash2);

          expect(isValid1).toBe(true);
          expect(isValid2).toBe(true);
        },
      ),
      { numRuns: 10 }, // Fewer runs since we hash twice per test
    );
  }, 120000);

  /**
   * Property: For any password and its hash, comparePassword should return true
   * (round-trip property).
   */
  it('should verify that hashed passwords can be compared successfully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 72, minLength: 1 }),
        async (password) => {
          const hash = await service.hashPassword(password);
          const isValid = await service.comparePassword(password, hash);

          expect(isValid).toBe(true);
        },
      ),
      { numRuns: 20 },
    );
  }, 120000);

  /**
   * Property: For any password and a different password, comparePassword
   * should return false (ensures hash integrity).
   */
  it('should reject incorrect passwords for any hash', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 72, minLength: 1 }),
        fc.string({ maxLength: 72, minLength: 1 }),
        async (password1, password2) => {
          // Skip if passwords are the same
          fc.pre(password1 !== password2);

          const hash = await service.hashPassword(password1);
          const isValid = await service.comparePassword(password2, hash);

          expect(isValid).toBe(false);
        },
      ),
      { numRuns: 20 },
    );
  }, 120000);

  /**
   * Property: Hashing should handle edge cases like special characters,
   * numbers, and various string types.
   */
  it('should handle various character types in passwords', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 72, minLength: 1 }),
        async (password) => {
          const hash = await service.hashPassword(password);

          // Should produce valid bcrypt hash
          expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);

          // Should verify correctly
          const isValid = await service.comparePassword(password, hash);
          expect(isValid).toBe(true);
        },
      ),
      { numRuns: 20 },
    );
  }, 120000);
});
