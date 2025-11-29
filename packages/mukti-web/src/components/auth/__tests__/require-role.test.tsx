/**
 * Tests for RequireRole component
 *
 * Tests role-based conditional rendering and role hierarchy
 */

import { render, screen } from '@testing-library/react';

import type { User } from '@/types/user.types';

import { RequireRole } from '../require-role';

// Mock the auth store
jest.mock('@/lib/stores/auth-store', () => ({
  useUser: jest.fn(),
}));

import { useUser } from '@/lib/stores/auth-store';

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

describe('RequireRole', () => {
  const createMockUser = (role: 'admin' | 'moderator' | 'user'): User => ({
    createdAt: new Date(),
    email: 'test@example.com',
    emailVerified: true,
    firstName: 'Test',
    id: '123',
    isActive: true,
    lastName: 'User',
    role,
    updatedAt: new Date(),
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is not authenticated', () => {
    it('should not render children', () => {
      mockUseUser.mockReturnValue(null);

      render(
        <RequireRole role="user">
          <div>Protected Content</div>
        </RequireRole>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should render fallback when provided', () => {
      mockUseUser.mockReturnValue(null);

      render(
        <RequireRole fallback={<div>Please log in</div>} role="user">
          <div>Protected Content</div>
        </RequireRole>
      );

      expect(screen.getByText('Please log in')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('single role requirement', () => {
    it('should render children when user has exact role', () => {
      mockUseUser.mockReturnValue(createMockUser('user'));

      render(
        <RequireRole role="user">
          <div>User Content</div>
        </RequireRole>
      );

      expect(screen.getByText('User Content')).toBeInTheDocument();
    });

    it('should not render children when user lacks required role', () => {
      mockUseUser.mockReturnValue(createMockUser('user'));

      render(
        <RequireRole role="admin">
          <div>Admin Content</div>
        </RequireRole>
      );

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('should render fallback when user lacks required role', () => {
      mockUseUser.mockReturnValue(createMockUser('user'));

      render(
        <RequireRole fallback={<div>Access Denied</div>} role="admin">
          <div>Admin Content</div>
        </RequireRole>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('role hierarchy', () => {
    it('should allow admin to access user content', () => {
      mockUseUser.mockReturnValue(createMockUser('admin'));

      render(
        <RequireRole role="user">
          <div>User Content</div>
        </RequireRole>
      );

      expect(screen.getByText('User Content')).toBeInTheDocument();
    });

    it('should allow admin to access moderator content', () => {
      mockUseUser.mockReturnValue(createMockUser('admin'));

      render(
        <RequireRole role="moderator">
          <div>Moderator Content</div>
        </RequireRole>
      );

      expect(screen.getByText('Moderator Content')).toBeInTheDocument();
    });

    it('should allow admin to access admin content', () => {
      mockUseUser.mockReturnValue(createMockUser('admin'));

      render(
        <RequireRole role="admin">
          <div>Admin Content</div>
        </RequireRole>
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should allow moderator to access user content', () => {
      mockUseUser.mockReturnValue(createMockUser('moderator'));

      render(
        <RequireRole role="user">
          <div>User Content</div>
        </RequireRole>
      );

      expect(screen.getByText('User Content')).toBeInTheDocument();
    });

    it('should allow moderator to access moderator content', () => {
      mockUseUser.mockReturnValue(createMockUser('moderator'));

      render(
        <RequireRole role="moderator">
          <div>Moderator Content</div>
        </RequireRole>
      );

      expect(screen.getByText('Moderator Content')).toBeInTheDocument();
    });

    it('should not allow moderator to access admin content', () => {
      mockUseUser.mockReturnValue(createMockUser('moderator'));

      render(
        <RequireRole role="admin">
          <div>Admin Content</div>
        </RequireRole>
      );

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('should not allow user to access moderator content', () => {
      mockUseUser.mockReturnValue(createMockUser('user'));

      render(
        <RequireRole role="moderator">
          <div>Moderator Content</div>
        </RequireRole>
      );

      expect(screen.queryByText('Moderator Content')).not.toBeInTheDocument();
    });

    it('should not allow user to access admin content', () => {
      mockUseUser.mockReturnValue(createMockUser('user'));

      render(
        <RequireRole role="admin">
          <div>Admin Content</div>
        </RequireRole>
      );

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('multiple roles requirement', () => {
    it('should render children when user has one of the required roles', () => {
      mockUseUser.mockReturnValue(createMockUser('moderator'));

      render(
        <RequireRole roles={['admin', 'moderator']}>
          <div>Staff Content</div>
        </RequireRole>
      );

      expect(screen.getByText('Staff Content')).toBeInTheDocument();
    });

    it('should render children when user has higher role than any required role', () => {
      mockUseUser.mockReturnValue(createMockUser('admin'));

      render(
        <RequireRole roles={['moderator', 'user']}>
          <div>Staff Content</div>
        </RequireRole>
      );

      expect(screen.getByText('Staff Content')).toBeInTheDocument();
    });

    it('should not render children when user lacks all required roles', () => {
      mockUseUser.mockReturnValue(createMockUser('user'));

      render(
        <RequireRole roles={['admin', 'moderator']}>
          <div>Staff Content</div>
        </RequireRole>
      );

      expect(screen.queryByText('Staff Content')).not.toBeInTheDocument();
    });

    it('should render fallback when user lacks all required roles', () => {
      mockUseUser.mockReturnValue(createMockUser('user'));

      render(
        <RequireRole fallback={<div>Staff Only</div>} roles={['admin', 'moderator']}>
          <div>Staff Content</div>
        </RequireRole>
      );

      expect(screen.getByText('Staff Only')).toBeInTheDocument();
      expect(screen.queryByText('Staff Content')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should render children when no role requirements specified', () => {
      mockUseUser.mockReturnValue(createMockUser('user'));

      render(
        <RequireRole>
          <div>Public Content</div>
        </RequireRole>
      );

      expect(screen.getByText('Public Content')).toBeInTheDocument();
    });

    it('should render children when roles array is empty', () => {
      mockUseUser.mockReturnValue(createMockUser('user'));

      render(
        <RequireRole roles={[]}>
          <div>Public Content</div>
        </RequireRole>
      );

      expect(screen.getByText('Public Content')).toBeInTheDocument();
    });

    it('should handle complex nested content', () => {
      mockUseUser.mockReturnValue(createMockUser('admin'));

      render(
        <RequireRole role="admin">
          <div>
            <h1>Admin Panel</h1>
            <button>Delete User</button>
            <span>Settings</span>
          </div>
        </RequireRole>
      );

      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      expect(screen.getByText('Delete User')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });
});
