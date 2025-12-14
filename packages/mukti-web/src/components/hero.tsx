'use client';
import { motion } from 'motion/react';
import Link from 'next/link';

import { Button } from './ui/button';
import { LampContainer } from './ui/lamp';
import { Spotlight } from './ui/spotlight-new';

export function Hero() {
  return (
    <div className="min-h-screen w-full bg-[#020617] relative overflow-hidden flex flex-col items-center justify-center antialiased">
      <Spotlight
        gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(0, 0%, 100%, .08) 0, hsla(0, 0%, 100%, .02) 50%, hsla(0, 0%, 100%, 0) 80%)"
        gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(0, 0%, 100%, .06) 0, hsla(0, 0%, 100%, .02) 80%, transparent 100%)"
        gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(0, 0%, 100%, .04) 0, hsla(0, 0%, 100%, .02) 80%, transparent 100%)"
      />

      <LampContainer>
        <motion.h1
          className="mt-8 bg-gradient-to-br from-slate-300 to-slate-500 py-4 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl"
          initial={{ opacity: 0.5, y: 100 }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: 'easeInOut',
          }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          Take Back the Wheel
        </motion.h1>

        <motion.p
          className="mt-6 text-center text-slate-400 max-w-2xl mx-auto text-base sm:text-lg md:text-xl px-4"
          initial={{ opacity: 0, y: 20 }}
          transition={{
            delay: 0.8,
            duration: 0.8,
            ease: 'easeInOut',
          }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          AI should be your navigator, not your driver. <br />
          Mukti forces you to think, question, and arrive at your own insights - manual mode for
          your mind.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 10 }}
          transition={{
            delay: 1,
            duration: 0.8,
            ease: 'easeInOut',
          }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <Button className="rounded-full px-8 py-6 text-base font-medium bg-white text-black hover:bg-slate-200 transition-colors">
            <Link href="/dashboard">Try Now</Link>
          </Button>
          <Button
            className="rounded-full px-8 py-6 text-base font-medium border-slate-700 text-white hover:bg-slate-800 hover:text-white transition-colors bg-transparent backdrop-blur-sm"
            variant="outline"
          >
            <Link href="#features">Learn More</Link>
          </Button>
        </motion.div>

        <motion.div
          className="mt-14 w-full max-w-5xl mx-auto"
          initial={{ opacity: 0, width: '0rem' }}
          transition={{
            delay: 1.2,
            duration: 1,
            ease: 'easeInOut',
          }}
          whileInView={{ opacity: 1, width: '100%' }}
        >
          <div className="w-full aspect-[16/9] rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-800/20 to-transparent" />
            <div className="z-10 text-slate-600 font-medium">Dashboard Preview Placeholder</div>

            {/* Optional: Add some inner UI shell details to look like a browser window */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-slate-900/80 border-b border-slate-800 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-700" />
              <div className="w-3 h-3 rounded-full bg-slate-700" />
              <div className="w-3 h-3 rounded-full bg-slate-700" />
            </div>
          </div>
        </motion.div>
      </LampContainer>
    </div>
  );
}
