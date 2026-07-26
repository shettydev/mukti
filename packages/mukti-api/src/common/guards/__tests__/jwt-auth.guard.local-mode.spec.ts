import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { LOCAL_USER, LOCAL_USER_ID } from '../../config/local-mode';
import { JwtAuthGuard } from '../jwt-auth.guard';

/**
 * These tests exercise the REAL canActivate override, so — unlike
 * jwt-auth.guard.spec.ts — they must NOT mock @nestjs/passport (its mock sets
 * canActivate as an instance field, which would shadow the override). The real
 * parent's prototype method is spied instead.
 */
const parentProto = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
  canActivate: (ctx: ExecutionContext) => unknown;
};

function makeContext(): {
  ctx: ExecutionContext;
  req: Record<string, unknown>;
} {
  const req: Record<string, unknown> = { method: 'POST', url: '/api/v1/x' };
  const ctx = {
    getClass: () => class {},
    getHandler: () => (): void => undefined,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

describe('JwtAuthGuard — local mode bypass (MUKTI_LOCAL)', () => {
  const original = process.env.MUKTI_LOCAL;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard(new Reflector());
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.MUKTI_LOCAL;
    } else {
      process.env.MUKTI_LOCAL = original;
    }
    jest.restoreAllMocks();
  });

  it('authorizes the seeded user without a token and skips JWT validation', () => {
    process.env.MUKTI_LOCAL = '1';
    const superSpy = jest
      .spyOn(parentProto, 'canActivate')
      .mockReturnValue(true);
    const { ctx, req } = makeContext();

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    expect((req.user as { _id: unknown })._id?.toString()).toBe(LOCAL_USER_ID);
    expect((req.user as { email: string }).email).toBe(LOCAL_USER.email);
    expect((req.user as { emailVerified: boolean }).emailVerified).toBe(true);
    // Must NOT fall through to JWT validation.
    expect(superSpy).not.toHaveBeenCalled();
  });

  it('enforces JWT auth with no seeded user when the flag is off', () => {
    delete process.env.MUKTI_LOCAL;
    const superSpy = jest
      .spyOn(parentProto, 'canActivate')
      .mockReturnValue(true);
    const { ctx, req } = makeContext();

    void guard.canActivate(ctx);

    expect(req.user).toBeUndefined();
    expect(superSpy).toHaveBeenCalledTimes(1);
  });
});
