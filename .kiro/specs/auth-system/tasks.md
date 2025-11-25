# Implementation Plan - Authentication & Authorization System

- [x] 1. Set up backend auth module structure
  - Create `src/modules/auth/` directory with subdirectories for dto, guards, strategies, services
  - Create auth.module.ts with necessary imports
  - Set up JWT module configuration
  - Install required dependencies: @nestjs/jwt, @nestjs/passport, passport, passport-jwt, passport-google-oauth20, passport-apple, bcrypt, class-validator, class-transformer
  - _Requirements: All_

- [x] 2. Implement user schema and database setup
  - Create User schema in `src/schemas/user.schema.ts` with all required fields (email, password, firstName, lastName, phone, emailVerified, role, OAuth IDs, etc.)
  - Create RefreshToken schema in `src/schemas/refresh-token.schema.ts`
  - Create Session schema in `src/schemas/session.schema.ts`
  - Add database indexes for performance (email, tokens, userId)
  - _Requirements: 1.1, 2.1, 6.1, 7.1_

- [x] 3. Implement password service
  - Create `src/modules/auth/services/password.service.ts`
  - Implement password hashing with bcrypt (cost factor 12)
  - Implement password comparison with constant-time comparison
  - Implement password strength validation (8 chars, uppercase, lowercase, number, special char)
  - _Requirements: 1.3, 11.1, 11.2, 11.5_

- [x] 3.1 Write property test for password hashing
  - **Property 28: Passwords are hashed with bcrypt**
  - **Validates: Requirements 11.1**

- [x] 3.2 Write property test for password validation
  - **Property 3: Password validation enforces security requirements**
  - **Validates: Requirements 1.3, 4.3, 11.5**

- [x] 4. Implement JWT service
  - Create `src/modules/auth/services/jwt.service.ts`
  - Implement access token generation (15 minute expiration)
  - Implement refresh token generation (7 day expiration)
  - Implement token verification with signature, expiration, and issuer validation
  - Implement token decoding
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 4.1 Write property test for JWT payload
  - **Property 26: JWT payload contains required fields**
  - **Validates: Requirements 10.1**

- [x] 4.2 Write property test for JWT verification
  - **Property 27: JWT verification validates signature and expiration**
  - **Validates: Requirements 10.3**

- [x] 5. Implement token service for refresh token management
  - Create `src/modules/auth/services/token.service.ts`
  - Implement createRefreshToken to store tokens in database
  - Implement findRefreshToken to retrieve tokens
  - Implement revokeRefreshToken to invalidate single token
  - Implement revokeAllUserTokens to invalidate all user tokens
  - _Requirements: 3.1, 3.3, 3.4, 4.5, 11.3_

- [x] 6. Implement email service for notifications
  - Create `src/modules/auth/services/email.service.ts`
  - Implement sendVerificationEmail with token
  - Implement sendPasswordResetEmail with token
  - Implement sendLoginNotification for new device
  - Configure email templates
  - _Requirements: 1.6, 4.1, 5.1, 7.5_

- [x] 7. Create DTOs for authentication
  - Create `src/modules/auth/dto/register.dto.ts` with validation decorators
  - Create `src/modules/auth/dto/login.dto.ts`
  - Create `src/modules/auth/dto/auth-response.dto.ts`
  - Create `src/modules/auth/dto/token-response.dto.ts`
  - Create `src/modules/auth/dto/forgot-password.dto.ts`
  - Create `src/modules/auth/dto/reset-password.dto.ts`
  - Create `src/modules/auth/dto/verify-email.dto.ts`
  - Create `src/modules/auth/dto/user-response.dto.ts`
  - _Requirements: 1.1, 1.3, 1.7, 2.1, 4.1, 4.2, 5.2_

- [x] 8. Implement auth service core functionality
  - Create `src/modules/auth/services/auth.service.ts`
  - Implement register method with password hashing and email verification
  - Implement login method with credential validation
  - Implement refresh method for token refresh
  - Implement logout method to invalidate tokens
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.4_

- [x] 8.1 Write property test for registration
  - **Property 1: Valid registration creates user and returns tokens**
  - **Validates: Requirements 1.1**

- [x] 8.2 Write property test for duplicate email
  - **Property 2: Duplicate email registration is rejected**
  - **Validates: Requirements 1.2**

- [x] 8.3 Write property test for login
  - **Property 6: Valid login returns tokens**
  - **Validates: Requirements 2.1**

- [x] 8.4 Write property test for invalid credentials
  - **Property 7: Invalid credentials are rejected**
  - **Validates: Requirements 2.2**

- [x] 8.5 Write property test for token refresh
  - **Property 9: Token refresh with valid refresh token**
  - **Validates: Requirements 3.1**

- [x] 8.6 Write property test for logout
  - **Property 11: Logout invalidates tokens**
  - **Validates: Requirements 3.4**

- [x] 9. Implement password reset functionality
  - Add forgotPassword method to auth service
  - Add resetPassword method to auth service
  - Generate time-limited reset tokens (1 hour expiration)
  - Invalidate all sessions on password reset
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 9.1 Write property test for password reset email
  - **Property 12: Password reset request sends email**
  - **Validates: Requirements 4.1**

- [x] 9.2 Write property test for password reset
  - **Property 13: Valid reset token allows password change**
  - **Validates: Requirements 4.2**

- [x] 9.3 Write property test for session invalidation
  - **Property 14: Password reset invalidates all sessions**
  - **Validates: Requirements 4.5, 11.3**

- [x] 10. Implement email verification functionality
  - Add verifyEmail method to auth service
  - Add resendVerification method to auth service
  - Generate time-limited verification tokens (24 hour expiration)
  - Update user emailVerified status
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 10.1 Write property test for email verification
  - **Property 15: Email verification updates user record**
  - **Validates: Requirements 5.2, 5.5**

- [x] 10.2 Write property test for verification email
  - **Property 5: Successful registration sends verification email**
  - **Validates: Requirements 1.6, 5.1**

- [x] 11. Implement JWT strategy and guards
  - Create `src/modules/auth/strategies/jwt.strategy.ts` for Passport
  - Create `src/modules/auth/guards/jwt-auth.guard.ts`
  - Create `src/modules/auth/guards/roles.guard.ts` for RBAC
  - Create `src/modules/auth/guards/email-verified.guard.ts`
  - Create `src/modules/auth/decorators/current-user.decorator.ts`
  - Create `src/modules/auth/decorators/roles.decorator.ts`
  - Create `src/modules/auth/decorators/public.decorator.ts`
  - _Requirements: 6.3, 6.5_

- [x] 11.1 Write property test for authorization
  - **Property 18: Authorization checks role requirements**
  - **Validates: Requirements 6.3**

- [x] 11.2 Write property test for role hierarchy
  - **Property 19: Role hierarchy is enforced**
  - **Validates: Requirements 6.5**

- [x] 12. Implement session management
  - Create `src/modules/auth/services/session.service.ts`
  - Implement createSession with device and location metadata
  - Implement getUserSessions to list all active sessions
  - Implement revokeSession to invalidate specific session
  - Implement revokeAllSessions except current
  - _Requirements: 2.5, 7.1, 7.2, 7.3_

- [x] 12.1 Write property test for session creation
  - **Property 8: Successful authentication creates session record**
  - **Validates: Requirements 2.5**

- [x] 12.2 Write property test for session listing
  - **Property 20: Session listing returns all active sessions**
  - **Validates: Requirements 7.1**

- [x] 12.3 Write property test for session revocation
  - **Property 21: Session revocation invalidates tokens**
  - **Validates: Requirements 7.2**

- [ ] 13. Implement rate limiting
  - Install @nestjs/throttler
  - Configure rate limiting for login endpoint (5 attempts per 15 minutes per IP)
  - Configure rate limiting for password reset (3 attempts per hour per email)
  - Set up Redis for rate limit storage
  - Implement custom rate limit logic with reset on success
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 13.1 Write property test for login rate limiting
  - **Property 29: Rate limiting on login attempts**
  - **Validates: Requirements 12.1, 12.2**

- [ ] 13.2 Write property test for rate limit reset
  - **Property 30: Successful login resets rate limit**
  - **Validates: Requirements 12.3**

- [ ] 13.3 Write property test for password reset rate limiting
  - **Property 31: Rate limiting on password reset requests**
  - **Validates: Requirements 12.5**

- [ ] 14. Implement auth controller
  - Create `src/modules/auth/auth.controller.ts`
  - Add POST /auth/register endpoint
  - Add POST /auth/login endpoint
  - Add POST /auth/refresh endpoint
  - Add POST /auth/logout endpoint
  - Add POST /auth/logout-all endpoint
  - Add POST /auth/forgot-password endpoint
  - Add POST /auth/reset-password endpoint
  - Add POST /auth/verify-email endpoint
  - Add POST /auth/resend-verification endpoint
  - Add GET /auth/me endpoint
  - Add PATCH /auth/change-password endpoint
  - _Requirements: 1.1, 2.1, 3.1, 3.4, 4.1, 4.2, 5.2, 5.4_

- [ ] 15. Create Swagger documentation for auth endpoints
  - Create `src/modules/auth/dto/auth.swagger.ts`
  - Document all auth endpoints with ApiOperation, ApiResponse
  - Add example requests and responses
  - Document error responses
  - Add authentication requirements with ApiBearerAuth
  - _Requirements: All_

- [ ] 16. Implement Google OAuth integration
  - Create `src/modules/auth/strategies/google.strategy.ts`
  - Create `src/modules/auth/services/oauth.service.ts`
  - Add GET /auth/google endpoint
  - Add GET /auth/google/callback endpoint
  - Implement account creation/linking logic
  - _Requirements: 1.4, 2.3_

- [ ] 17. Implement Apple OAuth integration
  - Create `src/modules/auth/strategies/apple.strategy.ts`
  - Add GET /auth/apple endpoint
  - Add GET /auth/apple/callback endpoint
  - Implement account creation/linking logic
  - _Requirements: 1.5, 2.4_

- [ ] 18. Implement session management endpoints
  - Add GET /auth/sessions endpoint to list sessions
  - Add DELETE /auth/sessions/:id endpoint to revoke session
  - Add DELETE /auth/sessions/all endpoint to revoke all sessions
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 19. Implement RBAC functionality
  - Add role assignment logic to user service
  - Implement role hierarchy (admin > moderator > user)
  - Add default role assignment on user creation
  - Test role-based access control with guards
  - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [ ] 19.1 Write property test for default role
  - **Property 16: New users have default role**
  - **Validates: Requirements 6.1**

- [ ] 19.2 Write property test for role assignment
  - **Property 17: Role assignment updates permissions**
  - **Validates: Requirements 6.2, 6.4**

- [ ] 20. Add global exception filter
  - Create `src/common/filters/http-exception.filter.ts`
  - Format all errors consistently
  - Add request ID to error responses
  - Log errors with context
  - _Requirements: All_

- [ ] 21. Configure CORS and security headers
  - Configure CORS for frontend origin
  - Add helmet for security headers
  - Configure cookie settings (httpOnly, secure, sameSite)
  - Add CSRF protection
  - _Requirements: 9.2, 9.4, 9.5_

- [ ] 22. Checkpoint - Backend complete, all tests passing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 23. Set up frontend auth store
  - Create `src/lib/stores/auth-store.ts` with Zustand
  - Define auth state (user, accessToken, isAuthenticated)
  - Implement setUser, setAccessToken, clearAuth actions
  - Add persistence for user data (not tokens)
  - _Requirements: 3.2, 9.1_

- [ ] 24. Implement frontend API client
  - Create `src/lib/api/client.ts` with fetch wrapper
  - Add automatic Authorization header injection
  - Add automatic token refresh on 401
  - Implement request/response interceptors
  - _Requirements: 9.3_

- [ ] 25. Create auth API functions
  - Create `src/lib/api/auth.ts`
  - Implement register API call
  - Implement login API call
  - Implement refresh API call
  - Implement logout API call
  - Implement forgotPassword API call
  - Implement resetPassword API call
  - Implement verifyEmail API call
  - Implement resendVerification API call
  - Implement googleAuth API call
  - Implement appleAuth API call
  - _Requirements: 1.1, 2.1, 3.1, 3.4, 4.1, 4.2, 5.2, 5.4_

- [ ] 26. Implement auth hooks with TanStack Query
  - Create `src/lib/hooks/use-auth.ts`
  - Implement useAuth hook with login, register, logout, refresh
  - Implement useUser hook to get current user
  - Implement useRegister mutation hook
  - Implement useLogin mutation hook
  - Implement useLogout mutation hook
  - Add automatic token refresh logic
  - _Requirements: 1.1, 2.1, 3.1, 3.4_

- [ ] 27. Create animated background component
  - Create `src/components/auth/animated-background.tsx`
  - Implement pulsing gradient animation
  - Use colors: purple (#8B5CF6), blue (#3B82F6), pink (#EC4899)
  - Add 15-second animation duration
  - Make background responsive
  - _Requirements: 8.1_

- [ ] 28. Create auth modal component
  - Create `src/components/auth/auth-modal.tsx`
  - Implement modal with animated background
  - Add tab switching between sign up and sign in
  - Add close button
  - Make modal responsive
  - Add smooth animations for tab switching
  - _Requirements: 8.1, 8.2_

- [ ] 29. Create sign up form component
  - Create `src/components/auth/sign-up-form.tsx`
  - Add form fields: firstName, lastName, email, phone, password
  - Implement form validation with React Hook Form + Zod
  - Add password strength indicator
  - Add phone number input with country selector
  - Add submit button with loading state
  - Add inline error messages
  - _Requirements: 1.1, 1.3, 1.7, 8.3, 8.4_

- [ ] 30. Create sign in form component
  - Create `src/components/auth/sign-in-form.tsx`
  - Add form fields: email, password
  - Implement form validation with React Hook Form + Zod
  - Add "Remember me" checkbox
  - Add "Forgot password" link
  - Add submit button with loading state
  - Add inline error messages
  - _Requirements: 2.1, 8.3, 8.4_

- [ ] 31. Create OAuth buttons component
  - Create `src/components/auth/oauth-buttons.tsx`
  - Add Google OAuth button with icon
  - Add Apple OAuth button with icon
  - Implement OAuth redirect logic
  - Add loading states
  - Add visual feedback on click
  - _Requirements: 1.4, 1.5, 2.3, 2.4, 8.5_

- [ ] 32. Implement OAuth callback handling
  - Create OAuth callback pages for Google and Apple
  - Extract authorization code from URL
  - Call backend OAuth endpoints
  - Store tokens and redirect to dashboard
  - Handle OAuth errors
  - _Requirements: 1.4, 1.5, 2.3, 2.4_

- [ ] 33. Create password reset flow
  - Create forgot password page/modal
  - Create reset password page with token validation
  - Implement email sending for reset link
  - Add success/error messages
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 34. Create email verification flow
  - Create email verification page with token validation
  - Add resend verification button
  - Show verification status in UI
  - Add success/error messages
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [ ] 35. Implement session management UI
  - Create sessions page to list active sessions
  - Show device, location, last activity for each session
  - Add revoke button for individual sessions
  - Add "Logout from all devices" button
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 36. Add protected route wrapper
  - Create `src/components/auth/protected-route.tsx`
  - Check authentication status
  - Redirect to login if not authenticated
  - Show loading state while checking auth
  - _Requirements: 6.3_

- [ ] 37. Implement role-based UI components
  - Create `src/components/auth/require-role.tsx`
  - Hide/show content based on user role
  - Support role hierarchy
  - _Requirements: 6.3, 6.5_

- [ ] 38. Add auth modal trigger
  - Add "Sign In" and "Sign Up" buttons to navbar
  - Implement useAuthModal hook for modal state
  - Open modal with correct tab based on button clicked
  - _Requirements: 8.1, 8.2_

- [ ] 39. Implement token storage and management
  - Store access token in memory (auth store)
  - Store refresh token in httpOnly cookie (handled by backend)
  - Implement automatic token refresh before expiration
  - Clear tokens on logout
  - _Requirements: 9.1, 9.2_

- [ ] 40. Add form validation schemas
  - Create Zod schemas for registration
  - Create Zod schemas for login
  - Create Zod schemas for password reset
  - Add custom validation for password strength
  - Add custom validation for phone numbers
  - _Requirements: 1.3, 1.7_

- [ ] 41. Implement error handling in UI
  - Display API errors in forms
  - Show toast notifications for success/error
  - Handle network errors gracefully
  - Add retry logic for failed requests
  - _Requirements: All_

- [ ] 42. Add loading states and skeletons
  - Add skeleton loading for user profile
  - Add skeleton loading for session list
  - Add button loading states
  - Add form submission loading states
  - _Requirements: 8.4_

- [ ] 43. Implement responsive design
  - Make auth modal responsive (mobile, tablet, desktop)
  - Adjust form layouts for mobile
  - Test on different screen sizes
  - Ensure touch-friendly buttons
  - _Requirements: 8.1_

- [ ] 44. Add accessibility features
  - Add ARIA labels to all form inputs
  - Ensure keyboard navigation works
  - Add focus visible indicators
  - Test with screen reader
  - Ensure color contrast meets WCAG AA
  - _Requirements: All_

- [ ] 45. Checkpoint - Frontend complete, all tests passing
  - Ensure all tests pass, ask the user if questions arise.

- [ ]\* 46. Write E2E tests for registration flow
  - Test complete registration flow with Playwright
  - Test email verification flow
  - Test error handling

- [ ]\* 47. Write E2E tests for login flow
  - Test complete login flow with Playwright
  - Test logout flow
  - Test "Remember me" functionality

- [ ]\* 48. Write E2E tests for password reset flow
  - Test forgot password flow with Playwright
  - Test reset password with valid token
  - Test expired token handling

- [ ]\* 49. Write E2E tests for OAuth flows
  - Test Google OAuth flow with Playwright
  - Test Apple OAuth flow with Playwright
  - Test account linking

- [ ]\* 50. Write E2E tests for session management
  - Test session listing with Playwright
  - Test session revocation
  - Test logout from all devices

- [ ] 51. Final checkpoint - All tests passing
  - Ensure all tests pass, ask the user if questions arise.
