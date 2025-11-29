/**
 * Jest setup file
 * Runs before each test file
 */

import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname() {
    return '/';
  },
  useRouter() {
    return {
      asPath: '/',
      back: jest.fn(),
      pathname: '/',
      prefetch: jest.fn(),
      push: jest.fn(),
      query: {},
      replace: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: jest.fn().mockImplementation((query) => ({
    addEventListener: jest.fn(),
    addListener: jest.fn(), // deprecated
    dispatchEvent: jest.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: jest.fn(),
    removeListener: jest.fn(), // deprecated
  })),
  writable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver used by some UI components
if (!global.ResizeObserver) {
  class ResizeObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
  global.ResizeObserver = ResizeObserver;
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    clear: () => {
      store = {};
    },
    getItem: (key: string) => store[key] || null,
    removeItem: (key: string) => {
      delete store[key];
    },
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});
