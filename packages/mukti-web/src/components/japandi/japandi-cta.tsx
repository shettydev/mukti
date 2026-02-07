'use client';

import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

export default function JapandiCTA() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail('');
  };

  return (
    <section className="relative w-full px-6 py-24 md:px-12 lg:py-32 bg-japandi-sand/30" id="begin">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span className="text-japandi-sage text-japandi-label tracking-[0.2em] block mb-6">
            Begin
          </span>
          <h2 className="text-japandi-stone text-4xl md:text-5xl lg:text-6xl font-light tracking-wide leading-tight mb-6">
            Your practice begins with a single breath
          </h2>
          <p className="text-japandi-stone/80 text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto mb-12">
            Start with our free 7-day focus ritual. No credit card. No complexity. Just presence.
          </p>
        </motion.div>

        <motion.form
          className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-md mx-auto"
          initial={{ opacity: 0, y: 20 }}
          onSubmit={handleSubmit}
          transition={{ delay: 0.2, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <input
            className="w-full md:w-auto flex-1 px-6 py-4 bg-japandi-cream border border-japandi-stone/10 rounded-sm text-japandi-stone placeholder:text-japandi-stone/40 focus:outline-none focus:border-japandi-terracotta transition-colors duration-300"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            type="email"
            value={email}
          />
          <button
            className="w-full md:w-auto px-8 py-4 bg-japandi-terracotta text-japandi-cream font-medium tracking-wide rounded-sm hover:bg-japandi-timber transition-colors duration-300 flex items-center justify-center gap-2 group"
            type="submit"
          >
            <span>Begin</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </motion.form>

        <motion.p
          className="text-japandi-stone/50 text-sm mt-6"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.4, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1 }}
        >
          We respect your attention. No spam, ever.
        </motion.p>
      </div>
    </section>
  );
}
