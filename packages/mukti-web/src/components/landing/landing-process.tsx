'use client';

import { motion } from 'motion/react';

import { cn } from '@/lib/utils';

const steps = [
  {
    description:
      'You bring a problem, a doubt, or a curiosity. Not a prompt for an answer, but a seed for thought.',
    icon: (
      <svg
        className="w-6 h-6 text-japandi-sage"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
    step: '01',
    title: 'The Question',
  },
  {
    description:
      'Mukti responds not with a solution, but with a question that reframes your perspective and reveals blind spots.',
    icon: (
      <svg
        className="w-6 h-6 text-japandi-terracotta"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    step: '02',
    title: 'The Challenge',
  },
  {
    description:
      'You wrestle with the new angle. This "cognitive friction" is where the actual learning happens.',
    icon: (
      <svg
        className="w-6 h-6 text-japandi-timber"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    step: '03',
    title: 'The Struggle',
  },
  {
    description: 'The answer emerges from you. You own the knowledge because you forged it.',
    icon: (
      <svg
        className="w-6 h-6 text-japandi-indigo"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
      >
        <path d="M18 8a6 6 0 0 0-6-6 6 6 0 0 0-6 6c0 7 3 9 3 9h6s3-2 3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    step: '04',
    title: 'The Insight',
  },
];

export default function LandingProcess() {
  return (
    <section className="relative w-full px-6 py-24 md:px-12 lg:py-32 bg-japandi-cream overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="mb-24 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span className="text-japandi-sage text-japandi-label tracking-[0.2em] block mb-4">
            The Process
          </span>
          <h2 className="text-japandi-stone text-4xl md:text-5xl font-light tracking-wide mb-4">
            The Cognitive Loop
          </h2>
          <p className="text-japandi-stone/60 text-lg font-light">
            From curiosity to clarity, on your own terms
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-[27px] md:left-1/2 top-0 bottom-0 w-[1px] bg-japandi-sand/30 -translate-x-1/2" />

          <motion.div
            className="absolute left-[27px] md:left-1/2 top-0 w-[1px] bg-japandi-terracotta/50 -translate-x-1/2 origin-top"
            initial={{ height: 0 }}
            transition={{ duration: 2.5, ease: [0.25, 0.1, 0.25, 1] }}
            viewport={{ once: true }}
            whileInView={{ height: '100%' }}
          />

          <div className="space-y-16 md:space-y-24">
            {steps.map((step, index) => (
              <motion.div
                className={cn(
                  'relative flex items-center gap-8 md:gap-16',
                  index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                )}
                initial={{ opacity: 0, y: 30 }}
                key={index}
                transition={{
                  delay: index * 0.3,
                  duration: 1.2,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <div
                  className={cn('hidden md:block w-1/2 text-right', index % 2 !== 0 && 'text-left')}
                >
                  <span className="text-japandi-sage text-sm uppercase tracking-widest font-medium">
                    Step {step.step}
                  </span>
                </div>

                <div className="relative z-10 flex-shrink-0 w-14 h-14 rounded-full bg-japandi-cream border border-japandi-sand flex items-center justify-center shadow-sm">
                  {step.icon}
                </div>

                <div className="flex-1 md:w-1/2 pt-2 md:pt-0">
                  <div className="md:hidden mb-2">
                    <span className="text-japandi-sage text-xs uppercase tracking-widest font-medium">
                      Step {step.step}
                    </span>
                  </div>
                  <h3 className="text-japandi-stone text-xl font-normal mb-2">{step.title}</h3>
                  <p className="text-japandi-stone/70 text-base font-light leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
