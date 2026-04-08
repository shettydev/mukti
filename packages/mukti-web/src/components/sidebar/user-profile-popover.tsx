'use client';

import { Check, LogOut, Monitor, Moon, Settings, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { User } from '@/types/user.types';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
            {user?.foundingMember ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-japandi-sage/25 text-sm font-semibold text-japandi-timber founder-avatar-ring">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  className="relative p-0 rounded-xl overflow-hidden founder-tooltip-card"
                  hideArrow
                  side="right"
                  sideOffset={8}
                  style={{
                    backgroundColor: '#0f0e0d',
                    border: '1px solid rgba(212,168,67,0.22)',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,168,67,0.1)',
                    minWidth: '190px',
                  }}
                >
                  {/* Beams — full background */}
                  <FounderBeams />

                  {/* Content sits on top of beams */}
                  <div className="relative px-4 py-3.5">
                    <p
                      className="text-[11px] font-semibold tracking-[0.18em] uppercase"
                      style={{
                        color: '#d4a843',
                        textShadow: '0 0 18px rgba(212,168,67,0.6)',
                      }}
                    >
                      Founding Member
                    </p>
                    <p
                      className="mt-1.5 text-[10px] leading-snug"
                      style={{ color: 'rgba(232,224,214,0.85)' }}
                    >
                      Early access supporter
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-japandi-sage/25 text-sm font-semibold text-japandi-timber">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
            )}

            {/* User Info - Hidden when collapsed */}
            {!collapsed && (
              <div className="flex flex-col items-start text-sm truncate overflow-hidden">
                <span className="truncate text-left font-medium text-japandi-stone">
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
          <Link href="/settings">
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

function FounderBeams() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let raf: number;
    let W = 0;
    let H = 0;

    type Beam = { alpha: number; phase: number; speed: number; w: number; x: number };
    let beams: Beam[] = [];

    const init = (w: number, h: number) => {
      W = w;
      H = h;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      beams = Array.from({ length: 6 }, (_, i) => ({
        alpha: 0.18 + Math.random() * 0.18,
        phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.3,
        w: 22 + Math.random() * 22,
        x: (W / 6) * i + (Math.random() - 0.5) * 15,
      }));
    };

    const ro = new ResizeObserver((entries) => {
      const { height, width } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        init(width, height);
      }
    });
    ro.observe(canvas);

    init(canvas.offsetWidth || 200, canvas.offsetHeight || 80);

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      beams.forEach((b) => {
        const dx = Math.sin(t * b.speed + b.phase) * 7;
        const x = b.x + dx;

        // Vertical fade: bright centre, fade toward top and bottom edges
        const vertGrd = ctx.createLinearGradient(0, 0, 0, H);
        vertGrd.addColorStop(0, 'rgba(0,0,0,0.6)');
        vertGrd.addColorStop(0.3, 'rgba(0,0,0,0)');
        vertGrd.addColorStop(0.7, 'rgba(0,0,0,0)');
        vertGrd.addColorStop(1, 'rgba(0,0,0,0.6)');

        // Horizontal beam shape
        const hGrd = ctx.createLinearGradient(x, 0, x + b.w, 0);
        hGrd.addColorStop(0, 'transparent');
        hGrd.addColorStop(0.3, `rgba(212,168,67,${b.alpha})`);
        hGrd.addColorStop(0.7, `rgba(212,168,67,${b.alpha})`);
        hGrd.addColorStop(1, 'transparent');

        ctx.fillStyle = hGrd;
        ctx.fillRect(x, 0, b.w, H);
      });

      // Top and bottom vignette
      const topFade = ctx.createLinearGradient(0, 0, 0, H * 0.4);
      topFade.addColorStop(0, 'rgba(15,14,13,0.7)');
      topFade.addColorStop(1, 'transparent');
      ctx.fillStyle = topFade;
      ctx.fillRect(0, 0, W, H * 0.4);

      const botFade = ctx.createLinearGradient(0, H * 0.6, 0, H);
      botFade.addColorStop(0, 'transparent');
      botFade.addColorStop(1, 'rgba(15,14,13,0.7)');
      ctx.fillStyle = botFade;
      ctx.fillRect(0, H * 0.6, W, H * 0.4);

      t += 0.04;
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        height: '100%',
        inset: 0,
        pointerEvents: 'none',
        position: 'absolute',
        width: '100%',
      }}
    />
  );
}
