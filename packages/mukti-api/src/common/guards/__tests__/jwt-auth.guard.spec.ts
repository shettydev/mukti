import type { ExecutionContext } from '@nestjs/common';

import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import { JwtAuthGuard } from '../jwt-auth.guard';

// Passport's AuthGuard is heavy; stub the base class so tests stay unit-level.
jest.mock('@nestjs/passport', () => {
  const canActivateMock = jest.fn().mockReturnValue(true);

  class MockAuthGuard {
    canActivate = canActivateMock;
    handleRequest<TUser>(_err: unknown, user: TUser): TUser {
      return user;
    }
  }

  return {
    __canActivateMock: canActivateMock,
    AuthGuard: jest.fn().mockReturnValue(MockAuthGuard),
  };
});

const makeContext = (
  isPublic: boolean | undefined,
  method = 'GET',
  url = '/api/v1/resource',
): ExecutionContext =>
  ({
    getClass: jest.fn().mockReturnValue(class TestController {}),
    getHandler: jest.fn().mockReturnValue(() => {}),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ method, url }),
    }),
  }) as unknown as ExecutionContext;

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
    jest.clearAllMocks();
  });

  describe('public routes', () => {
    it('returns true immediately for routes marked @Public()', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === IS_PUBLIC_KEY) {
          return true;
        }
        return undefined;
      });
      const ctx = makeContext(true, 'POST', '/api/v1/auth/register');

      // Act
      const result = guard.canActivate(ctx);

      // Assert
      expect(result).toBe(true);
    });

    it('returns true without inspecting the token for public routes', () => {
      // Arrange — route is public; no token on the request
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const ctx = makeContext(true, 'POST', '/api/v1/auth/login');

      // Act — should never reach passport validation
      const result = guard.canActivate(ctx);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('protected routes', () => {
    it('delegates to the parent AuthGuard for non-public routes', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const ctx = makeContext(false, 'GET', '/api/v1/conversations');

      // The parent mock returns true by default
      const result = guard.canActivate(ctx);

      // Assert — result comes from parent (mocked to true)
      expect(result).toBe(true);
    });
  });

  const fakeCtx = makeContext(false);

  describe('handleRequest — token errors', () => {
    it('throws UnauthorizedException with expiry message for TokenExpiredError', () => {
      // Arrange
      const info = { message: 'jwt expired', name: 'TokenExpiredError' };

      // Act & Assert
      expect(() =>
        guard.handleRequest(null, false, info as any, fakeCtx),
      ).toThrow(UnauthorizedException);

      try {
        guard.handleRequest(null, false, info as any, fakeCtx);
      } catch (err) {
        expect((err as UnauthorizedException).message).toMatch(/expired/i);
      }
    });

    it('throws UnauthorizedException with invalid token message for JsonWebTokenError', () => {
      // Arrange
      const info = { message: 'invalid signature', name: 'JsonWebTokenError' };

      // Act & Assert
      expect(() =>
        guard.handleRequest(null, false, info as any, fakeCtx),
      ).toThrow(UnauthorizedException);

      try {
        guard.handleRequest(null, false, info as any, fakeCtx);
      } catch (err) {
        expect((err as UnauthorizedException).message).toMatch(/invalid/i);
      }
    });

    it('throws UnauthorizedException when no auth token is provided', () => {
      // Arrange
      const info = { message: 'No auth token' };

      // Act & Assert
      expect(() =>
        guard.handleRequest(null, false, info as any, fakeCtx),
      ).toThrow(UnauthorizedException);

      try {
        guard.handleRequest(null, false, info as any, fakeCtx);
      } catch (err) {
        expect((err as UnauthorizedException).message).toMatch(
          /no authentication token/i,
        );
      }
    });

    it('throws UnauthorizedException for a generic authentication failure', () => {
      // Arrange — no specific info
      expect(() =>
        guard.handleRequest(null, false, undefined, fakeCtx),
      ).toThrow(UnauthorizedException);
    });

    it('re-throws the original error when err is non-null', () => {
      // Arrange
      const originalError = new Error('passport strategy error');

      // Act & Assert
      expect(() =>
        guard.handleRequest(originalError, false, undefined, fakeCtx),
      ).toThrow(originalError);
    });
  });

  describe('handleRequest — success', () => {
    it('returns the authenticated user when credentials are valid', () => {
      // Arrange
      const user = { _id: 'user-id-1', email: 'test@example.com' };

      // Act
      const result = guard.handleRequest(null, user as any, undefined, fakeCtx);

      // Assert
      expect(result).toBe(user);
    });
  });
});
