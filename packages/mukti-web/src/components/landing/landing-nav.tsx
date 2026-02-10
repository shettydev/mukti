'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

export default function LandingNav() {
  const { scrollY } = useScroll();

  const backgroundColor = useTransform(
    scrollY,
    [0, 50],
    ['rgba(245, 240, 235, 0)', 'rgba(245, 240, 235, 0.95)']
  );

  const backdropFilter = useTransform(scrollY, [0, 50], ['blur(0px)', 'blur(8px)']);

  const borderBottomColor = useTransform(
    scrollY,
    [0, 50],
    ['rgba(212, 197, 178, 0)', 'rgba(212, 197, 178, 0.3)']
  );

  const textColor = useTransform(
    scrollY,
    [0, 50],
    ['rgba(255, 255, 255, 0.9)', 'rgba(44, 44, 43, 1)']
  );

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 md:py-6 transition-all duration-500"
      style={{
        backdropFilter,
        backgroundColor,
        borderBottom: '1px solid',
        borderBottomColor,
      }}
    >
      <Link className="group" href="/">
        <motion.span
          className="text-xl font-light tracking-[0.15em] lowercase transition-opacity"
          style={{ color: textColor }}
        >
          mukti
        </motion.span>
      </Link>

      <motion.div style={{ color: textColor }}>
        <Link
          className={cn(
            'text-sm tracking-widest uppercase hover:text-japandi-terracotta transition-colors duration-300',
            "relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[1px] after:bg-japandi-terracotta after:transition-all after:duration-300 hover:after:w-full"
          )}
          href="#join"
        >
          Join Waitlist
        </Link>
      </motion.div>
    </motion.nav>
  );
}
