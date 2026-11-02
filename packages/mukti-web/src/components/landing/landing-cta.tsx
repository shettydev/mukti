'use client';

import { ArrowRight, Sparkles, Star } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

import { GITHUB_URL } from './constants';
import InstallCommand from './install-command';

export default function LandingCTA() {
  return (
    <section
      className="relative w-full px-5 xs:px-6 py-20 sm:py-24 md:px-12 lg:py-32 bg-japandi-sand/30"
      id="join"
    >
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span className="text-japandi-sage text-japandi-label tracking-[0.2em] block mb-6">
            Free & Open Source
          </span>
          <h2 className="text-japandi-stone text-4xl md:text-5xl lg:text-6xl font-light tracking-wide leading-tight mb-6">
            Begin your liberation
          </h2>
          <p className="text-japandi-stone/70 text-lg font-light">
            One command, on the AI subscription you already have.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.2, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <InstallCommand className="px-8 py-4 text-base" />
        </motion.div>

        <motion.div
          className="mt-8 flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.4, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1 }}
        >
          <Link
            className="group flex items-center gap-2 text-sm text-japandi-stone/60 tracking-wide hover:text-japandi-terracotta transition-colors duration-300"
            href="/auth"
          >
            <span>Or use the hosted version, free to start</span>
            <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

          {/* Founding Member Badge (hosted accounts) */}
          <div className="inline-flex items-center gap-2 rounded-full border border-japandi-terracotta/30 bg-japandi-terracotta/10 px-4 py-1.5">
            <Sparkles className="w-3.5 h-3.5 text-japandi-terracotta" />
            <span className="text-japandi-terracotta text-xs font-medium tracking-wide">
              First 100 hosted accounts get Founding Member status
            </span>
          </div>
        </motion.div>

        {/* Secondary CTA — GitHub */}
        <motion.div
          className="mt-10 flex items-center justify-center"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.6, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1 }}
        >
          <Link
            className="group flex items-center gap-2 rounded-sm border border-japandi-stone/10 bg-japandi-cream px-5 py-2.5 text-sm tracking-widest text-japandi-stone/60 transition-colors duration-300 hover:border-japandi-stone/30 hover:text-japandi-stone"
            href={GITHUB_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Star className="h-4 w-4 transition-colors duration-300 group-hover:text-yellow-400" />
            <span>Star on GitHub</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
