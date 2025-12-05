/**
 * Jest setup file
 * Runs before each test file
 */

// Import React before testing library to ensure proper initialization
const React = require('react');
require('@testing-library/jest-dom');

// Ensure React is available globally
if (typeof global.React === 'undefined') {
  global.React = React;
}

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
};

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

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
  let store = {};

  return {
    clear: () => {
      store = {};
    },
    getItem: (key) => store[key] || null,
    removeItem: (key) => {
      delete store[key];
    },
    setItem: (key, value) => {
      store[key] = value.toString();
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock react-markdown and remark-gfm to avoid ESM issues
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="markdown-content">{children}</div>,
}));

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => {},
}));
