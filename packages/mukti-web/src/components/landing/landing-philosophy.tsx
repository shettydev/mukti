'use client';

import { motion } from 'motion/react';

export default function LandingPhilosophy() {
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
          <span className="text-japandi-sage text-japandi-label block mb-4">Our Mission</span>
          <h2 className="text-japandi-stone text-4xl md:text-5xl lg:text-6xl font-light tracking-wide leading-tight">
            Not just another AI wrapper
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
              We believe the modern obsession with instant AI answers has cost us something precious{' '}
              <br />— the ability to think for ourselves.
              <br /> Mukti exists to restore that cognitive sovereignty.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            transition={{ delay: 0.4, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <p className="text-japandi-stone/80 text-lg md:text-xl font-light leading-relaxed">
              Inspired by the Socratic method of <span className="italic">Maieutics</span> —
              intellectual midwifery — we&apos;ve created a space where your ideas can be born, not
              borrowed. <br />
              We use AI to gently challenge your assumptions, providing just enough guidance to
              spark your own autonomy, ensuring the final insight is always yours.
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
