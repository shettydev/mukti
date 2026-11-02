'use client';

import { ArrowRight, ChevronDown, Github } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Noto_Serif_Devanagari } from 'next/font/google';
import Link from 'next/link';

import { GITHUB_URL } from './constants';
import InstallCommand from './install-command';

const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ['devanagari'],
  weight: '100',
});

export default function LandingHero() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 100], [1, 0]);

  return (
    <section className="relative flex min-h-[100svh] md:min-h-screen w-full flex-col items-center justify-center overflow-hidden px-5 xs:px-6 pt-28 pb-16 sm:pt-32 sm:pb-20 md:px-12 md:py-24">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <motion.span
          animate={{ opacity: 0.04 }}
          className={`${notoSerifDevanagari.className} text-[50vw] xs:text-[35vw] sm:text-[30vw] md:text-[24vw] translate-x-2 text-japandi-stone whitespace-nowrap leading-none tracking-widest md:[writing-mode:vertical-rl]`}
          initial={{ opacity: 0 }}
          transition={{ duration: 2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          मुक्ति
        </motion.span>
      </div>

      {/* mx-auto: globals.css forces `section { display: block }`, so the section's flex centering never applies. */}
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        <motion.span
          animate={{ opacity: 1, y: 0 }}
          className="text-japandi-sage text-japandi-label mb-6 sm:mb-8 tracking-[0.25em]"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.2, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          Your mind, unprompted
        </motion.span>

        <motion.h1
          animate={{ opacity: 1, y: 0 }}
          className="text-japandi-stone text-4xl xs:text-5xl md:text-6xl lg:text-7xl font-light tracking-wide mb-6 sm:mb-8 leading-[1.1] text-balance"
          initial={{ opacity: 0, y: 30 }}
          transition={{ delay: 0.4, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          An AI that answers your questions with better questions
        </motion.h1>

        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="text-japandi-stone/80 text-base xs:text-lg md:text-xl max-w-2xl mb-10 sm:mb-12 font-light leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          transition={{ delay: 0.6, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          Mukti is an open-source Socratic thinking workspace. Run it locally on the Claude Code,
          Codex or Antigravity subscription you already have — no signup, no API keys.
        </motion.p>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-5"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.8, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="flex flex-col xs:flex-row items-center gap-4">
            <InstallCommand />
            <Link
              className="group flex items-center gap-2 px-6 py-3 border border-japandi-stone/20 text-japandi-stone text-sm font-medium tracking-widest rounded-sm hover:border-japandi-terracotta hover:text-japandi-terracotta transition-colors duration-300"
              href={GITHUB_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Github className="w-4 h-4" />
              <span>View on GitHub</span>
            </Link>
          </div>

          <Link
            className="group flex items-center gap-1.5 text-sm text-japandi-stone/60 tracking-wide hover:text-japandi-terracotta transition-colors duration-300"
            href="/auth"
          >
            <span>Or try it in your browser</span>
            <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>

      <motion.div
        animate={{ opacity: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        transition={{ delay: 1.2, duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <motion.div style={{ opacity }}>
          <Link aria-label="Scroll to content" href="#demo">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, ease: 'easeInOut', repeat: Infinity }}
            >
              <ChevronDown className="w-8 h-8 text-japandi-stone/60" />
            </motion.div>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
