import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

/**
 * Google OAuth 2.0 Strategy
 *
 * Implements Passport strategy for Google OAuth authentication.
 * Handles the OAuth flow and extracts user profile information.
 *
 * @remarks
 * This strategy is used by the /auth/google and /auth/google/callback endpoints.
 * It validates the OAuth token with Google and returns user profile data.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientID || !clientSecret) {
      throw new Error(
        'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
      );
    }

    super({
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ??
        'http://localhost:3001/api/v1/auth/google/callback',
      clientID,
      clientSecret,
      scope: ['email', 'profile'],
    });
  }

  /**
   * Validates the OAuth token and extracts user profile
   *
   * @param accessToken - Google access token
   * @param refreshToken - Google refresh token
   * @param profile - User profile from Google
   * @param done - Callback function
   */
  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const { emails, id, name, photos } = profile;

    const user = {
      email: emails?.[0]?.value,
      firstName: name?.givenName,
      googleId: id,
      lastName: name?.familyName,
      photo: photos?.[0]?.value,
    };

    done(null, user);
  }
}
