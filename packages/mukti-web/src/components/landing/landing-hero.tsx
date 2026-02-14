'use client';

import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Noto_Serif_Devanagari } from 'next/font/google';
import Link from 'next/link';

const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ['devanagari'],
  weight: '100',
});

export default function LandingHero() {
  return (
    <section className="relative flex min-h-[100svh] md:min-h-screen w-full flex-col items-center justify-center overflow-hidden px-5 xs:px-6 pt-28 pb-16 sm:pt-32 sm:pb-20 md:px-12 md:py-24">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <motion.span
          animate={{ opacity: 0.04 }}
          className={`${notoSerifDevanagari.className} text-[55vw] xs:text-[45vw] sm:text-[38vw] md:text-[30vw] text-japandi-stone whitespace-nowrap leading-none tracking-widest`}
          initial={{ opacity: 0 }}
          style={{ writingMode: 'vertical-rl' }}
          transition={{ duration: 2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          मुक्ति
        </motion.span>
      </div>

      <div className="relative z-10 flex max-w-4xl flex-col items-center text-center">
        <motion.span
          animate={{ opacity: 1, y: 0 }}
          className="text-japandi-sage text-japandi-label mb-6 sm:mb-8 tracking-[0.25em]"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.2, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          Liberation from AI Dependency
        </motion.span>

        <motion.h1
          animate={{ opacity: 1, y: 0 }}
          className="text-japandi-stone text-4xl xs:text-5xl md:text-7xl lg:text-8xl font-light tracking-wide mb-6 sm:mb-8 leading-[1.1]"
          initial={{ opacity: 0, y: 30 }}
          transition={{ delay: 0.4, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          Your mind,
          <br />
          unprompted
        </motion.h1>

        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="text-japandi-stone/80 text-base xs:text-lg md:text-xl max-w-xl mb-10 sm:mb-12 font-light leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          transition={{ delay: 0.6, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          In the silence between prompts, you exist.
          <br />
          Nurture the thoughts that are truly your own.
        </motion.p>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.8, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Link
            className="group flex items-center gap-2 text-japandi-terracotta text-base xs:text-lg tracking-widest hover:text-japandi-stone transition-colors duration-500"
            href="#philosophy"
          >
            <span>Learn the method</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>

      <motion.div
        animate={{ opacity: 1, width: '100%' }}
        className="absolute bottom-10 sm:bottom-16 md:bottom-24 left-0 right-0 flex items-center justify-center"
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
