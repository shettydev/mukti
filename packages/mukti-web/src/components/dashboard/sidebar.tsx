'use client';

import type { ReactNode } from 'react';

import {
  FileText,
  HelpCircle,
  LayoutDashboard,
  Mail,
  Menu,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Navigation item component
 */
interface NavItemProps {
  active?: boolean;
  collapsed: boolean;
  href: string;
  icon: ReactNode;
  label: string;
}

interface SidebarProps {
  collapsed: boolean;
  /** Whether sidebar is open on mobile */
  mobileOpen?: boolean;
  /** Callback when mobile sidebar should close */
  onMobileClose?: () => void;
}

/**
 * Mobile menu button for opening sidebar
 */
export function MobileMenuButton({
  className,
  onClick,
}: {
  className?: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label="Open navigation menu"
      className={cn('md:hidden min-h-[44px] min-w-[44px]', className)}
      onClick={onClick}
      size="icon"
      variant="ghost"
    >
      <Menu className="w-5 h-5" />
    </Button>
  );
}

/**
 * Collapsible sidebar component for dashboard navigation
 *
 * Features:
 * - Smooth collapse/expand animation
 * - Organized navigation sections
 * - CTA card at bottom
 * - Responsive design with mobile drawer
 * - Accessible navigation with proper ARIA labels
 *
 */
export function Sidebar({ collapsed, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Main navigation"
        className={cn(
          'bg-[#111111] border-r border-white/10 transition-all duration-300 flex flex-col',
          // Desktop styles
          'hidden md:flex',
          collapsed ? 'md:w-20' : 'md:w-64',
          // Mobile styles - slide in from left
          mobileOpen && 'fixed inset-y-0 left-0 z-50 flex w-64 md:relative md:z-auto'
        )}
        role="navigation"
      >
        {/* Logo and mobile close button */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles aria-hidden="true" className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-lg whitespace-nowrap">Mukti AI</span>
            )}
          </div>
          {/* Mobile close button */}
          {mobileOpen && (
            <Button
              aria-label="Close navigation menu"
              className="md:hidden min-h-[44px] min-w-[44px]"
              onClick={onMobileClose}
              size="icon"
              variant="ghost"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav aria-label="Dashboard navigation" className="flex-1 p-4 space-y-1 overflow-y-auto">
          {!collapsed && (
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
              Menu
            </div>
          )}
          <NavItem
            active={pathname === '/dashboard'}
            collapsed={collapsed}
            href="/dashboard"
            icon={<LayoutDashboard aria-hidden="true" className="w-4 h-4" />}
            label="Dashboard"
          />
          <NavItem
            active={pathname?.startsWith('/dashboard/conversations')}
            collapsed={collapsed}
            href="/dashboard/conversations"
            icon={<MessageSquare aria-hidden="true" className="w-4 h-4" />}
            label="Conversations"
          />
          <NavItem
            collapsed={collapsed}
            href="/dashboard/community"
            icon={<Users aria-hidden="true" className="w-4 h-4" />}
            label="Community"
          />
          <NavItem
            collapsed={collapsed}
            href="/dashboard/resources"
            icon={<FileText aria-hidden="true" className="w-4 h-4" />}
            label="Resources"
          />

          {!collapsed && (
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 mt-6">
              Management
            </div>
          )}
          <NavItem
            collapsed={collapsed}
            href="/dashboard/sessions"
            icon={<MessageSquare aria-hidden="true" className="w-4 h-4" />}
            label="Inquiry Sessions"
          />
          <NavItem
            collapsed={collapsed}
            href="/dashboard/messages"
            icon={<Mail aria-hidden="true" className="w-4 h-4" />}
            label="Messages"
          />
          <NavItem
            collapsed={collapsed}
            href="/dashboard/reports"
            icon={<FileText aria-hidden="true" className="w-4 h-4" />}
            label="Reports & Analytics"
          />

          {!collapsed && (
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 mt-6">
              Others
            </div>
          )}
          <NavItem
            collapsed={collapsed}
            href="/dashboard/settings"
            icon={<Settings aria-hidden="true" className="w-4 h-4" />}
            label="Settings"
          />
          <NavItem
            collapsed={collapsed}
            href="/dashboard/help"
            icon={<HelpCircle aria-hidden="true" className="w-4 h-4" />}
            label="Help & Support"
          />
        </nav>
      </aside>
    </>
  );
}

function NavItem({ active, collapsed, href, icon, label }: NavItemProps) {
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        'min-h-[44px]', // Touch target size
        'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#111111]',
        active
          ? 'bg-white/10 text-white font-medium'
          : 'text-white/60 hover:text-white hover:bg-white/5',
        collapsed && 'justify-center'
      )}
      href={href}
      title={collapsed ? label : undefined}
    >
      {icon}
      {!collapsed && <span className="whitespace-nowrap">{label}</span>}
    </Link>
  );
}
