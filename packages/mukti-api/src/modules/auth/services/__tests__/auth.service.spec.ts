import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { User } from '../../../../schemas/user.schema';
import { AuthService } from '../auth.service';
import { EmailService } from '../email.service';
import { JwtTokenService } from '../jwt.service';
import { PasswordService } from '../password.service';
import { RateLimitService } from '../rate-limit.service';
import { TokenService } from '../token.service';

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeUserId = () => new Types.ObjectId();

const buildMockUser = (overrides: Partial<Record<string, unknown>> = {}) => {
  const id = makeUserId();
  return {
    _id: id,
    createdAt: new Date('2024-01-01'),
    email: 'test@example.com',
    emailVerificationExpires: undefined,
    emailVerificationToken: undefined,
    emailVerified: true,
    firstName: 'John',
    foundingMember: false,
    isActive: true,
    lastLoginAt: undefined,
    lastName: 'Doe',
    password: '$2b$12$hashedpassword',
    passwordResetExpires: undefined,
    passwordResetToken: undefined,
    phone: undefined,
    role: 'user',
    save: jest.fn().mockResolvedValue(undefined),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
};

// ─── describe AuthService ─────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  // mocked collaborators
  const mockUserModel: any = {
    countDocuments: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPasswordService = {
    comparePassword: jest.fn() as jest.MockedFunction<
      PasswordService['comparePassword']
    >,
    hashPassword: jest.fn() as jest.MockedFunction<
      PasswordService['hashPassword']
    >,
    validatePasswordStrength: jest.fn() as jest.MockedFunction<
      PasswordService['validatePasswordStrength']
    >,
  };

  const mockJwtService = {
    generateAccessToken: jest.fn() as jest.MockedFunction<
      JwtTokenService['generateAccessToken']
    >,
    generateRefreshToken: jest.fn() as jest.MockedFunction<
      JwtTokenService['generateRefreshToken']
    >,
    verifyRefreshToken: jest.fn() as jest.MockedFunction<
      JwtTokenService['verifyRefreshToken']
    >,
  };

  const mockTokenService = {
    createRefreshToken: jest.fn() as jest.MockedFunction<
      TokenService['createRefreshToken']
    >,
    findRefreshToken: jest.fn() as jest.MockedFunction<
      TokenService['findRefreshToken']
    >,
    revokeAllUserTokens: jest.fn() as jest.MockedFunction<
      TokenService['revokeAllUserTokens']
    >,
    revokeRefreshToken: jest.fn() as jest.MockedFunction<
      TokenService['revokeRefreshToken']
    >,
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest.fn() as jest.MockedFunction<
      EmailService['sendPasswordResetEmail']
    >,
    sendVerificationEmail: jest.fn() as jest.MockedFunction<
      EmailService['sendVerificationEmail']
    >,
  };

  const mockRateLimitService = {
    incrementLoginAttempt: jest.fn() as jest.MockedFunction<
      RateLimitService['incrementLoginAttempt']
    >,
    incrementPasswordResetAttempt: jest.fn() as jest.MockedFunction<
      RateLimitService['incrementPasswordResetAttempt']
    >,
    resetLoginRateLimit: jest.fn() as jest.MockedFunction<
      RateLimitService['resetLoginRateLimit']
    >,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: JwtTokenService, useValue: mockJwtService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: RateLimitService, useValue: mockRateLimitService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      password: 'SecurePass123!',
    };

    it('should create a user and return auth tokens when data is valid', async () => {
      // Arrange
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.countDocuments.mockResolvedValue(50);
      mockPasswordService.hashPassword.mockResolvedValue('$2b$12$hashed');
      mockUserModel.create.mockResolvedValue({
        ...buildMockUser({ email: registerDto.email }),
        emailVerified: false,
      });
      mockJwtService.generateAccessToken.mockReturnValue('access-token');
      mockJwtService.generateRefreshToken.mockReturnValue('refresh-token');
      mockTokenService.createRefreshToken.mockResolvedValue(undefined as never);
      mockEmailService.sendVerificationEmail.mockResolvedValue(
        undefined as never,
      );

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe(registerDto.email);
      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(
        registerDto.password,
      );
    });

    it('should grant foundingMember=true when fewer than 100 users exist', async () => {
      // Arrange
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.countDocuments.mockResolvedValue(99);
      mockPasswordService.hashPassword.mockResolvedValue('$2b$12$hashed');
      const createdUser = buildMockUser({
        email: registerDto.email,
        foundingMember: true,
      });
      mockUserModel.create.mockResolvedValue(createdUser);
      mockJwtService.generateAccessToken.mockReturnValue('access-token');
      mockJwtService.generateRefreshToken.mockReturnValue('refresh-token');
      mockTokenService.createRefreshToken.mockResolvedValue(undefined as never);
      mockEmailService.sendVerificationEmail.mockResolvedValue(
        undefined as never,
      );

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result.user.foundingMember).toBe(true);
    });

    it('should NOT grant foundingMember when 100 or more users exist', async () => {
      // Arrange
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.countDocuments.mockResolvedValue(100);
      mockPasswordService.hashPassword.mockResolvedValue('$2b$12$hashed');
      const createdUser = buildMockUser({
        email: registerDto.email,
        foundingMember: false,
      });
      mockUserModel.create.mockResolvedValue(createdUser);
      mockJwtService.generateAccessToken.mockReturnValue('access-token');
      mockJwtService.generateRefreshToken.mockReturnValue('refresh-token');
      mockTokenService.createRefreshToken.mockResolvedValue(undefined as never);
      mockEmailService.sendVerificationEmail.mockResolvedValue(
        undefined as never,
      );

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result.user.foundingMember).toBe(false);
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      mockUserModel.findOne.mockResolvedValue(buildMockUser());

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should still succeed even if sending the verification email fails', async () => {
      // Arrange
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.countDocuments.mockResolvedValue(10);
      mockPasswordService.hashPassword.mockResolvedValue('$2b$12$hashed');
      mockUserModel.create.mockResolvedValue(
        buildMockUser({ email: registerDto.email }),
      );
      mockJwtService.generateAccessToken.mockReturnValue('access-token');
      mockJwtService.generateRefreshToken.mockReturnValue('refresh-token');
      mockTokenService.createRefreshToken.mockResolvedValue(undefined as never);
      mockEmailService.sendVerificationEmail.mockRejectedValue(
        new Error('SMTP error'),
      );

      // Act
      const result = await service.register(registerDto);

      // Assert — registration should NOT fail because of email errors
      expect(result.accessToken).toBe('access-token');
    });

    it('should throw BadRequestException when required fields are missing', async () => {
      // Act & Assert
      await expect(
        service.register({
          email: '',
          firstName: '',
          lastName: '',
          password: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'SecurePass123!' };

    it('should return auth tokens for valid credentials', async () => {
      // Arrange
      const mockUser = buildMockUser();
      const selectMock = { select: jest.fn().mockResolvedValue(mockUser) };
      mockUserModel.findOne.mockReturnValue(selectMock);
      mockPasswordService.comparePassword.mockResolvedValue(true);
      mockJwtService.generateAccessToken.mockReturnValue('access-token');
      mockJwtService.generateRefreshToken.mockReturnValue('refresh-token');
      mockTokenService.createRefreshToken.mockResolvedValue(undefined as never);

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      const selectMock = { select: jest.fn().mockResolvedValue(null) };
      mockUserModel.findOne.mockReturnValue(selectMock);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user has no password (OAuth account)', async () => {
      // Arrange
      const oauthUser = buildMockUser({ password: undefined });
      const selectMock = { select: jest.fn().mockResolvedValue(oauthUser) };
      mockUserModel.findOne.mockReturnValue(selectMock);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      // Arrange
      const mockUser = buildMockUser();
      const selectMock = { select: jest.fn().mockResolvedValue(mockUser) };
      mockUserModel.findOne.mockReturnValue(selectMock);
      mockPasswordService.comparePassword.mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── logout ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should revoke the refresh token on logout', async () => {
      // Arrange
      mockTokenService.revokeRefreshToken.mockResolvedValue(true);

      // Act
      await service.logout('user-id', 'refresh-token');

      // Assert
      expect(mockTokenService.revokeRefreshToken).toHaveBeenCalledWith(
        'refresh-token',
      );
    });

    it('should not throw when refresh token is not found (idempotent logout)', async () => {
      // Arrange
      mockTokenService.revokeRefreshToken.mockResolvedValue(false);

      // Act & Assert — must NOT throw
      await expect(
        service.logout('user-id', 'unknown-token'),
      ).resolves.toBeUndefined();
    });
  });

  // ─── refresh ────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('should return a new access token for a valid refresh token', async () => {
      // Arrange
      const userId = makeUserId();
      mockJwtService.verifyRefreshToken.mockReturnValue({
        email: 'test@example.com',
        role: 'user',
        sub: userId.toString(),
      });
      mockTokenService.findRefreshToken.mockResolvedValue({
        expiresAt: new Date(Date.now() + 60_000),
        isRevoked: false,
        token: 'valid-refresh-token',
      });
      mockUserModel.findById.mockResolvedValue(buildMockUser({ _id: userId }));
      mockJwtService.generateAccessToken.mockReturnValue('new-access-token');

      // Act
      const result = await service.refresh('valid-refresh-token');

      // Assert
      expect(result.accessToken).toBe('new-access-token');
    });

    it('should throw UnauthorizedException when token is not in the database', async () => {
      // Arrange
      mockJwtService.verifyRefreshToken.mockReturnValue({ sub: 'user-id' });
      mockTokenService.findRefreshToken.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refresh('unknown-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is revoked', async () => {
      // Arrange
      mockJwtService.verifyRefreshToken.mockReturnValue({ sub: 'user-id' });
      mockTokenService.findRefreshToken.mockResolvedValue({
        expiresAt: new Date(Date.now() + 60_000),
        isRevoked: true,
        token: 'revoked-token',
      });

      // Act & Assert
      await expect(service.refresh('revoked-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      // Arrange
      mockJwtService.verifyRefreshToken.mockReturnValue({ sub: 'user-id' });
      mockTokenService.findRefreshToken.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
        isRevoked: false,
        token: 'expired-token',
      });

      // Act & Assert
      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when associated user is inactive', async () => {
      // Arrange
      const userId = makeUserId();
      mockJwtService.verifyRefreshToken.mockReturnValue({
        sub: userId.toString(),
      });
      mockTokenService.findRefreshToken.mockResolvedValue({
        expiresAt: new Date(Date.now() + 60_000),
        isRevoked: false,
        token: 'valid-token',
      });
      mockUserModel.findById.mockResolvedValue(
        buildMockUser({ isActive: false }),
      );

      // Act & Assert
      await expect(service.refresh('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── verifyEmail ────────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('should mark email as verified for a valid, unexpired token', async () => {
      // Arrange
      const mockUser = buildMockUser({
        emailVerificationExpires: new Date(Date.now() + 60_000),
        emailVerificationToken: 'valid-token',
        emailVerified: false,
      });
      mockUserModel.findOne.mockResolvedValue(mockUser);

      // Act
      await service.verifyEmail({ token: 'valid-token' });

      // Assert
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.emailVerified).toBe(true);
    });

    it('should be idempotent — no error when email is already verified', async () => {
      // Arrange
      const mockUser = buildMockUser({
        emailVerificationToken: 'token',
        emailVerified: true,
      });
      mockUserModel.findOne.mockResolvedValue(mockUser);

      // Act & Assert — should NOT throw
      await expect(
        service.verifyEmail({ token: 'token' }),
      ).resolves.toBeUndefined();
    });

    it('should throw BadRequestException for an invalid token', async () => {
      // Arrange
      mockUserModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.verifyEmail({ token: 'bad-token' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for an expired verification token', async () => {
      // Arrange
      const mockUser = buildMockUser({
        emailVerificationExpires: new Date(Date.now() - 1000),
        emailVerificationToken: 'expired-token',
        emailVerified: false,
      });
      mockUserModel.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.verifyEmail({ token: 'expired-token' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── forgotPassword ─────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('should generate a reset token and send the email', async () => {
      // Arrange
      const mockUser = buildMockUser();
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(
        undefined as never,
      );

      // Act
      await service.forgotPassword({ email: 'test@example.com' });

      // Assert
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        expect.any(String),
      );
    });

    it('should throw NotFoundException when user is not found', async () => {
      // Arrange
      mockUserModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.forgotPassword({ email: 'ghost@example.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for OAuth users without a password', async () => {
      // Arrange
      const oauthUser = buildMockUser({ password: undefined });
      mockUserModel.findOne.mockResolvedValue(oauthUser);

      // Act & Assert
      await expect(
        service.forgotPassword({ email: oauthUser.email }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should clear the reset token and rethrow when email sending fails', async () => {
      // Arrange
      const mockUser = buildMockUser();
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordResetEmail.mockRejectedValue(
        new Error('SMTP error'),
      );

      // Act & Assert
      await expect(
        service.forgotPassword({ email: mockUser.email }),
      ).rejects.toThrow('Failed to send password reset email');
      // save() is called twice: once to store the token, once to clear it on failure
      expect(mockUser.save).toHaveBeenCalledTimes(2);
    });
  });

  // ─── resetPassword ──────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    const resetDto = {
      newPassword: 'NewSecure123!',
      token: 'valid-reset-token',
    };

    it('should reset the password and invalidate all sessions', async () => {
      // Arrange
      const mockUser = buildMockUser({
        passwordResetExpires: new Date(Date.now() + 60_000),
        passwordResetToken: 'valid-reset-token',
      });
      const selectMock = { select: jest.fn().mockResolvedValue(mockUser) };
      mockUserModel.findOne.mockReturnValue(selectMock);
      mockPasswordService.validatePasswordStrength.mockReturnValue(true);
      mockPasswordService.hashPassword.mockResolvedValue('$2b$12$newhash');
      mockTokenService.revokeAllUserTokens.mockResolvedValue(
        undefined as never,
      );

      // Act
      await service.resetPassword(resetDto);

      // Assert
      expect(mockUser.password).toBe('$2b$12$newhash');
      expect(mockTokenService.revokeAllUserTokens).toHaveBeenCalledWith(
        mockUser._id,
      );
      expect(mockUser.passwordResetToken).toBeUndefined();
    });

    it('should throw BadRequestException for an invalid token', async () => {
      // Arrange
      const selectMock = { select: jest.fn().mockResolvedValue(null) };
      mockUserModel.findOne.mockReturnValue(selectMock);

      // Act & Assert
      await expect(service.resetPassword(resetDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for an expired reset token', async () => {
      // Arrange
      const mockUser = buildMockUser({
        passwordResetExpires: new Date(Date.now() - 1000),
        passwordResetToken: 'expired-token',
      });
      const selectMock = { select: jest.fn().mockResolvedValue(mockUser) };
      mockUserModel.findOne.mockReturnValue(selectMock);

      // Act & Assert
      await expect(
        service.resetPassword({ ...resetDto, token: 'expired-token' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when new password is too weak', async () => {
      // Arrange
      const mockUser = buildMockUser({
        passwordResetExpires: new Date(Date.now() + 60_000),
        passwordResetToken: 'valid-reset-token',
      });
      const selectMock = { select: jest.fn().mockResolvedValue(mockUser) };
      mockUserModel.findOne.mockReturnValue(selectMock);
      mockPasswordService.validatePasswordStrength.mockReturnValue(false);

      // Act & Assert
      await expect(service.resetPassword(resetDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── changePassword ─────────────────────────────────────────────────────────

  describe('changePassword', () => {
    const changeDto = {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass123!',
    };

    it('should update password and revoke all sessions on success', async () => {
      // Arrange
      const mockUser = buildMockUser();
      const selectMock = { select: jest.fn().mockResolvedValue(mockUser) };
      mockUserModel.findById.mockReturnValue(selectMock);
      mockPasswordService.comparePassword.mockResolvedValue(true);
      mockPasswordService.validatePasswordStrength.mockReturnValue(true);
      mockPasswordService.hashPassword.mockResolvedValue('$2b$12$newhash');
      mockTokenService.revokeAllUserTokens.mockResolvedValue(
        undefined as never,
      );

      // Act
      await service.changePassword('user-id', changeDto);

      // Assert
      expect(mockUser.password).toBe('$2b$12$newhash');
      expect(mockTokenService.revokeAllUserTokens).toHaveBeenCalledWith(
        mockUser._id,
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      const selectMock = { select: jest.fn().mockResolvedValue(null) };
      mockUserModel.findById.mockReturnValue(selectMock);

      // Act & Assert
      await expect(
        service.changePassword('nonexistent', changeDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for OAuth users without a password', async () => {
      // Arrange
      const oauthUser = buildMockUser({ password: undefined });
      const selectMock = { select: jest.fn().mockResolvedValue(oauthUser) };
      mockUserModel.findById.mockReturnValue(selectMock);

      // Act & Assert
      await expect(
        service.changePassword('user-id', changeDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when current password is wrong', async () => {
      // Arrange
      const mockUser = buildMockUser();
      const selectMock = { select: jest.fn().mockResolvedValue(mockUser) };
      mockUserModel.findById.mockReturnValue(selectMock);
      mockPasswordService.comparePassword.mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.changePassword('user-id', changeDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when new password is too weak', async () => {
      // Arrange
      const mockUser = buildMockUser();
      const selectMock = { select: jest.fn().mockResolvedValue(mockUser) };
      mockUserModel.findById.mockReturnValue(selectMock);
      mockPasswordService.comparePassword.mockResolvedValue(true);
      mockPasswordService.validatePasswordStrength.mockReturnValue(false);

      // Act & Assert
      await expect(
        service.changePassword('user-id', changeDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── assignRole ─────────────────────────────────────────────────────────────

  describe('assignRole', () => {
    it('should update the user role and save', async () => {
      // Arrange
      const mockUser = buildMockUser({ role: 'user' });
      mockUserModel.findById.mockResolvedValue(mockUser);

      // Act
      await service.assignRole(mockUser._id.toString(), 'moderator');

      // Assert
      expect(mockUser.role).toBe('moderator');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not found', async () => {
      // Arrange
      mockUserModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.assignRole('nonexistent', 'admin')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for an invalid role', async () => {
      // Act & Assert
      await expect(
        service.assignRole('user-id', 'superadmin' as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getUserById ─────────────────────────────────────────────────────────────

  describe('getUserById', () => {
    it('should return the user when found', async () => {
      // Arrange
      const mockUser = buildMockUser();
      mockUserModel.findById.mockResolvedValue(mockUser);

      // Act
      const result = await service.getUserById(mockUser._id.toString());

      // Assert
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw NotFoundException when user is not found', async () => {
      // Arrange
      mockUserModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
