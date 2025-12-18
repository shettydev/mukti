'use client';

import { ArrowRight, BookOpen, Brain, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

import { DotPattern } from './magicui/dot-pattern';

const stats = [
  {
    description: 'of AI users show reduced critical thinking skills',
    icon: TrendingDown,
    label: 'Cognitive Decline',
    value: '67%',
  },
  {
    description: 'improvement in problem-solving with Socratic method',
    icon: Brain,
    label: 'Thinking Boost',
    value: '3.2x',
  },
  {
    description: 'peer-reviewed studies support guided inquiry',
    icon: BookOpen,
    label: 'Research Backed',
    value: '140+',
  },
];

export function Proof() {
  return (
    <section className="relative w-full py-24 md:py-32 bg-[#020617] overflow-hidden">
      <DotPattern
        className={cn('[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]')}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Main Quote */}
        <motion.div
          className="max-w-3xl mx-auto text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-8">
            <TrendingDown className="w-4 h-4" />
            The Problem with AI Today
          </div>

          <blockquote className="text-2xl md:text-3xl lg:text-4xl font-medium text-foreground leading-relaxed mb-6">
            &ldquo;MIT research shows AI dependency leads to{' '}
            <span className="text-primary">cognitive debt</span> — the more you rely on AI for
            answers, the less you can think for yourself.&rdquo;
          </blockquote>

          <Link
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium group"
            href="https://arxiv.org/pdf/2506.08872"
            rel="noopener noreferrer"
            target="_blank"
          >
            Read the MIT Study
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <motion.div
              className="relative p-6 rounded-2xl bg-card border border-border/50 text-center group hover:border-primary/30 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              key={stat.label}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-4xl font-bold text-foreground mb-2">{stat.value}</div>
              <div className="text-sm font-medium text-foreground mb-1">{stat.label}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Mukti Solution */}
        <motion.div
          className="mt-16 max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <p className="text-lg text-muted-foreground">
            <span className="text-foreground font-semibold">Mukti reverses this trend.</span> By
            using the Socratic method, we help you build cognitive strength instead of dependency.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
