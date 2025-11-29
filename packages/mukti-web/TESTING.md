# Testing Guide - Mukti Web

This document describes the testing setup and best practices for the Mukti Web frontend application.

## Testing Framework

The project uses **Jest** with **React Testing Library** for unit and integration testing.

### Installed Dependencies

- `jest` - Testing framework
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Custom Jest matchers for DOM
- `@testing-library/user-event` - User interaction simulation
- `jest-environment-jsdom` - DOM environment for Jest
- `@types/jest` - TypeScript types for Jest

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run tests with coverage
bun test:coverage
```

## Configuration

### Jest Configuration (`jest.config.js`)

The Jest configuration is set up to work with Next.js 15 and includes:

- **Test environment**: jsdom (for DOM testing)
- **Setup file**: `jest.setup.ts` (runs before each test file)
- **Module mapping**: `@/*` maps to `src/*`
- **Coverage thresholds**: 70% for branches, functions, lines, and statements

### Setup File (`jest.setup.ts`)

The setup file includes:

- `@testing-library/jest-dom` matchers
- Next.js router mocks
- `window.matchMedia` mock
- `IntersectionObserver` mock
- `localStorage` mock

## Writing Tests

### Test File Location

Place test files next to the code they test:

```
src/
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   └── __tests__/
│   │       └── client.test.ts
│   └── stores/
│       ├── auth-store.ts
│       └── __tests__/
│           └── auth-store.test.ts
```

### Test File Naming

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts` (if added later)

### Example Test Structure

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../my-component';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

## Testing Best Practices

### 1. Test User Behavior, Not Implementation

```typescript
// ❌ Bad - Testing implementation details
expect(component.state.count).toBe(1);

// ✅ Good - Testing user-visible behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

### 2. Use Semantic Queries

Prefer queries that reflect how users interact with your app:

```typescript
// Priority order:
screen.getByRole('button', { name: /submit/i }); // Best
screen.getByLabelText(/email/i); // Good for forms
screen.getByPlaceholderText(/search/i); // OK
screen.getByTestId('submit-button'); // Last resort
```

### 3. Use userEvent Over fireEvent

```typescript
// ❌ Bad
fireEvent.click(button);

// ✅ Good
const user = userEvent.setup();
await user.click(button);
```

### 4. Test Async Behavior Properly

```typescript
// Use waitFor for async updates
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Use findBy queries (combines getBy + waitFor)
const element = await screen.findByText('Loaded');
```

### 5. Mock External Dependencies

```typescript
// Mock API calls
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Mock Next.js router (already mocked in jest.setup.ts)
import { useRouter } from 'next/navigation';
const mockPush = jest.fn();
(useRouter as jest.Mock).mockReturnValue({ push: mockPush });
```

### 6. Clean Up After Tests

```typescript
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});
```

## Testing Components

### Basic Component Test

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Forms

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../login-form';

describe('LoginForm', () => {
  it('submits form with valid data', async () => {
    const handleSubmit = jest.fn();
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('shows validation errors', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });
});
```

### Testing with TanStack Query

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { UserList } from '../user-list';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('UserList', () => {
  it('displays users after loading', async () => {
    render(<UserList />, { wrapper: createWrapper() });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
```

### Testing Zustand Stores

```typescript
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../auth-store';

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.getState().clearAuth();
  });

  it('sets user and token', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAuth(mockUser, 'mock-token');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.accessToken).toBe('mock-token');
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

## Coverage

### Viewing Coverage

```bash
bun test:coverage
```

Coverage reports are generated in the `coverage/` directory.

### Coverage Thresholds

The project enforces minimum coverage thresholds:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Excluded from Coverage

- Type definition files (`*.d.ts`)
- Story files (`*.stories.tsx`)
- Test files (`__tests__/**`)

## Debugging Tests

### Run Specific Test File

```bash
npx jest src/lib/api/__tests__/client.test.ts
```

### Run Tests Matching Pattern

```bash
npx jest --testNamePattern="should handle errors"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Common Issues

### Issue: Tests timeout

**Solution**: Increase timeout for async operations

```typescript
it('should load data', async () => {
  // ...
}, 10000); // 10 second timeout
```

### Issue: Act warnings

**Solution**: Wrap state updates in `act()`

```typescript
await act(async () => {
  await user.click(button);
});
```

### Issue: Can't find element

**Solution**: Use `findBy` queries for async elements

```typescript
// ❌ Bad
expect(screen.getByText('Loaded')).toBeInTheDocument();

// ✅ Good
expect(await screen.findByText('Loaded')).toBeInTheDocument();
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Next.js Testing](https://nextjs.org/docs/testing)

## Next Steps

- Add E2E tests with Playwright (optional)
- Set up visual regression testing (optional)
- Add performance testing (optional)
- Integrate with CI/CD pipeline
