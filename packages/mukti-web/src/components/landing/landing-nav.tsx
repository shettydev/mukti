'use client';

import { Moon, Sun } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export default function LandingNav() {
  const { scrollY } = useScroll();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatches by not using the resolved theme during SSR / first client render.
  // next-themes can resolve theme from storage before hydration, which would otherwise cause
  // server/client style attribute differences.
  const isDark = mounted ? resolvedTheme === 'dark' : false;

  const backgroundColor = useTransform(
    scrollY,
    [0, 50],
    isDark
      ? ['rgba(26, 25, 23, 0)', 'rgba(245, 240, 235, 0.95)']
      : ['rgba(245, 240, 235, 0)', 'rgba(44, 44, 43, 0.95)']
  );

  const backdropFilter = useTransform(scrollY, [0, 50], ['blur(0px)', 'blur(8px)']);

  const borderBottomColor = useTransform(
    scrollY,
    [0, 50],
    isDark
      ? ['rgba(61, 56, 48, 0)', 'rgba(212, 197, 178, 0.2)']
      : ['rgba(212, 197, 178, 0)', 'rgba(255, 255, 255, 0.1)']
  );

  const textColor = useTransform(
    scrollY,
    [0, 50],
    isDark
      ? ['rgba(232, 224, 214, 0.9)', 'rgba(44, 44, 43, 1)']
      : ['rgba(44, 44, 43, 1)', 'rgba(245, 240, 235, 0.95)']
  );

  const darkLogoOpacity = useTransform(scrollY, [0, 50], isDark ? [0, 1] : [1, 0]);
  const lightLogoOpacity = useTransform(scrollY, [0, 50], isDark ? [1, 0] : [0, 1]);

  const toggleTheme = async () => {
    const next = isDark ? 'light' : 'dark';

    if (
      !toggleRef.current ||
      !document.startViewTransition ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setTheme(next);
      return;
    }

    const transition = document.startViewTransition(() => setTheme(next));
    await transition.ready;

    const { height, left, top, width } = toggleRef.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const right = window.innerWidth - left;
    const bottom = window.innerHeight - top;
    const maxRadius = Math.hypot(Math.max(left, right), Math.max(top, bottom));

    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`] },
      {
        duration: 700,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        pseudoElement: '::view-transition-new(root)',
      }
    );
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 sm:px-6 sm:py-4 md:px-12 md:py-6 transition-all duration-500"
      style={{
        backdropFilter,
        backgroundColor,
        borderBottom: '1px solid',
        borderBottomColor,
      }}
    >
      <Link className="group" href="/">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="relative h-8 w-8">
            <motion.span className="absolute inset-0" style={{ opacity: darkLogoOpacity }}>
              <Image
                alt="Mukti"
                className="h-8 w-8 object-contain"
                height={32}
                priority
                src="/mukti-enso-inverted/mukti-enso-no-bg.png"
                width={32}
              />
            </motion.span>
            <motion.span className="absolute inset-0" style={{ opacity: lightLogoOpacity }}>
              <Image
                alt="Mukti"
                className="h-8 w-8 object-contain"
                height={32}
                priority
                src="/mukti-enso/mukti-inverted-enso-no-bg.png"
                width={32}
              />
            </motion.span>
          </span>

          <motion.span
            className="text-lg sm:text-xl font-light tracking-[0.15em] lowercase transition-opacity"
            style={{ color: textColor }}
          >
            mukti
          </motion.span>
        </div>
      </Link>

      <div className="flex items-center gap-4 sm:gap-6">
        <motion.div style={{ color: textColor }}>
          <Link
            className={cn(
              'text-xs xs:text-sm tracking-widest uppercase hover:text-japandi-terracotta transition-colors duration-300',
              "relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[1px] after:bg-japandi-terracotta after:transition-all after:duration-300 hover:after:w-full"
            )}
            href="#join"
          >
            Join Waitlist
          </Link>
        </motion.div>

        {mounted && (
          <motion.button
            aria-label="Toggle theme"
            className="relative flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 hover:bg-white/10 cursor-pointer"
            onClick={toggleTheme}
            ref={toggleRef}
            style={{ color: textColor }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </motion.button>
        )}
      </div>
    </motion.nav>
  );
}
