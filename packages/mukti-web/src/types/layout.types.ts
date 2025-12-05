/**
 * Layout type definitions for dashboard components
 * Defines state and props for layout components
 */

import type { ReactNode } from 'react';

/**
 * Coming soon component props
 * @property {string} [className] - Custom className
 * @property {string} description - Feature description
 * @property {string} feature - Feature name
 * @property {ReactNode} [icon] - Icon to display
 * @property {string} [timeline] - Expected release timeline
 */
export interface ComingSoonProps {
  className?: string;
  description: string;
  feature: string;
  icon?: ReactNode;
  timeline?: string;
}

/**
 * Dashboard layout props
 * @property {ReactNode} [actions] - Additional actions for navbar
 * @property {ReactNode} children - Page content
 * @property {string} [contentClassName] - Custom className for content area
 * @property {boolean} [showNavbar] - Whether to show the navbar (default: true)
 * @property {boolean} [showSidebar] - Whether to show the sidebar
 * @property {string} [title] - Page title displayed in navbar
 */
export interface DashboardLayoutProps {
  actions?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  showNavbar?: boolean;
  showSidebar?: boolean;
  title?: string;
}

/**
 * Dashboard layout skeleton props
 * @property {ReactNode} [children] - Custom skeleton content for the main area
 * @property {string} [contentClassName] - Custom className for content area
 * @property {boolean} [showSidebar] - Whether to show sidebar skeleton
 */
export interface DashboardLayoutSkeletonProps {
  children?: ReactNode;
  contentClassName?: string;
  showSidebar?: boolean;
}

/**
 * Layout state for dashboard
 * @property {boolean} mobileMenuOpen - Whether mobile menu is open
 * @property {string} pageTitle - Current page title displayed in navbar
 * @property {boolean} sidebarCollapsed - Whether sidebar is collapsed on desktop
 */
export interface LayoutState {
  mobileMenuOpen: boolean;
  pageTitle: string;
  sidebarCollapsed: boolean;
}

/**
 * Navbar action button configuration
 * @property {boolean} [disabled] - Whether action is disabled
 * @property {ReactNode} icon - Action icon component
 * @property {string} label - Action label for accessibility
 * @property {() => void} onClick - Click handler
 * @property {string} [shortcut] - Keyboard shortcut (e.g., "Cmd+N")
 * @property {'default' | 'ghost' | 'outline' | 'primary'} [variant] - Optional variant for styling
 */
export interface NavbarAction {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  shortcut?: string;
  variant?: 'default' | 'ghost' | 'outline' | 'primary';
}

/**
 * Sidebar navigation item
 * @property {number | string} [badge] - Badge content (e.g., count)
 * @property {boolean} [disabled] - Whether item is disabled
 * @property {string} href - Navigation path
 * @property {ReactNode} icon - Icon component
 * @property {boolean} [isActive] - Whether item is active
 * @property {string} label - Display label
 */
export interface SidebarNavItem {
  badge?: number | string;
  disabled?: boolean;
  href: string;
  icon: ReactNode;
  isActive?: boolean;
  label: string;
}

/**
 * Sidebar section with grouped items
 * @property {SidebarNavItem[]} items - Navigation items in this section
 * @property {string} [title] - Section title
 */
export interface SidebarSection {
  items: SidebarNavItem[];
  title?: string;
}
