'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

import { Button } from '../ui/button';

export function Cta() {
  return (
    <section className="relative w-full pt-32 pb-52 md:py-64 bg-[#020617] overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      {/* Animated gradient orbs */}
      <div
        className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse"
        suppressHydrationWarning
      />
      <div
        className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse"
        style={{ animationDelay: '1s' }}
        suppressHydrationWarning
      />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Start Your Journey
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
            Ready to Think for Yourself?
          </h2>

          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Start your journey toward cognitive liberation today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              className="rounded-full px-8 py-6 text-base font-medium bg-white text-black hover:bg-slate-200 transition-all hover:scale-105 group"
              size="lg"
            >
              <Link href="/dashboard">
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              asChild
              className="rounded-full px-8 py-6 text-base font-medium border-slate-700 text-white hover:bg-slate-800 transition-all"
              size="lg"
              variant="outline"
            >
              <Link href="#example">See How It Works</Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            No credit card required • Free tier available forever
          </p>
        </motion.div>
      </div>
    </section>
  );
}
