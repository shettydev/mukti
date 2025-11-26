# Security Configuration

This document describes the security measures implemented in the Mukti API.

## Security Headers (Helmet)

The API uses [Helmet](https://helmetjs.github.io/) to set various HTTP security headers:

- **Content-Security-Policy**: Controls which resources can be loaded
- **X-DNS-Prefetch-Control**: Controls browser DNS prefetching
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Download-Options**: Prevents IE from executing downloads
- **Strict-Transport-Security**: Enforces HTTPS (production only)
- **Cross-Origin-Resource-Policy**: Controls cross-origin resource sharing

### Configuration

In development mode, CSP is relaxed to allow inline scripts and styles for development tools.
In production mode, stricter CSP rules are applied.

## CORS (Cross-Origin Resource Sharing)

CORS is configured to allow requests from the frontend application:

- **Origin**: Configured via `CORS_ORIGINS` or `FRONTEND_URL` environment variables
- **Credentials**: Enabled to allow cookies and authentication headers
- **Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization, X-CSRF-Token
- **Exposed Headers**: X-CSRF-Token
- **Max Age**: 24 hours (86400 seconds)

### Environment Variables

```bash
# Allow all origins (development only)
CORS_ORIGINS=*

# Allow specific origin
CORS_ORIGINS=http://localhost:3001

# Allow multiple origins (comma-separated)
CORS_ORIGINS=http://localhost:3001,https://mukti.app
```

## Cookie Configuration

Cookies are configured with security best practices:

- **httpOnly**: Prevents JavaScript access to cookies
- **secure**: Requires HTTPS in production
- **sameSite**: Set to 'strict' to prevent CSRF attacks
- **maxAge**: 24 hours for CSRF tokens, 7 days for refresh tokens

### Cookie Parser

The API uses `cookie-parser` middleware with a secret key from the `SESSION_SECRET` environment variable.

## CSRF Protection

Cross-Site Request Forgery (CSRF) protection is enabled in production mode using the `csurf` middleware.

### How It Works

1. Client requests a CSRF token from `GET /api/v1/auth/csrf-token`
2. Server generates and returns a CSRF token
3. Client includes the token in the `X-CSRF-Token` header for state-changing requests (POST, PUT, PATCH, DELETE)
4. Server validates the token before processing the request

### CSRF Token Endpoint

```
GET /api/v1/auth/csrf-token
```

Response:

```json
{
  "csrfToken": "abc123-csrf-token-xyz789"
}
```

### Using CSRF Tokens

Include the token in the request header:

```javascript
fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify({ email, password }),
});
```

### CSRF Configuration

- **Ignored Methods**: GET, HEAD, OPTIONS (read-only operations)
- **Cookie Settings**: httpOnly, secure (production), sameSite: strict
- **Max Age**: 24 hours

## Environment Variables

Required security-related environment variables:

```bash
# Node environment (development, production, test)
NODE_ENV=development

# Session secret for cookie signing
SESSION_SECRET=your-session-secret-change-in-production

# CORS configuration
CORS_ORIGINS=http://localhost:3001
FRONTEND_URL=http://localhost:3001

# JWT secrets
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
```

## Production Deployment

When deploying to production, ensure:

1. Set `NODE_ENV=production`
2. Use strong, randomly generated secrets for `SESSION_SECRET`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`
3. Configure `CORS_ORIGINS` to only allow your frontend domain
4. Enable HTTPS/TLS on your server
5. Use secure cookie settings (automatically enabled in production)
6. Enable CSRF protection (automatically enabled in production)

## Security Best Practices

1. **Never commit secrets**: Use environment variables for all sensitive data
2. **Rotate secrets regularly**: Change JWT secrets and session secrets periodically
3. **Use HTTPS**: Always use HTTPS in production
4. **Monitor logs**: Watch for suspicious activity and failed authentication attempts
5. **Rate limiting**: Implement rate limiting on authentication endpoints (already configured)
6. **Input validation**: All inputs are validated using class-validator
7. **SQL injection prevention**: Using Mongoose ORM prevents SQL injection
8. **XSS prevention**: Helmet headers and input sanitization prevent XSS attacks

## Testing Security Configuration

To verify security headers are properly set:

```bash
# Check security headers
curl -I http://localhost:3000/api/v1/auth/csrf-token

# Check CORS headers
curl -I -H "Origin: http://localhost:3001" http://localhost:3000/api/v1/auth/csrf-token

# Get CSRF token
curl http://localhost:3000/api/v1/auth/csrf-token
```

## References

- [Helmet Documentation](https://helmetjs.github.io/)
- [CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [CSRF Protection](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)
