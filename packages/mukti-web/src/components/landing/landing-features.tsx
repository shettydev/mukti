'use client';

import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

import { MCP_DOCS_URL } from './constants';

const features = [
  {
    description:
      'Mukti tracks what you understand, concept by concept, across sessions. When its questions stop helping because something foundational is missing, it notices instead of asking the same thing louder.',
    id: '01',
    title: 'Knowledge-gap detection',
  },
  {
    description:
      'Five levels of help, from pure questions to hints, examples and a brief explanation of a missing concept. Support rises when you are stuck and fades as you succeed. It never hands over the solution.',
    id: '02',
    title: 'Adaptive help, five levels',
  },
  {
    description:
      'Quality rules shape every turn: one question at a time, misconceptions noticed and steered back, a breakthrough after a struggle acknowledged. When you signal you are done, Mukti sums up what you discovered instead of asking more.',
    id: '03',
    title: 'Dialogue that stays Socratic',
  },
  {
    description:
      'Bring the same Socratic reasoning into any MCP client with the socratic_inquiry, explore_paths and explain_approach tools, plus ready-made elenchus, dialectic, maieutics and reflection prompts.',
    id: '04',
    link: { href: MCP_DOCS_URL, label: 'MCP server docs' },
    title: 'MCP server',
  },
];

export default function LandingFeatures() {
  return (
    <section className="relative w-full px-5 xs:px-6 py-20 sm:py-24 md:px-12 lg:py-32 bg-japandi-light-stone/20">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="mb-16 text-center md:text-left"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span className="text-japandi-sage text-japandi-label tracking-[0.2em] block mb-4">
            Under the Hood
          </span>
          <h2 className="text-japandi-stone text-4xl md:text-5xl font-light tracking-wide leading-tight">
            Questions are the only mode
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <motion.div
              className="flex flex-col p-6 sm:p-8 bg-japandi-cream rounded-sm border border-japandi-sand/40"
              initial={{ opacity: 0, y: 40 }}
              key={feature.id}
              transition={{ delay: (index % 2) * 0.2, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <span className="text-japandi-label text-xs tracking-[0.2em] text-japandi-terracotta mb-4 block">
                {feature.id}
              </span>
              <h3 className="text-japandi-stone text-xl font-normal mb-4">{feature.title}</h3>
              <p className="text-japandi-stone/70 text-base font-light leading-relaxed">
                {feature.description}
              </p>
              {feature.link && (
                <Link
                  className="group mt-6 inline-flex items-center gap-1.5 text-sm text-japandi-terracotta hover:text-japandi-timber transition-colors duration-300"
                  href={feature.link.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {feature.link.label}
                  <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
