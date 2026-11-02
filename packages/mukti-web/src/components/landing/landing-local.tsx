'use client';

import { ArrowRight, Github } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

import { GITHUB_URL } from './constants';
import InstallCommand from './install-command';

const steps = [
  {
    description: (
      <>
        Mukti runs on an AI CLI you already use and pay for:{' '}
        <code className="font-mono text-sm">claude</code>,{' '}
        <code className="font-mono text-sm">codex</code> or{' '}
        <code className="font-mono text-sm">agy</code>. Install one and sign in. OpenCode, Pi, Grok
        and more are coming.
      </>
    ),
    id: '01',
    title: 'Sign in to Claude Code, Codex or Antigravity',
  },
  {
    description: (
      <>
        One command, Node 20.11 or newer. The first run downloads an embedded database once, so it
        takes a little longer. With more than one CLI ready, Mukti asks which to use; run{' '}
        <code className="font-mono text-sm">npx muktiai --choose</code> to pick again.
      </>
    ),
    id: '02',
    title: 'Run npx muktiai',
  },
  {
    description: (
      <>
        Mukti opens at <code className="font-mono text-sm">localhost:3001</code>. Your
        conversations, canvases and maps are stored in{' '}
        <code className="font-mono text-sm">~/.mukti</code> on your machine. Replies come from the
        CLI you chose, under that provider&apos;s terms.
      </>
    ),
    id: '03',
    title: 'Start thinking',
  },
];

const facts = ['No signup', 'No API keys', 'No Docker', 'MIT licensed'];

export default function LandingLocal() {
  return (
    <section
      className="relative w-full px-5 xs:px-6 py-20 sm:py-24 md:px-12 lg:py-32 bg-japandi-cream"
      id="run-locally"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span className="text-japandi-sage text-japandi-label tracking-[0.2em] block mb-4">
            Open Source · Local First
          </span>
          <h2 className="text-japandi-stone text-4xl md:text-5xl lg:text-6xl font-light tracking-wide leading-tight mb-6">
            Runs on the AI you already have
          </h2>
          <p className="text-japandi-stone/70 text-lg font-light max-w-2xl mx-auto leading-relaxed">
            No new account and no new bill. Mukti borrows your existing Claude Code, Codex or
            Antigravity subscription and keeps your thinking on your own machine.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <motion.div
              className="flex flex-col p-6 sm:p-8 bg-japandi-light-stone/40 rounded-sm"
              initial={{ opacity: 0, y: 40 }}
              key={step.id}
              transition={{ delay: index * 0.2, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <span className="text-japandi-sand text-5xl font-thin mb-6 block opacity-40">
                {step.id}
              </span>
              <h3 className="text-japandi-stone text-xl font-normal mb-4">{step.title}</h3>
              <p className="text-japandi-stone/70 text-base font-light leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-14 flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.4, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col xs:flex-row items-center gap-4">
            <InstallCommand />
            <Link
              className="flex items-center gap-2 px-6 py-3 border border-japandi-stone/20 text-japandi-stone text-sm font-medium tracking-widest rounded-sm hover:border-japandi-terracotta hover:text-japandi-terracotta transition-colors duration-300"
              href={GITHUB_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Github className="w-4 h-4" />
              <span>Source on GitHub</span>
            </Link>
          </div>

          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-japandi-stone/60 text-xs tracking-widest uppercase">
            {facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>

          <p className="text-japandi-stone/60 text-sm font-light text-center max-w-xl">
            Prefer the browser?{' '}
            <Link
              className="group inline-flex items-center gap-1 text-japandi-terracotta hover:text-japandi-timber transition-colors duration-300"
              href="/auth"
            >
              Use the hosted version
              <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>{' '}
            with 10 free AI messages a day, or add your own OpenRouter key for unlimited use.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
