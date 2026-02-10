'use client';

import { Quote } from 'lucide-react';
import { motion } from 'motion/react';

import { InfiniteMovingCards } from './ui/infinite-moving-cards';

const testimonials = [
  {
    name: 'Phil the Plant',
    quote:
      'After using Mukti, my plants started growing faster and my coffee tasted better. Coincidence? I think not. Seriously though, the deep thinking mode changed how I approach complex problems.',
    title: 'Aspiring Ficus',
  },
  {
    name: 'Batman',
    quote:
      "Mukti asked me more questions than the Riddler. For once, I enjoyed it. It's like having a debugger for my own thought process.",
    title: 'Vigilante by Night',
  },
  {
    name: 'Anonymous Intern',
    quote:
      "Mukti made me question everything. Including why I'm reading fake testimonials on a landing page. But the insights I get are very real.",
    title: 'Existential Overthinker',
  },
  {
    name: 'Sarah Jenkins',
    quote:
      "Finally, an AI that doesn't just hand me the answer but helps me construct it. It's like the Socratic method on steroids.",
    title: 'Research Scientist',
  },
  {
    name: 'David Chen',
    quote:
      "I used to get stuck in decision paralysis. Mukti's 'Thinking Canvas' helped me map out the pros and cons visually. Game changer.",
    title: 'Product Manager',
  },
];

export function Testimonial() {
  return (
    <section
      className="w-full py-24 md:py-32 flex flex-col antialiased bg-[#020617] items-center justify-center relative overflow-hidden"
      id="testimonials"
    >
      {/* Subtle background gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        className="container mx-auto px-4 relative z-10 flex flex-col items-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300 text-sm font-medium mb-6">
          <Quote className="w-4 h-4" />
          Testimonials
        </div>

        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-center text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
          What Totally Real Users Are Saying
        </h2>
        <p className="text-base md:text-lg text-slate-500 text-center max-w-2xl italic">
          Disclaimer: These testimonials are as real as unicorns. 🦄
        </p>
      </motion.div>

      <InfiniteMovingCards
        className="w-full max-w-full"
        direction="right"
        items={testimonials}
        speed="slow"
      />
    </section>
  );
}
