'use client';

import { motion } from 'motion/react';

const testimonials = [
  {
    author: 'Linnea K.',
    location: 'Stockholm',
    quote:
      "Komorebi didn't make me more productive. It made me more present. The work followed naturally.",
    role: 'Architect',
  },
  {
    author: 'Yuki T.',
    location: 'Kyoto',
    quote:
      'I used to measure my days in tasks completed. Now I measure them in moments of genuine focus.',
    role: 'Writer',
  },
  {
    author: 'Maren H.',
    location: 'Copenhagen',
    quote:
      'The silence between sessions taught me more about my creative process than any productivity system ever did.',
    role: 'Designer',
  },
];

export default function JapandiVoices() {
  return (
    <section className="relative w-full px-6 py-24 md:px-12 lg:py-32 bg-japandi-cream">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span className="text-japandi-sage text-japandi-label tracking-[0.2em]">Voices</span>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {testimonials.map((testimonial, index) => (
            <motion.div
              className="flex flex-col items-center text-center p-6"
              initial={{ opacity: 0, y: 30 }}
              key={index}
              transition={{
                delay: index * 0.2,
                duration: 1.2,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <span className="text-japandi-terracotta text-6xl font-serif leading-none mb-6 opacity-80">
                &ldquo;
              </span>

              <p className="text-japandi-stone text-lg md:text-xl font-light italic leading-relaxed mb-8">
                {testimonial.quote}
              </p>

              <div className="mt-auto">
                <p className="text-japandi-stone font-medium tracking-wide">{testimonial.author}</p>
                <p className="text-japandi-stone/60 text-sm mt-1">
                  {testimonial.role}, {testimonial.location}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
