'use client';

import {
  Brain,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  PanelLeft,
  PanelRight,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
            active={pathname?.startsWith('/dashboard/canvas')}
            collapsed={collapsed}
            href="/dashboard/canvas"
            icon={<Brain aria-hidden="true" className="w-4 h-4" />}
            label="Thinking Canvas"
          />
          <div className={cn('pt-4 pb-2', collapsed && 'hidden')}>
            <p className="px-3 text-xs font-semibold text-white/50 uppercase tracking-wider">
              Workspace
            </p>
          </div>
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
            label="Reports"
          />
          <NavItem
            active={pathname?.startsWith('/dashboard/security')}
            collapsed={collapsed}
            href="/dashboard/security"
            icon={<Shield aria-hidden="true" className="w-4 h-4" />}
            label="Security"
          />
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

        {/* User Profile */}
        <div className="p-3 mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className={cn(
                  'w-full justify-start p-2 h-auto hover:bg-white/10 rounded-xl transition-all',
                  collapsed && 'justify-center px-2'
                )}
                variant="ghost"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 text-white">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </div>
                  {!collapsed && (
                    <div className="flex flex-col items-start text-sm truncate overflow-hidden">
                      <span className="font-medium truncate w-full text-left text-white">
                        {user?.firstName} {user?.lastName}
                      </span>
                      <span className="text-xs text-white/60 truncate w-full text-left">
                        {user?.email}
                      </span>
                    </div>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56 bg-[#1A1A1A] border-white/10 text-white"
              side="top"
              sideOffset={10}
            >
              <DropdownMenuItem
                className="text-red-400 focus:text-red-400 focus:bg-red-900/10 cursor-pointer"
                onClick={() => logout()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#111111]',
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
