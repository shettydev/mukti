'use client';

import { Brain, Menu, PanelLeft, Plus, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ConversationList } from '@/components/sidebar/conversation-list';
import { UserProfilePopover } from '@/components/sidebar/user-profile-popover';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';
import { cn } from '@/lib/utils';

/**
 * Navigation item component
 */
interface NavItemProps {
  active?: boolean;
  collapsed: boolean;
  href: string;
  icon: React.ReactNode;
  label: string;
}

interface SidebarProps {
  collapsed: boolean;
  /** Whether sidebar is open on mobile */
  mobileOpen?: boolean;
  /** Callback when mobile sidebar should close */
  onMobileClose?: () => void;
  /** Callback to toggle sidebar collapse state */
  onToggleCollapse?: () => void;
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
      className={cn(
        'md:hidden min-h-[44px] min-w-[44px] text-japandi-stone hover:bg-japandi-light-stone/80',
        className
      )}
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
export function Sidebar({
  collapsed,
  mobileOpen = false,
  onMobileClose,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const { logout, user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoSrc =
    mounted && resolvedTheme === 'dark'
      ? '/mukti-enso/mukti-inverted-enso-no-bg.png'
      : '/mukti-enso-inverted/mukti-enso-no-bg.png';

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-japandi-stone/35 backdrop-blur-[1px] md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Main navigation"
        className={cn(
          'flex flex-col border-r border-japandi-sand/75 bg-japandi-light-stone/75 text-japandi-stone backdrop-blur-sm transition-all duration-300',
          // Desktop styles
          'hidden md:flex',
          collapsed ? 'md:w-20' : 'md:w-[260px]',
          // Mobile styles - slide in from left
          mobileOpen && 'fixed inset-y-0 left-0 z-50 flex w-[260px] md:relative md:z-auto'
        )}
        role="navigation"
      >
        {/* Logo and toggle/close button */}
        <div
          className={cn(
            'mb-2 flex items-center p-3',
            collapsed ? 'justify-center' : 'justify-between'
          )}
          suppressHydrationWarning
        >
          <div
            className={cn(
              'flex items-center gap-2 transition-opacity px-2',
              collapsed && 'opacity-0 hidden'
            )}
          >
            <div className="relative w-8 h-8">
              <Image alt="Mukti" className="object-contain" fill priority src={logoSrc} />
            </div>
            <span className="whitespace-nowrap text-sm font-medium tracking-[0.15em] lowercase">
              mukti
            </span>
          </div>

          {/* Desktop collapse button */}
          <div className={cn('hidden items-center gap-1 md:flex', collapsed && 'mx-auto')}>
            <Button
              className={cn(
                'h-8 w-8 text-japandi-stone/70 hover:bg-japandi-cream/70 hover:text-japandi-stone',
                collapsed && 'mx-auto'
              )}
              onClick={onToggleCollapse}
              size="icon"
              variant="ghost"
            >
              <PanelLeft
                className={`h-4 w-4 ${collapsed ? 'rotate-180' : ''} transition-all duration-300`}
              />
            </Button>
          </div>

          {/* Mobile close button */}
          {mobileOpen && (
            <Button
              aria-label="Close navigation menu"
              className="min-h-[44px] min-w-[44px] text-japandi-stone md:hidden"
              onClick={onMobileClose}
              size="icon"
              variant="ghost"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav aria-label="Dashboard navigation" className="flex-1 px-3 space-y-1 overflow-y-auto">
          {/* New Chat Button */}
          <Link
            aria-label="New Chat"
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              'min-h-[40px]',
              'bg-japandi-sage/20 text-japandi-stone hover:bg-japandi-sage/30 font-medium',
              collapsed && 'justify-center'
            )}
            href="/chat"
            title={collapsed ? 'New Chat' : undefined}
          >
            <Plus aria-hidden="true" className="w-4 h-4" />
            {!collapsed && <span className="whitespace-nowrap">New Chat</span>}
          </Link>

          {/* Thinking Canvas Link */}
          <NavItem
            active={pathname?.startsWith('/canvas')}
            collapsed={collapsed}
            href="/canvas"
            icon={<Brain aria-hidden="true" className="w-4 h-4" />}
            label="Thinking Canvas"
          />

          {!collapsed && (
            <>
              {/* Separator */}
              <div className="pt-4 pb-2">
                <div className="mb-2 border-t border-japandi-sand/70" />
                <p className="text-japandi-label px-3 text-japandi-stone/60">
                  Conversations
                </p>
              </div>

              {/* Conversation list */}
              <ConversationList
                collapsed={collapsed}
                onConversationClick={() => {
                  // Close mobile sidebar if open, navigation happens in ConversationList
                  onMobileClose?.();
                }}
              />
            </>
          )}
        </nav>

        {/* User Profile */}
        <div className="p-3 mt-auto">
          {!collapsed && (
            <div className="mb-2 rounded-xl border border-japandi-sand/70 bg-japandi-cream/70 p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-japandi-sage opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-japandi-sage" />
                </span>
                <span className="text-xs font-medium text-japandi-stone">mukti is in beta</span>
              </div>
              <p className="pl-4 text-[10px] leading-relaxed text-japandi-stone/65">
                We are still in active development.
              </p>
            </div>
          )}
          <UserProfilePopover collapsed={collapsed} onLogout={logout} user={user!} />
        </div>
      </aside>
    </>
  );
}

function NavItem({ active, collapsed, href, icon, label }: NavItemProps) {
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        'min-h-[40px]',
        active
          ? 'bg-japandi-sage/20 text-japandi-stone font-medium'
          : 'text-japandi-stone/75 hover:bg-japandi-cream/70 hover:text-japandi-stone',
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
