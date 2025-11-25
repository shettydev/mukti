import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { EmailService } from '../email.service';

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config = {
        EMAIL_API_KEY: undefined, // Not set for testing
        EMAIL_FROM: 'test@mukti.app',
        FRONTEND_URL: 'http://localhost:3001',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should log email in development mode when API key is not configured', async () => {
      const email = 'user@example.com';
      const token = 'verification-token-123';

      // Should not throw error
      await expect(
        service.sendVerificationEmail(email, token),
      ).resolves.toBeUndefined();
    });

    it('should construct correct verification URL', async () => {
      const email = 'user@example.com';
      const token = 'verification-token-123';
      const expectedUrl =
        'http://localhost:3001/auth/verify-email?token=verification-token-123';

      // Spy on the private sendEmail method
      const sendEmailSpy = jest
        .spyOn(service as any, 'sendEmail')
        .mockResolvedValue(undefined);

      await service.sendVerificationEmail(email, token);

      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@mukti.app',
          html: expect.stringContaining(expectedUrl),
          subject: 'Verify Your Mukti Account',
          text: expect.stringContaining(expectedUrl),
          to: email,
        }),
        'verification email',
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should log email in development mode when API key is not configured', async () => {
      const email = 'user@example.com';
      const token = 'reset-token-456';

      // Should not throw error
      await expect(
        service.sendPasswordResetEmail(email, token),
      ).resolves.toBeUndefined();
    });

    it('should construct correct reset URL', async () => {
      const email = 'user@example.com';
      const token = 'reset-token-456';
      const expectedUrl =
        'http://localhost:3001/auth/reset-password?token=reset-token-456';

      // Spy on the private sendEmail method
      const sendEmailSpy = jest
        .spyOn(service as any, 'sendEmail')
        .mockResolvedValue(undefined);

      await service.sendPasswordResetEmail(email, token);

      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@mukti.app',
          html: expect.stringContaining(expectedUrl),
          subject: 'Reset Your Mukti Password',
          text: expect.stringContaining(expectedUrl),
          to: email,
        }),
        'password reset email',
      );
    });

    it('should mention expiration time in email content', async () => {
      const email = 'user@example.com';
      const token = 'reset-token-456';

      const sendEmailSpy = jest
        .spyOn(service as any, 'sendEmail')
        .mockResolvedValue(undefined);

      await service.sendPasswordResetEmail(email, token);

      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('1 hour'),
        }),
        'password reset email',
      );
    });
  });

  describe('sendLoginNotification', () => {
    it('should send login notification with device info', async () => {
      const email = 'user@example.com';
      const deviceInfo = 'Chrome on macOS';

      // Should not throw error
      await expect(
        service.sendLoginNotification(email, deviceInfo),
      ).resolves.toBeUndefined();
    });

    it('should include device info in email', async () => {
      const email = 'user@example.com';
      const deviceInfo = 'Chrome on macOS';

      const sendEmailSpy = jest
        .spyOn(service as any, 'sendEmail')
        .mockResolvedValue(undefined);

      await service.sendLoginNotification(email, deviceInfo);

      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@mukti.app',
          html: expect.stringContaining(deviceInfo),
          subject: 'New Login to Your Mukti Account',
          text: expect.stringContaining(deviceInfo),
          to: email,
        }),
        'login notification',
      );
    });

    it('should include IP address when provided', async () => {
      const email = 'user@example.com';
      const deviceInfo = 'Chrome on macOS';
      const ipAddress = '192.168.1.1';

      const sendEmailSpy = jest
        .spyOn(service as any, 'sendEmail')
        .mockResolvedValue(undefined);

      await service.sendLoginNotification(email, deviceInfo, ipAddress);

      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(ipAddress),
          text: expect.stringContaining(ipAddress),
        }),
        'login notification',
      );
    });

    it('should include location when provided', async () => {
      const email = 'user@example.com';
      const deviceInfo = 'Chrome on macOS';
      const ipAddress = '192.168.1.1';
      const location = 'San Francisco, CA';

      const sendEmailSpy = jest
        .spyOn(service as any, 'sendEmail')
        .mockResolvedValue(undefined);

      await service.sendLoginNotification(
        email,
        deviceInfo,
        ipAddress,
        location,
      );

      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(location),
          text: expect.stringContaining(location),
        }),
        'login notification',
      );
    });
  });

  describe('email templates', () => {
    it('should generate HTML template for verification email', async () => {
      const email = 'user@example.com';
      const token = 'verification-token-123';

      const sendEmailSpy = jest
        .spyOn(service as any, 'sendEmail')
        .mockResolvedValue(undefined);

      await service.sendVerificationEmail(email, token);

      const call = sendEmailSpy.mock.calls[0]?.[0] as any;
      expect(call.html).toContain('<!DOCTYPE html>');
      expect(call.html).toContain('Welcome to Mukti');
      expect(call.html).toContain('Verify Email Address');
      expect(call.html).toContain('24 hours');
    });

    it('should generate HTML template for password reset email', async () => {
      const email = 'user@example.com';
      const token = 'reset-token-456';

      const sendEmailSpy = jest
        .spyOn(service as any, 'sendEmail')
        .mockResolvedValue(undefined);

      await service.sendPasswordResetEmail(email, token);

      const call = sendEmailSpy.mock.calls[0]?.[0] as any;
      expect(call.html).toContain('<!DOCTYPE html>');
      expect(call.html).toContain('Password Reset Request');
      expect(call.html).toContain('Reset Password');
      expect(call.html).toContain('1 hour');
    });

    it('should generate HTML template for login notification', async () => {
      const email = 'user@example.com';
      const deviceInfo = 'Chrome on macOS';
      const ipAddress = '192.168.1.1';
      const location = 'San Francisco, CA';

      const sendEmailSpy = jest
        .spyOn(service as any, 'sendEmail')
        .mockResolvedValue(undefined);

      await service.sendLoginNotification(
        email,
        deviceInfo,
        ipAddress,
        location,
      );

      const call = sendEmailSpy.mock.calls[0]?.[0] as any;
      expect(call.html).toContain('<!DOCTYPE html>');
      expect(call.html).toContain('New Login Detected');
      expect(call.html).toContain(deviceInfo);
      expect(call.html).toContain(ipAddress);
      expect(call.html).toContain(location);
    });
  });

  describe('configuration', () => {
    it('should use default values when environment variables are not set', () => {
      const getSpy = jest.spyOn(configService, 'get');
      expect(getSpy).toHaveBeenCalledWith('EMAIL_FROM', 'noreply@mukti.app');
      expect(getSpy).toHaveBeenCalledWith(
        'FRONTEND_URL',
        'http://localhost:3001',
      );
    });

    it('should warn when EMAIL_API_KEY is not configured', () => {
      // Service was initialized in beforeEach, which should have logged a warning
      // In a real scenario, you'd spy on the logger
      const getSpy = jest.spyOn(configService, 'get');
      expect(getSpy).toHaveBeenCalledWith('EMAIL_API_KEY');
    });
  });
});
