'use client';

import { LogOut, Settings } from 'lucide-react';
import Link from 'next/link';

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
  return (
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
            {/* User Avatar */}
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 text-white">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>

            {/* User Info - Hidden when collapsed */}
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
        {/* Settings Link */}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/dashboard/settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>

        {/* Separator before logout */}
        <DropdownMenuSeparator />

        {/* Logout Button */}
        <DropdownMenuItem
          className="text-red-400 focus:text-red-400 focus:bg-red-900/10 cursor-pointer"
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
