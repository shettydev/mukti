'use client';

import { motion } from 'motion/react';

export default function JapandiPhilosophy() {
  return (
    <section
      className="relative w-full px-6 py-24 md:px-12 lg:py-32 bg-japandi-cream"
      id="philosophy"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span className="text-japandi-sage text-japandi-label block mb-4">Philosophy</span>
          <h2 className="text-japandi-stone text-4xl md:text-5xl lg:text-6xl font-light tracking-wide leading-tight">
            Not another productivity tool
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            transition={{ delay: 0.2, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <p className="text-japandi-stone/90 text-xl md:text-2xl font-light leading-relaxed">
              We believe the modern obsession with output has cost us something precious — the
              quality of our attention. Komorebi exists to restore that.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            transition={{ delay: 0.4, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <p className="text-japandi-stone/80 text-lg md:text-xl font-light leading-relaxed">
              Inspired by the Japanese concept of <span className="italic">間 (ma)</span> — the
              meaningful pause — and the Scandinavian ideal of <span className="italic">lagom</span>{' '}
              — just enough — we&apos;ve created a practice that makes space for both focus and
              stillness.
            </p>
          </motion.div>
        </div>

        <motion.div
          className="mt-24 w-full h-[1px] bg-japandi-sand/40 origin-left"
          initial={{ opacity: 0, scaleX: 0 }}
          transition={{ delay: 0.6, duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, scaleX: 1 }}
        />
      </div>
    </section>
  );
}
