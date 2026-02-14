'use client';

import { motion } from 'motion/react';

const pillars = [
  {
    decoration: (
      <svg
        className="w-12 h-12 text-japandi-sage/30"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        viewBox="0 0 100 100"
      >
        <circle cx="50" cy="50" r="40" />
        <circle cx="50" cy="50" r="20" />
      </svg>
    ),
    description:
      'Probing questions that challenge your assumptions rather than providing easy answers. Deep questioning over quick solutions.',
    english: 'Inquiry',
    id: '01',
    japanese: 'जिज्ञासा',
    romanized: 'Jigyasa',
  },
  {
    decoration: (
      <svg
        className="w-12 h-12 text-japandi-terracotta/30"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        viewBox="0 0 100 100"
      >
        <rect height="60" width="60" x="20" y="20" />
        <line x1="20" x2="80" y1="50" y2="50" />
      </svg>
    ),
    description:
      'Building mental muscle through active problem solving. Structured struggle that leads to genuine understanding.',
    english: 'Resilience',
    id: '02',
    japanese: 'तपस',
    romanized: 'Tapas',
  },
  {
    decoration: (
      <svg
        className="w-12 h-12 text-japandi-indigo/30"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        viewBox="0 0 100 100"
      >
        <path d="M20 80 C 20 20, 80 20, 80 80" />
        <path d="M35 80 C 35 40, 65 40, 65 80" />
      </svg>
    ),
    description:
      'Thinking without the training wheels. Using AI as a sparring partner to sharpen your own intellect.',
    english: 'Autonomy',
    id: '03',
    japanese: 'स्वराज',
    romanized: 'Swaraj',
  },
];

export default function LandingPillars() {
  return (
    <section className="relative w-full px-6 py-24 md:px-12 lg:py-32 bg-japandi-cream">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="mb-16 text-center md:text-left"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span className="text-japandi-sage text-japandi-label tracking-[0.2em]">The Method</span>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {pillars.map((pillar, index) => (
            <motion.div
              className="group relative flex flex-col p-8 md:p-10 bg-japandi-light-stone/40 rounded-sm hover:bg-japandi-light-stone/60 transition-colors duration-700"
              initial={{ opacity: 0, y: 40 }}
              key={pillar.id}
              transition={{
                delay: index * 0.2,
                duration: 1.2,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <div className="absolute top-8 right-8 opacity-50 group-hover:opacity-100 transition-opacity duration-700">
                {pillar.decoration}
              </div>

              <span className="text-japandi-sand text-6xl font-thin mb-8 block opacity-40">
                {pillar.id}
              </span>

              <div className="mb-6">
                <h3 className="text-japandi-stone text-2xl font-light mb-1">{pillar.japanese}</h3>
                <span className="text-japandi-sage text-sm uppercase tracking-widest block mb-2">
                  {pillar.romanized}
                </span>
                <h4 className="text-japandi-stone text-xl font-normal">{pillar.english}</h4>
              </div>

              <p className="text-japandi-stone/80 text-base leading-relaxed font-light mt-10">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
