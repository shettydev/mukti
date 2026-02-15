'use client';

import { Check, Moon, Monitor, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type ThemeOption = 'dark' | 'light' | 'system';

interface JapandiThemeToggleProps {
  align?: 'center' | 'end' | 'start';
  ariaLabel?: string;
  buttonClassName?: string;
  className?: string;
  contentClassName?: string;
}

const themeOptions: Array<{
  icon: typeof Sun;
  label: string;
  value: ThemeOption;
}> = [
  { icon: Sun, label: 'Light', value: 'light' },
  { icon: Moon, label: 'Dark', value: 'dark' },
  { icon: Monitor, label: 'System', value: 'system' },
];

export function JapandiThemeToggle({
  align = 'end',
  ariaLabel = 'Toggle theme',
  buttonClassName,
  className,
  contentClassName,
}: JapandiThemeToggleProps) {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = (mounted ? theme : 'system') as ThemeOption;
  const Icon = useMemo(() => {
    if (activeTheme === 'light') {
      return Sun;
    }
    if (activeTheme === 'dark') {
      return Moon;
    }
    return Monitor;
  }, [activeTheme]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={ariaLabel}
          className={cn(
            'h-9 w-9 rounded-full border border-japandi-sand/60 bg-japandi-cream/70 text-japandi-stone shadow-sm backdrop-blur',
            'hover:bg-japandi-light-stone/90 hover:text-japandi-timber',
            'focus-visible:border-japandi-sage focus-visible:ring-japandi-sage/40',
            buttonClassName
          )}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Icon className="h-4 w-4" />
          <span className="sr-only">{ariaLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn(
          'min-w-36 border-japandi-sand/70 bg-japandi-cream/95 text-japandi-stone backdrop-blur',
          className,
          contentClassName
        )}
      >
        {themeOptions.map((option) => {
          const OptionIcon = option.icon;
          const isActive = activeTheme === option.value;

          return (
            <DropdownMenuItem
              className={cn(
                'cursor-pointer gap-2 text-japandi-stone focus:bg-japandi-light-stone focus:text-japandi-stone',
                isActive && 'font-medium text-japandi-timber'
              )}
              key={option.value}
              onClick={() => setTheme(option.value)}
            >
              <OptionIcon className="h-4 w-4" />
              <span>{option.label}</span>
              {isActive && <Check className="ml-auto h-3.5 w-3.5" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
