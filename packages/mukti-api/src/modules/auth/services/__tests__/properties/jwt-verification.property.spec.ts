import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';

import { JwtTokenService } from '../../jwt.service';

/**
 * Property-Based Tests for JWT Verification
 *
 * Feature: auth-system, Property 27: JWT verification validates signature and expiration
 * Validates: Requirements 10.3
 *
 * These tests verify that token verification enforces signature integrity,
 * issuer validation, and expiration checks for both access and refresh tokens.
 */
describe('JwtTokenService - Property 27: JWT verification validates signature and expiration', () => {
  let service: JwtTokenService;
  let jwtService: JwtService;

  const configValues = {
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    JWT_REFRESH_SECRET: 'property-refresh-secret',
    JWT_SECRET: 'property-access-secret',
  };

  const hexLikeString = (min: number, max: number) =>
    fc
      .array(
        fc.constantFrom(
          'a',
          'b',
          'c',
          'd',
          'e',
          'f',
          '0',
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
        ),
        { maxLength: max, minLength: min },
      )
      .map((chars) => chars.join(''));

  const userPayloadArb = fc.record({
    email: fc
      .tuple(hexLikeString(3, 12), hexLikeString(3, 8))
      .map(([local, domain]) => `${local}@${domain}.com`),
    role: fc.constantFrom('user', 'admin', 'moderator'),
    sub: fc.string({ maxLength: 24, minLength: 6 }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: configValues.JWT_SECRET,
          signOptions: {
            issuer: 'mukti-api',
          },
        }),
      ],
      providers: [
        JwtTokenService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => configValues[key],
          },
        },
      ],
    }).compile();

    service = module.get<JwtTokenService>(JwtTokenService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should reject access tokens signed with an unexpected secret', () => {
    fc.assert(
      fc.property(userPayloadArb, (payload) => {
        const forgedToken = jwtService.sign(payload, {
          issuer: 'mukti-api',
          secret: `${configValues.JWT_SECRET}-mismatch`,
        });

        expect(() => service.verifyAccessToken(forgedToken)).toThrow(
          UnauthorizedException,
        );
        expect(() => service.verifyAccessToken(forgedToken)).toThrow(
          'Invalid access token',
        );
      }),
      { numRuns: 20 },
    );
  });

  it('should reject expired access tokens', () => {
    fc.assert(
      fc.property(userPayloadArb, (payload) => {
        const now = Math.floor(Date.now() / 1000);
        const expiredToken = jwtService.sign(
          {
            ...payload,
            exp: now - 30,
            iat: now - 60,
          },
          {
            issuer: 'mukti-api',
            noTimestamp: true,
            secret: configValues.JWT_SECRET,
          },
        );

        expect(() => service.verifyAccessToken(expiredToken)).toThrow(
          UnauthorizedException,
        );
        expect(() => service.verifyAccessToken(expiredToken)).toThrow(
          'Access token has expired',
        );
      }),
      { numRuns: 20 },
    );
  });

  it('should reject access tokens with the wrong issuer', () => {
    fc.assert(
      fc.property(userPayloadArb, (payload) => {
        const wrongIssuerToken = jwtService.sign(payload, {
          issuer: 'other-issuer',
          secret: configValues.JWT_SECRET,
        });

        expect(() => service.verifyAccessToken(wrongIssuerToken)).toThrow(
          UnauthorizedException,
        );
        expect(() => service.verifyAccessToken(wrongIssuerToken)).toThrow(
          'Invalid access token',
        );
      }),
      { numRuns: 20 },
    );
  });

  it('should reject refresh tokens signed with an unexpected secret', () => {
    fc.assert(
      fc.property(userPayloadArb, (payload) => {
        const forgedToken = jwtService.sign(payload, {
          issuer: 'mukti-api',
          secret: `${configValues.JWT_REFRESH_SECRET}-mismatch`,
        });

        expect(() => service.verifyRefreshToken(forgedToken)).toThrow(
          UnauthorizedException,
        );
        expect(() => service.verifyRefreshToken(forgedToken)).toThrow(
          'Invalid refresh token',
        );
      }),
      { numRuns: 20 },
    );
  });

  it('should reject expired refresh tokens', () => {
    fc.assert(
      fc.property(userPayloadArb, (payload) => {
        const now = Math.floor(Date.now() / 1000);
        const expiredToken = jwtService.sign(
          {
            ...payload,
            exp: now - 120,
            iat: now - 180,
          },
          {
            issuer: 'mukti-api',
            noTimestamp: true,
            secret: configValues.JWT_REFRESH_SECRET,
          },
        );

        expect(() => service.verifyRefreshToken(expiredToken)).toThrow(
          UnauthorizedException,
        );
        expect(() => service.verifyRefreshToken(expiredToken)).toThrow(
          'Refresh token has expired',
        );
      }),
      { numRuns: 20 },
    );
  });
});
