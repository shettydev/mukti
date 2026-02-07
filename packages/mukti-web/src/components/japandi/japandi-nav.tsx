'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

export default function JapandiNav() {
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
      <Link className="group" href="/japandi">
        <span className="text-japandi-stone text-xl font-light tracking-[0.15em] lowercase opacity-90 group-hover:opacity-100 transition-opacity">
          komorebi
        </span>
      </Link>

      <Link
        className={cn(
          'text-japandi-stone text-sm tracking-widest uppercase hover:text-japandi-terracotta transition-colors duration-300',
          "relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[1px] after:bg-japandi-terracotta after:transition-all after:duration-300 hover:after:w-full"
        )}
        href="#begin"
      >
        Begin your practice
      </Link>
    </motion.nav>
  );
}
