'use client';

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
      className="min-h-screen w-full rounded-md flex flex-col antialiased bg-[#020617] items-center justify-center relative overflow-hidden"
      id="testimonials"
    >
      <div className="container mx-auto px-4 relative z-10 flex flex-col items-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-center text-white">
          What Totally Real Users Are Saying
        </h2>
        <p className="text-lg text-slate-400 italic text-center max-w-2xl italic">
          Disclaimer: These testimonials are as real as unicorns.
        </p>
      </div>

      <InfiniteMovingCards
        className="w-full max-w-full"
        direction="right"
        items={testimonials}
        speed="slow"
      />
    </section>
  );
}
