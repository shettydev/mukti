# Design Document - Authentication & Authorization System

## Overview

The Mukti authentication and authorization system provides secure, user-friendly access control for the platform. It implements JWT-based stateless authentication with refresh token rotation, OAuth 2.0 integration for social login, role-based access control (RBAC), and a beautiful animated UI that aligns with Mukti's design philosophy.

The system is split into two main components:

1. **Backend (NestJS)**: Handles authentication logic, token management, password hashing, OAuth flows, and session management
2. **Frontend (Next.js)**: Provides an animated authentication UI with form validation, token storage, and automatic token refresh

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Auth Modal  │  │  Auth Store  │  │  Auth Hooks  │      │
│  │  (Sign Up/In)│  │   (Zustand)  │  │ (TanStack Q) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  API Client    │                        │
│                    │  (fetch + JWT) │                        │
│                    └───────┬────────┘                        │
└────────────────────────────┼──────────────────────────────────┘
                             │ HTTPS
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                     Backend (NestJS API)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Auth Module  │  │  JWT Module  │  │ OAuth Module │        │
│  │              │  │              │  │              │        │
│  │ - Register   │  │ - Sign       │  │ - Google     │        │
│  │ - Login      │  │ - Verify     │  │ - Apple      │        │
│  │ - Refresh    │  │ - Refresh    │  │              │        │
│  │ - Logout     │  │              │  │              │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                  │                │
│         └─────────────────┴──────────────────┘                │
│                           │                                   │
│                  ┌────────▼────────┐                          │
│                  │  Guards & JWT   │                          │
│                  │    Strategy     │                          │
│                  └────────┬────────┘                          │
│                           │                                   │
│                  ┌────────▼────────┐                          │
│                  │   User Service  │                          │
│                  └────────┬────────┘                          │
│                           │                                   │
│                  ┌────────▼────────┐                          │
│                  │    MongoDB      │                          │
│                  │  (User Schema)  │                          │
│                  └─────────────────┘                          │
└────────────────────────────────────────────────────────────────┘
```

### Authentication Flow

**Registration Flow:**

```
User → Frontend Form → Validation → API POST /auth/register
  → Backend validates → Hash password → Create user → Send verification email
  → Generate JWT tokens → Return tokens → Store in frontend → Redirect to dashboard
```

**Login Flow:**

```
User → Frontend Form → API POST /auth/login
  → Backend validates credentials → Verify password hash
  → Generate JWT tokens → Return tokens → Store in frontend → Redirect to dashboard
```

**OAuth Flow:**

```
User → Click OAuth button → Redirect to provider (Google/Apple)
  → User authorizes → Provider redirects with code
  → Backend exchanges code for user info → Create/link account
  → Generate JWT tokens → Return tokens → Store in frontend → Redirect to dashboard
```

**Token Refresh Flow:**

```
Access token expires → Frontend detects 401 → POST /auth/refresh with refresh token
  → Backend validates refresh token → Generate new access token
  → Return new token → Update frontend storage → Retry original request
```

## Components and Interfaces

### Backend Components

#### 1. Auth Module (`src/modules/auth/`)

**AuthController** - Handles HTTP requests for authentication

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `POST /auth/logout` - User logout
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `POST /auth/verify-email` - Verify email with token
- `POST /auth/resend-verification` - Resend verification email

**AuthService** - Business logic for authentication

```typescript
class AuthService {
  async register(dto: RegisterDto): Promise<AuthResponse>;
  async login(dto: LoginDto): Promise<AuthResponse>;
  async refreshTokens(refreshToken: string): Promise<TokenResponse>;
  async logout(userId: string, refreshToken: string): Promise<void>;
  async forgotPassword(email: string): Promise<void>;
  async resetPassword(token: string, newPassword: string): Promise<void>;
  async verifyEmail(token: string): Promise<void>;
  async resendVerification(email: string): Promise<void>;
}
```

**JwtService** - Token generation and validation

```typescript
class JwtService {
  generateAccessToken(payload: JwtPayload): string;
  generateRefreshToken(payload: JwtPayload): string;
  verifyAccessToken(token: string): JwtPayload;
  verifyRefreshToken(token: string): JwtPayload;
  decodeToken(token: string): JwtPayload;
}
```

**PasswordService** - Password hashing and validation

```typescript
class PasswordService {
  async hashPassword(password: string): Promise<string>;
  async comparePassword(password: string, hash: string): Promise<boolean>;
  validatePasswordStrength(password: string): boolean;
}
```

**TokenService** - Refresh token management

```typescript
class TokenService {
  async createRefreshToken(userId: string, token: string): Promise<void>;
  async findRefreshToken(token: string): Promise<RefreshToken | null>;
  async revokeRefreshToken(token: string): Promise<void>;
  async revokeAllUserTokens(userId: string): Promise<void>;
}
```

**EmailService** - Email notifications

```typescript
class EmailService {
  async sendVerificationEmail(email: string, token: string): Promise<void>;
  async sendPasswordResetEmail(email: string, token: string): Promise<void>;
  async sendLoginNotification(email: string, device: string): Promise<void>;
}
```

#### 2. OAuth Module (`src/modules/auth/oauth/`)

**GoogleStrategy** - Passport strategy for Google OAuth
**AppleStrategy** - Passport strategy for Apple OAuth

**OAuthService** - OAuth provider integration

```typescript
class OAuthService {
  async authenticateWithGoogle(code: string): Promise<AuthResponse>;
  async authenticateWithApple(code: string): Promise<AuthResponse>;
  async linkGoogleAccount(userId: string, googleId: string): Promise<void>;
  async linkAppleAccount(userId: string, appleId: string): Promise<void>;
}
```

#### 3. Guards

**JwtAuthGuard** - Protects routes requiring authentication

```typescript
@Injectable()
class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean;
}
```

**RolesGuard** - Protects routes requiring specific roles

```typescript
@Injectable()
class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean;
}
```

**EmailVerifiedGuard** - Requires email verification

```typescript
@Injectable()
class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean;
}
```

#### 4. Decorators

```typescript
@CurrentUser() - Extracts user from request
@Roles(...roles: string[]) - Specifies required roles
@Public() - Marks route as public (bypasses auth)
```

### Frontend Components

#### 1. Auth Components (`src/components/auth/`)

**AuthModal** - Main authentication modal

```typescript
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signup' | 'signin';
}
```

**SignUpForm** - Registration form

```typescript
interface SignUpFormProps {
  onSuccess: (tokens: AuthTokens) => void;
  onSwitchToSignIn: () => void;
}
```

**SignInForm** - Login form

```typescript
interface SignInFormProps {
  onSuccess: (tokens: AuthTokens) => void;
  onSwitchToSignUp: () => void;
}
```

**AnimatedBackground** - Pulsing gradient background

```typescript
interface AnimatedBackgroundProps {
  colors: string[];
  duration?: number;
}
```

**OAuthButtons** - Google and Apple OAuth buttons

```typescript
interface OAuthButtonsProps {
  onGoogleClick: () => void;
  onAppleClick: () => void;
  isLoading?: boolean;
}
```

#### 2. Auth Hooks (`src/lib/hooks/`)

**useAuth** - Main authentication hook

```typescript
function useAuth() {
  return {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginDto) => Promise<void>;
    register: (data: RegisterDto) => Promise<void>;
    logout: () => Promise<void>;
    refreshTokens: () => Promise<void>;
  };
}
```

**useAuthModal** - Modal state management

```typescript
function useAuthModal() {
  return {
    isOpen: boolean;
    open: (tab?: 'signup' | 'signin') => void;
    close: () => void;
    tab: 'signup' | 'signin';
    setTab: (tab: 'signup' | 'signin') => void;
  };
}
```

#### 3. Auth Store (`src/lib/stores/auth-store.ts`)

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
}
```

#### 4. API Client (`src/lib/api/auth.ts`)

```typescript
export const authApi = {
  register: (dto: RegisterDto) => Promise<AuthResponse>;
  login: (dto: LoginDto) => Promise<AuthResponse>;
  refresh: () => Promise<TokenResponse>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  googleAuth: (code: string) => Promise<AuthResponse>;
  appleAuth: (code: string) => Promise<AuthResponse>;
};
```

## Data Models

### User Schema (MongoDB)

```typescript
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: false, select: false })
  password?: string; // Optional for OAuth users

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  phone?: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  emailVerificationExpires?: Date;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop({ type: String, enum: ['user', 'moderator', 'admin'], default: 'user' })
  role: string;

  @Prop()
  googleId?: string;

  @Prop()
  appleId?: string;

  @Prop({ type: [String], default: [] })
  refreshTokens: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  lastLoginIp?: string;

  @Prop()
  lastLoginDevice?: string;
}
```

### RefreshToken Schema (MongoDB)

```typescript
@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  deviceInfo?: string;

  @Prop()
  ipAddress?: string;

  @Prop({ default: false })
  isRevoked: boolean;
}
```

### Session Schema (MongoDB)

```typescript
@Schema({ timestamps: true })
export class Session {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  refreshToken: string;

  @Prop()
  deviceInfo: string;

  @Prop()
  ipAddress: string;

  @Prop()
  userAgent: string;

  @Prop()
  location?: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastActivityAt: Date;
}
```

### DTOs

**RegisterDto**

```typescript
export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;
}
```

**LoginDto**

```typescript
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

**AuthResponse**

```typescript
export class AuthResponse {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
}
```

**TokenResponse**

```typescript
export class TokenResponse {
  accessToken: string;
}
```

**JwtPayload**

```typescript
export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
  iat: number;
  exp: number;
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Valid registration creates user and returns tokens

_For any_ valid user registration data (first name, last name, email, password), registering should create a user account and return both access and refresh tokens.
**Validates: Requirements 1.1**

### Property 2: Duplicate email registration is rejected

_For any_ email address that already exists in the system, attempting to register with that email should return a 409 conflict error and not create a duplicate user.
**Validates: Requirements 1.2**

### Property 3: Password validation enforces security requirements

_For any_ password that violates security requirements (less than 8 characters, missing uppercase, lowercase, number, or special character), the system should reject it during registration or password reset.
**Validates: Requirements 1.3, 4.3, 11.5**

### Property 4: Phone number validation

_For any_ phone number provided during registration, the system should validate the format and only accept valid phone numbers.
**Validates: Requirements 1.7**

### Property 5: Successful registration sends verification email

_For any_ successful user registration, the system should send a verification email containing a unique token to the provided email address.
**Validates: Requirements 1.6, 5.1**

### Property 6: Valid login returns tokens

_For any_ user with valid credentials (email and password), logging in should authenticate the user and return both access and refresh tokens.
**Validates: Requirements 2.1**

### Property 7: Invalid credentials are rejected

_For any_ login attempt with invalid credentials (wrong email or password), the system should return a 401 unauthorized error and not issue tokens.
**Validates: Requirements 2.2**

### Property 8: Successful authentication creates session record

_For any_ successful authentication (login or OAuth), the system should create a session record containing device information, IP address, and location metadata.
**Validates: Requirements 2.5**

### Property 9: Token refresh with valid refresh token

_For any_ valid refresh token, calling the refresh endpoint should return a new access token without requiring re-authentication.
**Validates: Requirements 3.1**

### Property 10: Expired refresh tokens are rejected

_For any_ expired refresh token, attempting to use it for token refresh should return a 401 error and require re-authentication.
**Validates: Requirements 3.3**

### Property 11: Logout invalidates tokens

_For any_ authenticated user, logging out should invalidate both the access token and refresh token, making them unusable for subsequent requests.
**Validates: Requirements 3.4**

### Property 12: Password reset request sends email

_For any_ registered email address, requesting a password reset should send an email containing a time-limited reset token.
**Validates: Requirements 4.1**

### Property 13: Valid reset token allows password change

_For any_ valid password reset token, using it to reset the password should update the user's password and allow login with the new password.
**Validates: Requirements 4.2**

### Property 14: Password reset invalidates all sessions

_For any_ user who successfully resets their password, all existing sessions for that user should be invalidated, requiring re-authentication on all devices.
**Validates: Requirements 4.5, 11.3**

### Property 15: Email verification updates user record

_For any_ valid email verification token, verifying the email should update the user record to mark emailVerified as true.
**Validates: Requirements 5.2, 5.5**

### Property 16: New users have default role

_For any_ newly created user, the system should automatically assign the default role of "user".
**Validates: Requirements 6.1**

### Property 17: Role assignment updates permissions

_For any_ user and any valid role, assigning that role to the user should immediately update their permissions to match the role's permissions.
**Validates: Requirements 6.2, 6.4**

### Property 18: Authorization checks role requirements

_For any_ protected resource with role requirements, attempting to access it should only succeed if the user's role meets the requirements.
**Validates: Requirements 6.3**

### Property 19: Role hierarchy is enforced

_For any_ resource accessible by a lower role, users with higher roles (admin > moderator > user) should also have access to that resource.
**Validates: Requirements 6.5**

### Property 20: Session listing returns all active sessions

_For any_ authenticated user, requesting their sessions should return all active sessions with device, location, and last activity information.
**Validates: Requirements 7.1**

### Property 21: Session revocation invalidates tokens

_For any_ active session, revoking that session should immediately invalidate its refresh token, preventing further use.
**Validates: Requirements 7.2**

### Property 22: Logout from all devices revokes all sessions

_For any_ authenticated user, logging out from all devices should invalidate all sessions except the current one.
**Validates: Requirements 7.3**

### Property 23: New device login sends notification

_For any_ user logging in from a device not previously used, the system should send a notification email to the user's registered email address.
**Validates: Requirements 7.5**

### Property 24: Authenticated requests include access token

_For any_ API request to a protected endpoint, the request should include the access token in the Authorization header.
**Validates: Requirements 9.3**

### Property 25: CSRF protection for state-changing operations

_For any_ state-changing operation (POST, PUT, PATCH, DELETE), the system should validate CSRF tokens to prevent cross-site request forgery attacks.
**Validates: Requirements 9.4**

### Property 26: JWT payload contains required fields

_For any_ JWT created by the system, the payload should contain user ID, email, role, issued at time, and expiration time.
**Validates: Requirements 10.1**

### Property 27: JWT verification validates signature and expiration

_For any_ JWT presented for authentication, the system should verify the signature is valid, the token hasn't expired, and the issuer is correct.
**Validates: Requirements 10.3**

### Property 28: Passwords are hashed with bcrypt

_For any_ password stored in the system, it should be hashed using bcrypt with a cost factor of at least 12.
**Validates: Requirements 11.1**

### Property 29: Rate limiting on login attempts

_For any_ IP address, the system should limit login attempts to 5 per 15 minutes, returning a 429 error when the limit is exceeded.
**Validates: Requirements 12.1, 12.2**

### Property 30: Successful login resets rate limit

_For any_ IP address that has made failed login attempts, a successful login should reset the rate limit counter for that IP.
**Validates: Requirements 12.3**

### Property 31: Rate limiting on password reset requests

_For any_ email address, the system should limit password reset requests to 3 per hour, preventing abuse of the reset functionality.
**Validates: Requirements 12.5**

## Error Handling

### Error Response Format

All errors follow a consistent format:

```typescript
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  },
  meta: {
    timestamp: string,
    requestId: string
  }
}
```

### Error Codes

**Authentication Errors (401)**

- `INVALID_CREDENTIALS` - Email or password is incorrect
- `TOKEN_EXPIRED` - Access token has expired
- `TOKEN_INVALID` - Token signature is invalid
- `EMAIL_NOT_VERIFIED` - Email verification required

**Authorization Errors (403)**

- `INSUFFICIENT_PERMISSIONS` - User lacks required role/permission
- `ACCOUNT_DISABLED` - User account has been disabled

**Validation Errors (400)**

- `VALIDATION_ERROR` - Input validation failed
- `WEAK_PASSWORD` - Password doesn't meet security requirements
- `INVALID_EMAIL` - Email format is invalid
- `INVALID_PHONE` - Phone number format is invalid

**Conflict Errors (409)**

- `EMAIL_EXISTS` - Email already registered
- `ACCOUNT_ALREADY_LINKED` - OAuth account already linked

**Not Found Errors (404)**

- `USER_NOT_FOUND` - User doesn't exist
- `TOKEN_NOT_FOUND` - Reset/verification token not found

**Rate Limit Errors (429)**

- `TOO_MANY_REQUESTS` - Rate limit exceeded
- `TOO_MANY_LOGIN_ATTEMPTS` - Login rate limit exceeded
- `TOO_MANY_RESET_REQUESTS` - Password reset rate limit exceeded

### Error Handling Strategy

1. **Input Validation**: Use class-validator to validate all DTOs before processing
2. **Custom Exceptions**: Create domain-specific exceptions for better error messages
3. **Global Exception Filter**: Catch all exceptions and format consistently
4. **Logging**: Log all errors with context for debugging
5. **User-Friendly Messages**: Provide clear, actionable error messages to users
6. **Security**: Don't leak sensitive information in error messages (e.g., "Invalid credentials" instead of "Email not found")

## Testing Strategy

### Unit Testing

**Backend Unit Tests** (Jest)

- Test each service method in isolation with mocked dependencies
- Test password hashing and comparison
- Test JWT generation and verification
- Test validation logic
- Test error handling paths
- Target: >80% code coverage

**Frontend Unit Tests** (Jest + React Testing Library)

- Test form validation logic
- Test auth hooks
- Test auth store state management
- Test API client functions
- Target: >70% code coverage

### Property-Based Testing

**Backend Property Tests** (fast-check)

- Property 1-31 as defined in Correctness Properties section
- Use fast-check to generate random test data
- Run 100+ iterations per property
- Test edge cases automatically

**Test Data Generators**

```typescript
// User data generator
const userArb = fc.record({
  email: fc.emailAddress(),
  password: fc.string({ minLength: 8 }).filter(isStrongPassword),
  firstName: fc.string({ minLength: 2, maxLength: 50 }),
  lastName: fc.string({ minLength: 2, maxLength: 50 }),
  phone: fc.option(fc.phoneNumber()),
});

// JWT payload generator
const jwtPayloadArb = fc.record({
  sub: fc.uuid(),
  email: fc.emailAddress(),
  role: fc.constantFrom('user', 'moderator', 'admin'),
  iat: fc.integer({ min: 0 }),
  exp: fc.integer({ min: 0 }),
});
```

### Integration Testing

**API Integration Tests** (Supertest)

- Test complete authentication flows
- Test OAuth callback handling
- Test token refresh flow
- Test rate limiting
- Use test database for isolation

**E2E Tests** (Playwright)

- Test complete user registration flow
- Test login and logout flow
- Test password reset flow
- Test OAuth login flow
- Test session management UI

### Testing Tools

- **Backend**: Jest, Supertest, fast-check, mongodb-memory-server
- **Frontend**: Jest, React Testing Library, fast-check, MSW (Mock Service Worker)
- **E2E**: Playwright

### Test Organization

```
Backend:
src/modules/auth/
├── __tests__/
│   ├── auth.service.spec.ts
│   ├── jwt.service.spec.ts
│   ├── password.service.spec.ts
│   └── properties/
│       ├── registration.property.spec.ts
│       ├── authentication.property.spec.ts
│       ├── token-management.property.spec.ts
│       └── authorization.property.spec.ts

Frontend:
src/components/auth/
├── __tests__/
│   ├── auth-modal.test.tsx
│   ├── sign-up-form.test.tsx
│   └── sign-in-form.test.tsx
src/lib/hooks/
├── __tests__/
│   └── use-auth.test.ts
```

## Security Considerations

### Password Security

- Bcrypt hashing with cost factor 12
- Password complexity requirements enforced
- No password hints or recovery questions
- Passwords never logged or exposed in responses

### Token Security

- Access tokens: Short-lived (15 minutes), stored in memory
- Refresh tokens: Long-lived (7 days), stored in httpOnly cookies
- JWT signed with strong secret (256-bit minimum)
- Token rotation on refresh
- Tokens invalidated on logout and password change

### Session Security

- Session tracking with device fingerprinting
- IP address and location logging
- Suspicious activity detection
- Email notifications for new device logins
- Ability to revoke individual sessions

### API Security

- Rate limiting on all auth endpoints
- CSRF protection for state-changing operations
- HTTPS only in production
- CORS configured for allowed origins
- Input validation and sanitization

### OAuth Security

- State parameter for CSRF protection
- Nonce for replay attack prevention
- Validate OAuth provider responses
- Secure token exchange
- Account linking with confirmation

## Performance Optimization

### Backend Optimization

- Redis caching for rate limiting
- Database indexes on email, userId, tokens
- Lean queries for session listing
- Pagination for session history
- Connection pooling for database

### Frontend Optimization

- TanStack Query for automatic caching
- Optimistic updates for better UX
- Lazy loading of auth modal
- Debounced form validation
- Memoized components

### Token Management

- Access token stored in memory (no localStorage reads)
- Automatic token refresh before expiration
- Refresh token rotation to prevent reuse
- Token blacklist in Redis for revoked tokens

## Deployment Considerations

### Environment Variables

**Backend (.env)**

```
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://...
JWT_SECRET=<256-bit-secret>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
REDIS_URL=redis://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APPLE_CLIENT_ID=...
APPLE_CLIENT_SECRET=...
EMAIL_SERVICE_API_KEY=...
FRONTEND_URL=https://mukti.app
```

**Frontend (.env)**

```
NEXT_PUBLIC_API_URL=https://api.mukti.app/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_APPLE_CLIENT_ID=...
```

### Database Indexes

```typescript
// User collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ googleId: 1 }, { sparse: true });
db.users.createIndex({ appleId: 1 }, { sparse: true });
db.users.createIndex({ emailVerificationToken: 1 }, { sparse: true });
db.users.createIndex({ passwordResetToken: 1 }, { sparse: true });

// RefreshToken collection
db.refreshtokens.createIndex({ token: 1 }, { unique: true });
db.refreshtokens.createIndex({ userId: 1 });
db.refreshtokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Session collection
db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ refreshToken: 1 });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### Monitoring

- Log authentication events (login, logout, failed attempts)
- Monitor rate limit hits
- Track token refresh rates
- Alert on suspicious patterns
- Monitor OAuth provider availability

## UI/UX Design

### Animated Background

The authentication modal features a pulsing gradient background that transitions smoothly between colors:

**Color Palette:**

- Purple: `#8B5CF6` (violet-500)
- Blue: `#3B82F6` (blue-500)
- Pink: `#EC4899` (pink-500)
- Dark overlay: `rgba(0, 0, 0, 0.4)`

**Animation:**

```css
@keyframes gradientPulse {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.animated-background {
  background: linear-gradient(-45deg, #8b5cf6, #3b82f6, #ec4899, #8b5cf6);
  background-size: 400% 400%;
  animation: gradientPulse 15s ease infinite;
}
```

### Form Design

**Sign Up Form Fields:**

1. First Name (text input)
2. Last Name (text input)
3. Email (email input with icon)
4. Phone (phone input with country selector)
5. Password (password input with strength indicator)
6. Submit button (gradient, full width)
7. OAuth buttons (Google, Apple)
8. Terms & Service link

**Sign In Form Fields:**

1. Email (email input with icon)
2. Password (password input with show/hide toggle)
3. Remember me (checkbox)
4. Forgot password link
5. Submit button (gradient, full width)
6. OAuth buttons (Google, Apple)

### Validation Feedback

- Real-time validation on blur
- Inline error messages below fields
- Success indicators (green checkmark)
- Password strength meter
- Clear, actionable error messages

### Loading States

- Button spinner during submission
- Disabled form during processing
- OAuth button loading state
- Skeleton loading for session list

### Accessibility

- ARIA labels on all inputs
- Keyboard navigation support
- Focus visible indicators
- Screen reader announcements
- Color contrast WCAG AA compliant

## API Endpoints

### Authentication Endpoints

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/logout-all
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/verify-email
POST   /api/v1/auth/resend-verification
GET    /api/v1/auth/me
PATCH  /api/v1/auth/change-password
```

### OAuth Endpoints

```
GET    /api/v1/auth/google
GET    /api/v1/auth/google/callback
GET    /api/v1/auth/apple
GET    /api/v1/auth/apple/callback
```

### Session Management Endpoints

```
GET    /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:id
DELETE /api/v1/auth/sessions/all
```

## Migration Strategy

### Phase 1: Backend Implementation

1. Set up auth module structure
2. Implement user schema and repository
3. Implement password service with bcrypt
4. Implement JWT service
5. Implement auth service (register, login, refresh, logout)
6. Add guards and decorators
7. Write unit tests

### Phase 2: OAuth Integration

1. Set up Passport strategies
2. Implement Google OAuth flow
3. Implement Apple OAuth flow
4. Add account linking logic
5. Write integration tests

### Phase 3: Frontend Implementation

1. Create auth store with Zustand
2. Implement API client
3. Create auth hooks with TanStack Query
4. Build animated background component
5. Build auth modal with forms
6. Add form validation with Zod
7. Write component tests

### Phase 4: Advanced Features

1. Implement email verification
2. Implement password reset
3. Add session management
4. Implement rate limiting
5. Add RBAC
6. Write property-based tests

### Phase 5: Testing & Polish

1. E2E tests with Playwright
2. Security audit
3. Performance optimization
4. Documentation
5. Deployment

## Future Enhancements

- Multi-factor authentication (TOTP, SMS)
- Biometric authentication (WebAuthn)
- Social login providers (GitHub, Microsoft)
- Account recovery options
- Security audit logs
- Advanced session analytics
- Passwordless authentication (magic links)
- Device trust management
