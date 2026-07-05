import type { ExecutionContext } from '@nestjs/common';

import { ForbiddenException } from '@nestjs/common';

import type { User } from '../../../schemas/user.schema';

import { EmailVerifiedGuard } from '../email-verified.guard';

const makeContext = (user: Partial<User> | undefined): ExecutionContext =>
  ({
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('EmailVerifiedGuard', () => {
  let guard: EmailVerifiedGuard;

  beforeEach(() => {
    guard = new EmailVerifiedGuard();
  });

  describe('verified email', () => {
    it('allows access when user email is verified', () => {
      // Arrange
      const ctx = makeContext({
        _id: { toString: () => 'user-id-1' } as any,
        emailVerified: true,
      });

      // Act
      const result = guard.canActivate(ctx);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('unverified email', () => {
    it('throws ForbiddenException when emailVerified is false', () => {
      // Arrange
      const ctx = makeContext({
        _id: { toString: () => 'user-id-2' } as any,
        emailVerified: false,
      });

      // Act & Assert
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when emailVerified is undefined', () => {
      // Arrange
      const ctx = makeContext({
        _id: { toString: () => 'user-id-3' } as any,
        emailVerified: undefined as any,
      });

      // Act & Assert
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('missing user', () => {
    it('throws ForbiddenException when no user is on the request', () => {
      // Arrange
      const ctx = makeContext(undefined);

      // Act & Assert
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('error message content', () => {
    it('includes a message about email verification when email is unverified', () => {
      // Arrange
      const ctx = makeContext({
        _id: { toString: () => 'user-id-4' } as any,
        emailVerified: false,
      });

      // Act & Assert
      try {
        guard.canActivate(ctx);
        fail('expected ForbiddenException to be thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect((err as ForbiddenException).message).toMatch(/email/i);
      }
    });

    it('includes a message about authentication when no user present', () => {
      // Arrange
      const ctx = makeContext(undefined);

      // Act & Assert
      try {
        guard.canActivate(ctx);
        fail('expected ForbiddenException to be thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect((err as ForbiddenException).message).toMatch(/authenticated/i);
      }
    });
  });
});
