import type { ExecutionContext } from '@nestjs/common';

import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { User } from '../../../schemas/user.schema';

import { RolesGuard } from '../roles.guard';

const noop = (): void => undefined;

const makeUser = (role: string): Partial<User> => ({
  _id: { toString: () => 'user-id-123' } as any,
  role: role as any,
});

const makeContext = (
  user: Partial<User> | undefined,
  handler: () => void,
): ExecutionContext =>
  ({
    getClass: jest.fn().mockReturnValue(class TestController {}),
    getHandler: jest.fn().mockReturnValue(handler),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  describe('no roles required', () => {
    it('allows access when no @Roles() decorator is present', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const ctx = makeContext(makeUser('user'), noop);

      // Act
      const result = guard.canActivate(ctx);

      // Assert
      expect(result).toBe(true);
    });

    it('allows access when @Roles() is set to an empty array', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const ctx = makeContext(makeUser('user'), noop);

      // Act
      const result = guard.canActivate(ctx);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('exact role match', () => {
    it('allows a user with the exact required role', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['user']);
      const ctx = makeContext(makeUser('user'), noop);

      // Act
      const result = guard.canActivate(ctx);

      // Assert
      expect(result).toBe(true);
    });

    it('denies a user whose role is below the required role', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['moderator']);
      const ctx = makeContext(makeUser('user'), noop);

      // Act & Assert
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('role hierarchy', () => {
    it('allows admin to access a route requiring moderator', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['moderator']);
      const ctx = makeContext(makeUser('admin'), noop);

      // Act
      const result = guard.canActivate(ctx);

      // Assert
      expect(result).toBe(true);
    });

    it('allows admin to access a route requiring user', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['user']);
      const ctx = makeContext(makeUser('admin'), noop);

      // Act
      const result = guard.canActivate(ctx);

      // Assert
      expect(result).toBe(true);
    });

    it('allows moderator to access a route requiring user', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['user']);
      const ctx = makeContext(makeUser('moderator'), noop);

      // Act
      const result = guard.canActivate(ctx);

      // Assert
      expect(result).toBe(true);
    });

    it('denies moderator from accessing a route requiring admin', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      const ctx = makeContext(makeUser('moderator'), noop);

      // Act & Assert
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('denies user from accessing a route requiring admin', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      const ctx = makeContext(makeUser('user'), noop);

      // Act & Assert
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('multiple required roles', () => {
    it('allows access when user matches one of several required roles', () => {
      // Arrange
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['admin', 'moderator']);
      const ctx = makeContext(makeUser('moderator'), noop);

      // Act
      const result = guard.canActivate(ctx);

      // Assert
      expect(result).toBe(true);
    });

    it('denies access when user matches none of the required roles', () => {
      // Arrange
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['admin', 'moderator']);
      const ctx = makeContext(makeUser('user'), noop);

      // Act & Assert
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('missing or unknown user', () => {
    it('throws ForbiddenException when no user is on the request', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['user']);
      const ctx = makeContext(undefined, noop);

      // Act & Assert
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('denies access for a user with an unrecognised role', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['user']);
      const ctx = makeContext(makeUser('unknown-role'), noop);

      // Act & Assert
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });
});
