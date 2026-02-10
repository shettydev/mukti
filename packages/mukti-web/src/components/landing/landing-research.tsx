'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export default function LandingResearch() {
  return (
    <section className="relative w-full px-6 py-24 md:px-12 lg:py-32 bg-japandi-light-stone/20">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span className="text-japandi-sage text-japandi-label tracking-[0.2em] block mb-4">
            The Evidence
          </span>
          <h2 className="text-japandi-stone text-4xl md:text-5xl lg:text-6xl font-light tracking-wide leading-tight">
            Cognitive Debt is Real
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <motion.div
            className="flex flex-col p-8 bg-japandi-cream rounded-sm border border-japandi-sand/30 hover:border-japandi-terracotta/30 transition-colors duration-500"
            initial={{ opacity: 0, y: 30 }}
            transition={{ delay: 0.2, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <div className="mb-6">
              <span className="text-xs font-medium uppercase tracking-widest text-japandi-terracotta mb-2 block">
                MIT Media Lab (2025)
              </span>
              <h3 className="text-japandi-stone text-xl font-normal leading-tight">
                Your Brain on ChatGPT: Accumulation of Cognitive Debt
              </h3>
            </div>
            <p className="text-japandi-stone/70 text-base leading-relaxed mb-8 flex-grow">
              Researchers found that excessive reliance on AI assistants leads to "cognitive debt" —
              a reduction in critical thinking capabilities, memory retention, and sense of
              ownership over one's work.
            </p>
            <Link
              href="https://arxiv.org/pdf/2506.08872"
              target="_blank"
              className="inline-flex items-center text-sm text-japandi-stone/60 hover:text-japandi-terracotta transition-colors group"
            >
              <span className="border-b border-transparent group-hover:border-japandi-terracotta transition-colors">
                Read the study
              </span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </Link>
          </motion.div>

          <motion.div
            className="flex flex-col p-8 bg-japandi-cream rounded-sm border border-japandi-sand/30 hover:border-japandi-terracotta/30 transition-colors duration-500"
            initial={{ opacity: 0, y: 30 }}
            transition={{ delay: 0.4, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <div className="mb-6">
              <span className="text-xs font-medium uppercase tracking-widest text-japandi-terracotta mb-2 block">
                Cassidy Williams (2026)
              </span>
              <h3 className="text-japandi-stone text-xl font-normal leading-tight">
                "Do not give up your brain"
              </h3>
            </div>
            <p className="text-japandi-stone/70 text-base leading-relaxed mb-8 flex-grow">
              "I think it’s very important to not default to laziness and just asking for the answer
              to something, especially when thinking a liiiiittle bit can get you there."
            </p>
            <Link
              href="https://cassidoo.co/post/good-brain/"
              target="_blank"
              className="inline-flex items-center text-sm text-japandi-stone/60 hover:text-japandi-terracotta transition-colors group"
            >
              <span className="border-b border-transparent group-hover:border-japandi-terracotta transition-colors">
                Read full post
              </span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </Link>
          </motion.div>

          <motion.div
            className="flex flex-col p-8 bg-japandi-cream rounded-sm border border-japandi-sand/30 hover:border-japandi-terracotta/30 transition-colors duration-500"
            initial={{ opacity: 0, y: 30 }}
            transition={{ delay: 0.6, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <div className="mb-6">
              <span className="text-xs font-medium uppercase tracking-widest text-japandi-terracotta mb-2 block">
                Sam Altman (OpenAI)
              </span>
              <h3 className="text-japandi-stone text-xl font-normal leading-tight">
                Warning on "Emotional Over-reliance"
              </h3>
            </div>
            <p className="text-japandi-stone/70 text-base leading-relaxed mb-8 flex-grow">
              Even the creators of these tools are concerned. Altman has warned that relying on AI
              for basic decision-making is "bad and dangerous" and can lead to a loss of autonomy.
            </p>
            <div className="text-sm text-japandi-stone/40 italic">via Business Insider (2025)</div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
