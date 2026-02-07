'use client';

import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

export default function JapandiHero() {
  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 py-24 md:px-12">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <motion.span
          animate={{ opacity: 0.08 }}
          className="text-[20vw] font-thin text-japandi-stone whitespace-nowrap leading-none"
          initial={{ opacity: 0 }}
          style={{ writingMode: 'vertical-rl' }}
          transition={{ duration: 2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          木漏れ日
        </motion.span>
      </div>

      <div className="relative z-10 flex max-w-4xl flex-col items-center text-center">
        <motion.span
          animate={{ opacity: 1, y: 0 }}
          className="text-japandi-sage text-japandi-label mb-8 tracking-[0.25em]"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.2, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          A Mindful Focus Practice
        </motion.span>

        <motion.h1
          animate={{ opacity: 1, y: 0 }}
          className="text-japandi-stone text-5xl md:text-7xl lg:text-8xl font-light tracking-wide mb-8 leading-[1.1]"
          initial={{ opacity: 0, y: 30 }}
          transition={{ delay: 0.4, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          Where deep work
          <br />
          meets deep calm
        </motion.h1>

        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="text-japandi-stone/80 text-lg md:text-xl max-w-xl mb-12 font-light leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          transition={{ delay: 0.6, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          Design intentional focus rituals that honor both productivity and presence.
        </motion.p>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.8, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Link
            className="group flex items-center gap-2 text-japandi-terracotta text-lg tracking-widest hover:text-japandi-stone transition-colors duration-500"
            href="#philosophy"
          >
            <span>Discover the practice</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>

      <motion.div
        animate={{ opacity: 1, width: '100%' }}
        className="absolute bottom-24 left-0 right-0 flex items-center justify-center"
        initial={{ opacity: 0, width: 0 }}
        transition={{ delay: 1.2, duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="h-[1px] w-full max-w-xs bg-japandi-sand/50 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-japandi-sand bg-japandi-cream" />
        </div>
      </motion.div>
    </section>
  );
}
