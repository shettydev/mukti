/**
 * Role-based UI component for conditional rendering
 *
 * Hides or shows content based on user role with support for role hierarchy.
 * Role hierarchy: admin > moderator > user
 *
 * @example
 * ```tsx
 * // Show content only to admins
 * <RequireRole role="admin">
 *   <AdminPanel />
 * </RequireRole>
 *
 * // Show content to moderators and admins (hierarchy)
 * <RequireRole role="moderator">
 *   <ModeratorTools />
 * </RequireRole>
 *
 * // Show fallback when user doesn't have permission
 * <RequireRole role="admin" fallback={<AccessDenied />}>
 *   <AdminPanel />
 * </RequireRole>
 *
 * // Require multiple roles (any match)
 * <RequireRole roles={['admin', 'moderator']}>
 *   <StaffPanel />
 * </RequireRole>
 * ```
 */

'use client';

import type { ReactNode } from 'react';

import { useUser } from '@/lib/stores/auth-store';

/**
 * Role hierarchy levels
 * Higher number = higher privilege
 */
const ROLE_HIERARCHY: Record<'admin' | 'moderator' | 'user', number> = {
  admin: 3,
  moderator: 2,
  user: 1,
};

interface RequireRoleProps {
  /**
   * Content to render when user has required role
   */
  children: ReactNode;

  /**
   * Optional fallback content to render when user lacks permission
   * If not provided, nothing is rendered
   */
  fallback?: ReactNode;

  /**
   * Single role required to view content
   * Supports role hierarchy (e.g., admin can access moderator content)
   */
  role?: 'admin' | 'moderator' | 'user';

  /**
   * Multiple roles (any match grants access)
   * Supports role hierarchy for each role
   */
  roles?: Array<'admin' | 'moderator' | 'user'>;
}

/**
 * Component that conditionally renders content based on user role
 *
 * Supports:
 * - Single role requirement
 * - Multiple role requirements (any match)
 * - Role hierarchy (admin > moderator > user)
 * - Fallback content for unauthorized users
 */
export function RequireRole({ children, fallback = null, role, roles }: RequireRoleProps) {
  const user = useUser();

  // If no user is authenticated, don't show content
  if (!user) {
    return fallback;
  }

  // Check single role requirement
  if (role) {
    const hasAccess = hasRoleAccess(user.role, role);
    return hasAccess ? children : fallback;
  }

  // Check multiple roles requirement (any match)
  if (roles && roles.length > 0) {
    const hasAccess = roles.some((requiredRole) => hasRoleAccess(user.role, requiredRole));
    return hasAccess ? children : fallback;
  }

  // If no role requirements specified, show content
  return children;
}

/**
 * Checks if user has required role based on hierarchy
 *
 * @param userRole - Current user's role
 * @param requiredRole - Required role to access content
 * @returns True if user has sufficient role level
 *
 * @remarks
 * Role hierarchy is enforced: admin > moderator > user
 * A user with a higher role can access content for lower roles
 */
function hasRoleAccess(
  userRole: 'admin' | 'moderator' | 'user',
  requiredRole: 'admin' | 'moderator' | 'user'
): boolean {
  const userLevel = ROLE_HIERARCHY[userRole];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  return userLevel >= requiredLevel;
}
