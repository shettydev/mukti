# OAuth Callback Implementation

This directory contains OAuth callback handlers for Google and Apple authentication.

## Structure

```
(auth)/
├── auth/
│   ├── google/
│   │   └── callback/
│   │       └── page.tsx       # Google OAuth callback handler
│   └── apple/
│       └── callback/
│           └── page.tsx        # Apple OAuth callback handler
└── README.md                   # This file
```

## How It Works

### OAuth Flow

1. **User clicks OAuth button** in the auth modal
2. **Redirect to provider** (Google or Apple) via backend OAuth endpoint
3. **User authorizes** the application on the provider's page
4. **Provider redirects back** to our callback URL with authorization code
5. **Callback page extracts code** from URL parameters
6. **Backend exchange** - Code is sent to backend OAuth endpoint
7. **Tokens received** - Backend returns access token, refresh token, and user data
8. **Store tokens** - Tokens and user data are stored in auth store
9. **Redirect to dashboard** - User is redirected to the dashboard

### Google OAuth Callback

**URL:** `/auth/google/callback?code=...&state=...`

**Features:**

- Extracts authorization code from URL
- Handles OAuth errors from Google
- Calls backend `/auth/google/callback` endpoint
- Stores tokens and user data
- Redirects to dashboard on success
- Shows error message on failure

### Apple OAuth Callback

**URL:** `/auth/apple/callback?code=...&state=...`

**Features:**

- Extracts authorization code from URL
- Handles OAuth errors from Apple
- Calls backend `/auth/apple/callback` endpoint
- Stores tokens and user data
- Redirects to dashboard on success
- Shows error message on failure

## Error Handling

Both callback pages handle the following error scenarios:

1. **Missing authorization code** - Shows error if code is not in URL
2. **OAuth provider errors** - Displays error from provider (e.g., user cancelled)
3. **API errors** - Shows error if backend OAuth endpoint fails
4. **Network errors** - Handles connection issues gracefully

## UI States

### Loading State

- Animated spinner
- "Completing sign in with [Provider]..." message
- Gradient background matching auth modal

### Error State

- Error icon
- Clear error message
- "Return to Home" button
- Gradient background matching auth modal

## Backend Integration

The callback pages integrate with the following backend endpoints:

- `POST /auth/google/callback` - Exchange Google authorization code for tokens
- `POST /auth/apple/callback` - Exchange Apple authorization code for tokens

Both endpoints expect:

```typescript
{
  code: string; // Authorization code from OAuth provider
}
```

Both endpoints return:

```typescript
{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    emailVerified: boolean;
  }
}
```

## OAuth Button Integration

The OAuth buttons in `src/components/auth/oauth-buttons.tsx` initiate the OAuth flow by redirecting to:

- **Google:** `${API_BASE_URL}/auth/google`
- **Apple:** `${API_BASE_URL}/auth/apple`

The backend handles the OAuth provider redirect and returns to our callback URLs.

## Requirements Validated

This implementation satisfies the following requirements:

- **1.4** - Google OAuth authentication
- **1.5** - Apple OAuth authentication
- **2.3** - Google OAuth sign-in
- **2.4** - Apple OAuth sign-in

## Testing

OAuth callback pages are difficult to test in isolation due to:

- Complex OAuth flow with external providers
- URL parameter dependencies
- Router and navigation mocking challenges
- Auth store integration

**Recommended testing approach:**

- Manual testing with actual OAuth providers
- E2E tests with Playwright (see task 49)
- Integration tests at the API level

## Security Considerations

- Authorization codes are single-use and short-lived
- Tokens are stored securely (access token in memory, refresh token in httpOnly cookie)
- HTTPS required in production
- State parameter used for CSRF protection (handled by backend)
- Error messages don't leak sensitive information

## Future Enhancements

- Add loading progress indicator
- Implement retry logic for failed API calls
- Add analytics tracking for OAuth conversions
- Support for additional OAuth providers
