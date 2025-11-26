import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

/**
 * Service responsible for sending authentication-related emails.
 * Handles email verification, password reset, and security notifications.
 *
 * @remarks
 * This service uses SendGrid as the email provider. Configure the following
 * environment variables:
 * - EMAIL_API_KEY: SendGrid API key
 * - EMAIL_FROM: Sender email address
 * - FRONTEND_URL: Base URL for email links
 */
@Injectable()
export class EmailService {
  private readonly fromEmail: string;
  private readonly frontendUrl: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('EMAIL_API_KEY');
    this.fromEmail = this.configService.get<string>(
      'EMAIL_FROM',
      'noreply@mukti.app',
    );
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );

    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.logger.log('SendGrid email service initialized');
    } else {
      this.logger.warn(
        'EMAIL_API_KEY not configured - emails will be logged only',
      );
    }
  }

  /**
   * Sends a security notification when a user logs in from a new device.
   *
   * @param email - The recipient's email address
   * @param deviceInfo - Information about the device (user agent, browser, OS)
   * @param ipAddress - The IP address of the login
   * @param location - Optional location information
   * @returns Promise that resolves when email is sent
   *
   * @example
   * ```typescript
   * await emailService.sendLoginNotification(
   *   'user@example.com',
   *   'Chrome on macOS',
   *   '192.168.1.1',
   *   'San Francisco, CA'
   * );
   * ```
   */
  async sendLoginNotification(
    email: string,
    deviceInfo: string,
    ipAddress?: string,
    location?: string,
  ): Promise<void> {
    const msg = {
      from: this.fromEmail,
      html: this.getLoginNotificationTemplate(deviceInfo, ipAddress, location),
      subject: 'New Login to Your Mukti Account',
      text: `A new login was detected on your Mukti account. Device: ${deviceInfo}${ipAddress ? `, IP: ${ipAddress}` : ''}${location ? `, Location: ${location}` : ''}. If this wasn't you, please secure your account immediately.`,
      to: email,
    };

    await this.sendEmail(msg, 'login notification');
  }

  /**
   * Sends a password reset email with a time-limited token.
   *
   * @param email - The recipient's email address
   * @param token - The unique password reset token
   * @returns Promise that resolves when email is sent
   *
   * @example
   * ```typescript
   * await emailService.sendPasswordResetEmail('user@example.com', 'reset123token');
   * ```
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;

    const msg = {
      from: this.fromEmail,
      html: this.getPasswordResetEmailTemplate(resetUrl),
      subject: 'Reset Your Mukti Password',
      text: `You requested a password reset. Click the following link to reset your password: ${resetUrl}. This link expires in 1 hour.`,
      to: email,
    };

    await this.sendEmail(msg, 'password reset email');
  }

  /**
   * Sends a verification email to a newly registered user.
   *
   * @param email - The recipient's email address
   * @param token - The unique verification token
   * @returns Promise that resolves when email is sent
   *
   * @example
   * ```typescript
   * await emailService.sendVerificationEmail('user@example.com', 'abc123token');
   * ```
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`;

    const msg = {
      from: this.fromEmail,
      html: this.getVerificationEmailTemplate(verificationUrl),
      subject: 'Verify Your Mukti Account',
      text: `Welcome to Mukti! Please verify your email address by clicking the following link: ${verificationUrl}`,
      to: email,
    };

    await this.sendEmail(msg, 'verification email');
  }

  /**
   * HTML template for login notification.
   */
  private getLoginNotificationTemplate(
    deviceInfo: string,
    ipAddress?: string,
    location?: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Login Detected</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 50%, #EC4899 100%);
              border-radius: 12px;
              padding: 40px;
              text-align: center;
            }
            .content {
              background: white;
              border-radius: 8px;
              padding: 30px;
              margin-top: 20px;
            }
            h1 {
              color: white;
              margin: 0 0 10px 0;
              font-size: 28px;
            }
            .subtitle {
              color: rgba(255, 255, 255, 0.9);
              margin: 0 0 20px 0;
            }
            .info-box {
              background: #F3F4F6;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              text-align: left;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #E5E7EB;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: 600;
              color: #6B7280;
            }
            .info-value {
              color: #111827;
            }
            .warning {
              background: #FEF2F2;
              border-left: 4px solid #EF4444;
              padding: 12px;
              margin: 20px 0;
              text-align: left;
            }
            .button {
              display: inline-block;
              background: #EF4444;
              color: white;
              text-decoration: none;
              padding: 14px 32px;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>New Login Detected</h1>
            <p class="subtitle">Mukti Account Security Alert</p>
            <div class="content">
              <p>A new login was detected on your Mukti account.</p>
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">Device:</span>
                  <span class="info-value">${deviceInfo}</span>
                </div>
                ${
                  ipAddress
                    ? `
                <div class="info-row">
                  <span class="info-label">IP Address:</span>
                  <span class="info-value">${ipAddress}</span>
                </div>
                `
                    : ''
                }
                ${
                  location
                    ? `
                <div class="info-row">
                  <span class="info-label">Location:</span>
                  <span class="info-value">${location}</span>
                </div>
                `
                    : ''
                }
                <div class="info-row">
                  <span class="info-label">Time:</span>
                  <span class="info-value">${new Date().toLocaleString()}</span>
                </div>
              </div>
              <p>If this was you, you can safely ignore this email.</p>
              <div class="warning">
                <strong>⚠️ Wasn't you?</strong> If you didn't log in from this device, your account may be compromised. Please secure your account immediately by changing your password.
              </div>
              <a href="${this.frontendUrl}/auth/change-password" class="button">Change Password</a>
              <div class="footer">
                <p>You can also review and manage all active sessions in your account settings.</p>
                <p>For security questions, contact support@mukti.app</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * HTML template for password reset.
   */
  private getPasswordResetEmailTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 50%, #EC4899 100%);
              border-radius: 12px;
              padding: 40px;
              text-align: center;
            }
            .content {
              background: white;
              border-radius: 8px;
              padding: 30px;
              margin-top: 20px;
            }
            h1 {
              color: white;
              margin: 0 0 10px 0;
              font-size: 28px;
            }
            .subtitle {
              color: rgba(255, 255, 255, 0.9);
              margin: 0 0 20px 0;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #8B5CF6, #3B82F6);
              color: white;
              text-decoration: none;
              padding: 14px 32px;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
            }
            .warning {
              background: #FEF2F2;
              border-left: 4px solid #EF4444;
              padding: 12px;
              margin: 20px 0;
              text-align: left;
            }
            .footer {
              margin-top: 30px;
              font-size: 14px;
              color: #666;
            }
            .link {
              color: #3B82F6;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Password Reset Request</h1>
            <p class="subtitle">Mukti Account Security</p>
            <div class="content">
              <p>We received a request to reset your Mukti account password.</p>
              <p>Click the button below to create a new password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. After resetting your password, all active sessions will be logged out for security.
              </div>
              <div class="footer">
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p class="link">${resetUrl}</p>
                <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * HTML template for email verification.
   */
  private getVerificationEmailTemplate(verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 50%, #EC4899 100%);
              border-radius: 12px;
              padding: 40px;
              text-align: center;
            }
            .content {
              background: white;
              border-radius: 8px;
              padding: 30px;
              margin-top: 20px;
            }
            h1 {
              color: white;
              margin: 0 0 10px 0;
              font-size: 28px;
            }
            .subtitle {
              color: rgba(255, 255, 255, 0.9);
              margin: 0 0 20px 0;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #8B5CF6, #3B82F6);
              color: white;
              text-decoration: none;
              padding: 14px 32px;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              font-size: 14px;
              color: #666;
            }
            .link {
              color: #3B82F6;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Welcome to Mukti</h1>
            <p class="subtitle">Cognitive Liberation Platform</p>
            <div class="content">
              <p>Thank you for joining Mukti! We're excited to have you on your journey toward cognitive liberation.</p>
              <p>Please verify your email address to activate your account and start exploring the power of Socratic inquiry.</p>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              <div class="footer">
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p class="link">${verificationUrl}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create a Mukti account, you can safely ignore this email.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Internal method to send email via SendGrid or log in development.
   *
   * @param msg - The SendGrid message object
   * @param emailType - Description of the email type for logging
   */
  private async sendEmail(
    msg: sgMail.MailDataRequired,
    emailType: string,
  ): Promise<void> {
    const apiKey = this.configService.get<string>('EMAIL_API_KEY');

    // Extract recipient email as string for logging
    let recipientEmail = 'unknown';
    if (typeof msg.to === 'string') {
      recipientEmail = msg.to;
    } else if (Array.isArray(msg.to) && msg.to.length > 0) {
      const firstRecipient = msg.to[0];
      recipientEmail =
        typeof firstRecipient === 'string'
          ? firstRecipient
          : firstRecipient.email || 'unknown';
    } else if (msg.to && typeof msg.to === 'object' && 'email' in msg.to) {
      recipientEmail = (msg.to as { email: string }).email;
    }

    if (!apiKey) {
      // In development or when API key is not configured, log the email
      this.logger.debug(
        `[DEV MODE] Would send ${emailType} to ${recipientEmail}:`,
      );
      this.logger.debug(`Subject: ${msg.subject}`);
      this.logger.debug(`Text: ${msg.text}`);
      return;
    }

    try {
      await sgMail.send(msg);
      this.logger.log(`Successfully sent ${emailType} to ${recipientEmail}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send ${emailType} to ${recipientEmail}: ${errorMessage}`,
        errorStack,
      );
      throw new Error(`Failed to send ${emailType}`);
    }
  }
}
