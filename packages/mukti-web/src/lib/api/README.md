# API Client

This directory contains the API client for making HTTP requests to the Mukti backend API.

## Features

- **Automatic Authorization**: Automatically injects JWT access tokens in the Authorization header
- **Token Refresh**: Automatically refreshes expired access tokens using refresh tokens (httpOnly cookies)
- **Request/Response Interceptors**: Extensible interceptor system for custom request/response handling
- **Consistent Error Handling**: Standardized error responses with `ApiClientError`
- **Type Safety**: Full TypeScript support with generic types
- **CSRF Protection**: Includes credentials for CSRF token handling

## Usage

### Basic Requests

```typescript
import { apiClient } from '@/lib/api/client';

// GET request
const users = await apiClient.get<User[]>('/users');

// POST request
const newUser = await apiClient.post<User>('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// PATCH request
const updatedUser = await apiClient.patch<User>('/users/123', {
  name: 'Jane Doe',
});

// DELETE request
await apiClient.delete('/users/123');
```

### Error Handling

```typescript
import { apiClient, ApiClientError } from '@/lib/api/client';

try {
  const user = await apiClient.get<User>('/users/123');
} catch (error) {
  if (error instanceof ApiClientError) {
    console.error('API Error:', error.message);
    console.error('Error Code:', error.code);
    console.error('Status:', error.status);
    console.error('Details:', error.details);
  }
}
```

### Custom Interceptors

#### Request Interceptor

```typescript
import { apiClient } from '@/lib/api/client';

// Add custom header to all requests
apiClient.addRequestInterceptor((url, options) => {
  const headers = new Headers(options.headers);
  headers.set('X-Custom-Header', 'value');

  return {
    url,
    options: { ...options, headers },
  };
});
```

#### Response Interceptor

```typescript
import { apiClient } from '@/lib/api/client';

// Log all responses
apiClient.addResponseInterceptor((response) => {
  console.log('Response:', response.status, response.url);
  return response;
});
```

#### Error Interceptor

```typescript
import { apiClient } from '@/lib/api/client';

// Custom error handling
apiClient.addErrorInterceptor((error) => {
  if (error.code === 'UNAUTHORIZED') {
    // Redirect to login
    window.location.href = '/login';
  }
  throw error;
});
```

## Automatic Token Refresh

The API client automatically handles token refresh when it receives a 401 Unauthorized response:

1. Detects 401 response
2. Calls `/auth/refresh` endpoint with refresh token (httpOnly cookie)
3. Updates access token in auth store
4. Retries the original request with new token
5. If refresh fails, clears auth state and requires re-login

This happens transparently without any action required from the calling code.

## Configuration

The API base URL is configured via environment variable:

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

Default: `http://localhost:3000/api/v1`

## Response Format

All API responses follow a consistent format:

### Success Response

```typescript
{
  success: true,
  data: { /* resource data */ },
  meta: {
    timestamp: "2024-01-01T00:00:00Z",
    requestId: "uuid"
  }
}
```

### Error Response

```typescript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human-readable error message",
    details: { /* optional additional info */ }
  },
  meta: {
    timestamp: "2024-01-01T00:00:00Z",
    requestId: "uuid"
  }
}
```

### Paginated Response

```typescript
{
  success: true,
  data: [ /* array of resources */ ],
  meta: {
    page: 1,
    limit: 20,
    total: 100,
    totalPages: 5
  }
}
```

## Security

- **Access tokens** are stored in memory only (not persisted)
- **Refresh tokens** are stored in httpOnly cookies (managed by backend)
- **Credentials** are always included for CSRF protection
- **Authorization header** is automatically added when access token exists

## Testing

Tests are located in `__tests__/client.test.ts` and cover:

- GET, POST, PATCH, PUT, DELETE requests
- Authorization header injection
- Error handling
- Request/response interceptors
- 204 No Content handling

Run tests:

```bash
bun test src/lib/api/__tests__/client.test.ts
```
