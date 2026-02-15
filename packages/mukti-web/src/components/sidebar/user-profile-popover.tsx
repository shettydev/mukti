'use client';

import { Check, LogOut, Monitor, Moon, Settings, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { User } from '@/types/user.types';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * User profile popover component props
 * @property {boolean} collapsed - Whether the sidebar is collapsed
 * @property {() => void} onLogout - Callback function to handle logout
 * @property {User} user - Current user data
 */
interface UserProfilePopoverProps {
  collapsed: boolean;
  onLogout: () => void;
  user: User;
}

/**
 * User profile popover component
 *
 * Displays user information and provides navigation to:
 * - Security settings
 * - User settings
 * - Help & Support
 * - Logout action
 *
 * Replaces the existing dropdown menu in the sidebar with enhanced navigation options.
 *
 * @example
 * ```tsx
 * <UserProfilePopover
 *   user={currentUser}
 *   collapsed={false}
 *   onLogout={handleLogout}
 * />
 * ```
 */
export function UserProfilePopover({ collapsed, onLogout, user }: UserProfilePopoverProps) {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? theme : 'system';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            'h-auto w-full justify-start rounded-xl p-2 transition-all hover:bg-japandi-cream/70',
            collapsed && 'justify-center px-2'
          )}
          variant="ghost"
        >
          <div className="flex items-center gap-3 w-full">
            {/* User Avatar */}
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-japandi-sage/25 text-sm font-semibold text-japandi-timber">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>

            {/* User Info - Hidden when collapsed */}
            {!collapsed && (
              <div className="flex flex-col items-start text-sm truncate overflow-hidden">
                <span className="w-full truncate text-left font-medium text-japandi-stone">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="w-full truncate text-left text-xs text-japandi-stone/65">
                  {user?.email}
                </span>
              </div>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-56 border-japandi-sand/80 !bg-japandi-cream text-japandi-stone shadow-xl opacity-100"
        side="top"
        sideOffset={10}
      >
        {/* Settings Link */}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/dashboard/settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
          {activeTheme === 'system' && <Check className="ml-auto h-3.5 w-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
          {activeTheme === 'light' && <Check className="ml-auto h-3.5 w-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
          {activeTheme === 'dark' && <Check className="ml-auto h-3.5 w-3.5" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout Button */}
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:bg-red-500/10 focus:text-red-700 dark:text-red-300 dark:focus:text-red-200"
          onClick={onLogout}
          variant="destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
