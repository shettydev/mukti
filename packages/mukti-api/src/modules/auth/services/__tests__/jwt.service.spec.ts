import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

import { JwtTokenService } from '../jwt.service';

describe('JwtTokenService', () => {
  let service: JwtTokenService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_SECRET: 'test-secret',
      };
      return config[key];
    }),
  };

  const mockJwtService = {
    decode: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtTokenService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<JwtTokenService>(JwtTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate an access token with correct payload', () => {
      const payload = {
        email: 'test@example.com',
        role: 'user',
        sub: 'user123',
      };

      mockJwtService.sign.mockReturnValue('mock-access-token');

      const result = service.generateAccessToken(payload);

      expect(result).toBe('mock-access-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          email: payload.email,
          role: payload.role,
          sub: payload.sub,
        },
        {
          expiresIn: '15m',
          issuer: 'mukti-api',
        },
      );
    });

    it('should throw error if token generation fails', () => {
      const payload = {
        email: 'test@example.com',
        role: 'user',
        sub: 'user123',
      };

      mockJwtService.sign.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      expect(() => service.generateAccessToken(payload)).toThrow(
        'Token generation failed',
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token with correct payload and secret', () => {
      const payload = {
        email: 'test@example.com',
        role: 'user',
        sub: 'user123',
      };

      mockJwtService.sign.mockReturnValue('mock-refresh-token');

      const result = service.generateRefreshToken(payload);

      expect(result).toBe('mock-refresh-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          email: payload.email,
          role: payload.role,
          sub: payload.sub,
        },
        {
          expiresIn: '7d',
          issuer: 'mukti-api',
          secret: 'test-refresh-secret',
        },
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and return payload for valid access token', () => {
      const mockPayload = {
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 900,
        iat: Math.floor(Date.now() / 1000),
        role: 'user',
        sub: 'user123',
      };

      mockJwtService.verify.mockReturnValue(mockPayload);

      const result = service.verifyAccessToken('valid-token');

      expect(result).toEqual(mockPayload);
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token', {
        issuer: 'mukti-api',
      });
    });

    it('should throw UnauthorizedException for expired token', () => {
      mockJwtService.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      expect(() => service.verifyAccessToken('expired-token')).toThrow(
        UnauthorizedException,
      );
      expect(() => service.verifyAccessToken('expired-token')).toThrow(
        'Access token has expired',
      );
    });

    it('should throw UnauthorizedException for invalid token', () => {
      mockJwtService.verify.mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      expect(() => service.verifyAccessToken('invalid-token')).toThrow(
        UnauthorizedException,
      );
      expect(() => service.verifyAccessToken('invalid-token')).toThrow(
        'Invalid access token',
      );
    });

    it('should throw UnauthorizedException for token missing required fields', () => {
      const mockPayload = {
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 900,
        iat: Math.floor(Date.now() / 1000),
        role: 'user',
        // Missing 'sub' field
        sub: '',
      };

      mockJwtService.verify.mockReturnValue(mockPayload);

      expect(() => service.verifyAccessToken('incomplete-token')).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and return payload for valid refresh token', () => {
      const mockPayload = {
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 604800,
        iat: Math.floor(Date.now() / 1000),
        role: 'user',
        sub: 'user123',
      };

      mockJwtService.verify.mockReturnValue(mockPayload);

      const result = service.verifyRefreshToken('valid-refresh-token');

      expect(result).toEqual(mockPayload);
      expect(mockJwtService.verify).toHaveBeenCalledWith(
        'valid-refresh-token',
        {
          issuer: 'mukti-api',
          secret: 'test-refresh-secret',
        },
      );
    });

    it('should throw UnauthorizedException for expired refresh token', () => {
      mockJwtService.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      expect(() => service.verifyRefreshToken('expired-token')).toThrow(
        UnauthorizedException,
      );
      expect(() => service.verifyRefreshToken('expired-token')).toThrow(
        'Refresh token has expired',
      );
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const mockPayload = {
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 900,
        iat: Math.floor(Date.now() / 1000),
        role: 'user',
        sub: 'user123',
      };

      mockJwtService.decode.mockReturnValue(mockPayload);

      const result = service.decodeToken('some-token');

      expect(result).toEqual(mockPayload);
      expect(mockJwtService.decode).toHaveBeenCalledWith('some-token');
    });

    it('should return null for invalid token', () => {
      mockJwtService.decode.mockReturnValue(null);

      const result = service.decodeToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null if decode returns string', () => {
      mockJwtService.decode.mockReturnValue('string-payload');

      const result = service.decodeToken('token');

      expect(result).toBeNull();
    });

    it('should return null if decoding throws error', () => {
      mockJwtService.decode.mockImplementation(() => {
        throw new Error('Decode failed');
      });

      const result = service.decodeToken('bad-token');

      expect(result).toBeNull();
    });
  });
});
