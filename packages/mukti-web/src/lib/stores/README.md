# Auth Store

Zustand-based authentication store for managing user authentication state.

## Features

- **In-memory access tokens**: Access tokens are stored in memory only for security
- **Persisted user data**: User information is persisted to localStorage for better UX
- **Automatic hydration**: User data is restored on page reload, but tokens must be refreshed
- **Type-safe**: Full TypeScript support with proper types

## Usage

### Basic Usage

```typescript
import { useAuthStore } from '@/lib/stores/auth-store';

function MyComponent() {
  const { user, accessToken, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <p>Welcome, {user?.firstName}!</p>
      <button onClick={clearAuth}>Logout</button>
    </div>
  );
}
```

### Using Selector Hooks (Recommended)

For better performance, use the provided selector hooks:

```typescript
import { useUser, useIsAuthenticated } from '@/lib/stores/auth-store';

function UserProfile() {
  const user = useUser();
  const isAuthenticated = useIsAuthenticated();

  if (!isAuthenticated || !user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <h1>{user.firstName} {user.lastName}</h1>
      <p>{user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  );
}
```

### Setting Authentication State

```typescript
import { useAuthStore } from '@/lib/stores/auth-store';

function LoginForm() {
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const { user, accessToken } = await response.json();

    // Set both user and token at once
    setAuth(user, accessToken);
  };

  return <form>{/* form fields */}</form>;
}
```

### Clearing Authentication

```typescript
import { useAuthStore } from '@/lib/stores/auth-store';

function LogoutButton() {
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const handleLogout = async () => {
    // Call logout API
    await fetch('/api/auth/logout', { method: 'POST' });

    // Clear local auth state
    clearAuth();
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

### Updating Individual Fields

```typescript
import { useAuthStore } from '@/lib/stores/auth-store';

function TokenRefresh() {
  const setAccessToken = useAuthStore((state) => state.setAccessToken);

  const refreshToken = async () => {
    const response = await fetch('/api/auth/refresh', { method: 'POST' });
    const { accessToken } = await response.json();

    // Update only the access token
    setAccessToken(accessToken);
  };

  return <button onClick={refreshToken}>Refresh Token</button>;
}
```

## Security Considerations

### Access Token Storage

Access tokens are stored **in memory only** and are not persisted to localStorage. This prevents XSS attacks from stealing tokens. The token will be lost on page refresh, which is why you need to implement automatic token refresh using the refresh token (stored in httpOnly cookies by the backend).

### User Data Persistence

User data (name, email, role, etc.) is persisted to localStorage for better UX. This data does not contain sensitive information and allows the UI to display user information immediately on page load.

### Refresh Token Flow

1. User logs in → receives access token (stored in memory) and refresh token (httpOnly cookie)
2. User refreshes page → access token is lost, user data is restored from localStorage
3. App detects missing access token → automatically calls refresh endpoint
4. Backend validates refresh token from cookie → returns new access token
5. App stores new access token in memory → user is authenticated again

## API Integration

The auth store should be used in conjunction with TanStack Query hooks for API calls:

```typescript
import { useAuthStore } from '@/lib/stores/auth-store';
import { useMutation } from '@tanstack/react-query';

function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) throw new Error('Login failed');

      return response.json();
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
    },
  });
}
```

## Store Structure

```typescript
interface AuthState {
  user: User | null; // Persisted to localStorage
  accessToken: string | null; // In-memory only
  isAuthenticated: boolean; // Derived from user + token
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
  setAuth: (user: User, accessToken: string) => void;
}
```

## Requirements

This store satisfies the following requirements:

- **Requirement 3.2**: Session persistence across browser restarts (user data persisted)
- **Requirement 9.1**: Access tokens stored in memory only (not localStorage)
