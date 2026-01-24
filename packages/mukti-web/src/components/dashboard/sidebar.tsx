'use client';

import { Brain, Menu, PanelLeft, Plus, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
export function Sidebar({
  collapsed,
  mobileOpen = false,
  onMobileClose,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

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
          'bg-[#000000] border-r border-white/10 transition-all duration-300 flex flex-col',
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
            'p-3 mb-2 flex items-center',
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
              <Image alt="Mukti" className="object-contain" fill priority src="/mukti-logo-2.png" />
            </div>
            <span className="font-semibold text-sm whitespace-nowrap">Mukti AI</span>
          </div>

          {/* Desktop collapse button */}
          <Button
            className={cn(
              'hidden md:flex h-8 w-8 text-white/60 hover:text-white',
              collapsed && 'flex mx-auto'
            )}
            onClick={onToggleCollapse}
            size="icon"
            variant="ghost"
          >
            {/*{collapsed ? <PanelRight className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}*/}
            <PanelLeft
              className={`w-4 h-4 text-white ${collapsed ? 'rotate-180' : ''} transition-all duration-800`}
            />
          </Button>

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
        <nav aria-label="Dashboard navigation" className="flex-1 px-3 space-y-1 overflow-y-auto">
          {/* New Chat Button */}
          <Link
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              'min-h-[40px]',
              'bg-white/5 hover:bg-white/10 text-white font-medium',
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

          {/* Separator */}
          <div className={cn('pt-4 pb-2', collapsed && 'hidden')}>
            <div className="border-t border-white/10 mb-2" />
            <p className="px-3 text-xs font-semibold text-white/50 uppercase tracking-wider">
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
        </nav>

        {/* User Profile */}
        <div className="p-3 mt-auto">
          {!collapsed && (
            <div className="mb-2 rounded-xl border border-white/5 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
                </span>
                <span className="text-xs font-medium text-white">mukti is in beta</span>
              </div>
              <p className="pl-4 text-[10px] leading-relaxed text-white/50">
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
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        'min-h-[40px]',
        active
          ? 'bg-white/10 text-white font-medium'
          : 'text-white/80 hover:text-white hover:bg-white/5',
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
