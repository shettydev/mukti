'use client';

import { ArrowRight, Sparkles, Star } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

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
            Now Open
          </span>
          <h2 className="text-japandi-stone text-4xl md:text-5xl lg:text-6xl font-light tracking-wide leading-tight mb-6">
            Begin your liberation
          </h2>

          {/* Founding Member Badge */}
          <motion.div
            className="inline-flex items-center gap-2 rounded-full border border-japandi-terracotta/30 bg-japandi-terracotta/10 px-4 py-1.5 mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, scale: 1 }}
          >
            <Sparkles className="w-3.5 h-3.5 text-japandi-terracotta" />
            <span className="text-japandi-terracotta text-xs sm:text-sm font-medium tracking-wide">
              First 100 users get Founding Member status
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.2, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <Link
            className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-japandi-terracotta text-japandi-cream font-medium tracking-wide rounded-sm hover:bg-japandi-timber transition-colors duration-300 flex items-center justify-center gap-2 group"
            href="/auth"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <motion.p
          className="text-japandi-stone/50 text-sm mt-6"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.4, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1 }}
        >
          Free to use. No credit card required.
        </motion.p>

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
            href="https://github.com/shettydev/mukti"
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
