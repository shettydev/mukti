'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import { Button } from './ui/button';
import { Spotlight } from './ui/spotlight-new';

const screenshots = [
  { alt: 'Mukti Dashboard - Your thinking workspace', src: '/dashboard.png' },
  { alt: 'Mukti Canvas - Visual thinking space', src: '/canvas.png' },
];

export function Hero() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % screenshots.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#020617] relative overflow-hidden flex flex-col antialiased">
      <Spotlight
        gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(0, 0%, 100%, .08) 0, hsla(0, 0%, 100%, .02) 50%, hsla(0, 0%, 100%, 0) 80%)"
        gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(0, 0%, 100%, .06) 0, hsla(0, 0%, 100%, .02) 80%, transparent 100%)"
        gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(0, 0%, 100%, .04) 0, hsla(0, 0%, 100%, .02) 80%, transparent 100%)"
      />

      {/* Top light bar effect */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-1 bg-gradient-to-r from-transparent via-slate-400/50 to-transparent blur-sm" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

      {/* Content Section */}
      <div className="flex-1 flex flex-col items-center justify-center pt-32 md:pt-40 pb-12 px-4">
        <motion.h1
          className="bg-gradient-to-b from-white via-slate-200 to-slate-500 bg-clip-text text-center text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-medium tracking-tight text-transparent leading-tight"
          initial={{ opacity: 0, y: 30 }}
          transition={{
            delay: 0.2,
            duration: 0.8,
            ease: 'easeOut',
          }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          Take Back the Wheel
        </motion.h1>

        <motion.p
          className="mt-6 text-center text-slate-400 max-w-2xl mx-auto text-base sm:text-lg md:text-xl"
          initial={{ opacity: 0, y: 20 }}
          transition={{
            delay: 0.5,
            duration: 0.8,
            ease: 'easeOut',
          }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          AI should be your navigator, not your driver. Mukti forces you to think, question, and
          arrive at your own insights.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 10 }}
          transition={{
            delay: 0.7,
            duration: 0.8,
            ease: 'easeOut',
          }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <Button
            asChild
            className="rounded-full px-8 py-6 text-base font-medium bg-white text-black hover:bg-slate-200 transition-colors"
          >
            <Link href="/chat">Try Now</Link>
          </Button>
          <Button
            asChild
            className="rounded-full px-8 py-6 text-base font-medium border-slate-700 text-white hover:bg-slate-800 hover:text-white transition-colors bg-transparent backdrop-blur-sm"
            variant="outline"
          >
            <Link href="#features">Learn More</Link>
          </Button>
        </motion.div>
      </div>

      {/* Large Screenshot Section */}
      <motion.div
        className="relative w-full px-4 sm:px-8 md:px-12 lg:px-20 pb-0"
        initial={{ opacity: 0, y: 60 }}
        transition={{
          delay: 0.9,
          duration: 1,
          ease: 'easeOut',
        }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <div className="relative max-w-7xl mx-auto">
          {/* Browser Window Frame */}
          <div className="relative rounded-t-2xl overflow-hidden border border-slate-800/80 border-b-0 bg-slate-900/50 backdrop-blur-sm shadow-2xl shadow-black/50">
            {/* Browser Chrome */}
            <div className="h-12 bg-slate-900/95 border-b border-slate-800 flex items-center px-4 gap-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>

              {/* Navigation arrows */}
              <div className="hidden sm:flex items-center gap-2 text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M15 19l-7-7 7-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M9 5l7 7-7 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* URL Bar */}
              <div className="flex-1 flex justify-center">
                <div className="bg-slate-800/80 rounded-lg px-4 py-1.5 text-sm text-slate-400 flex items-center gap-2 min-w-[200px] sm:min-w-[300px]">
                  <svg
                    className="w-3.5 h-3.5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="hidden sm:inline">mukti.live</span>
                  <span className="sm:hidden">mukti.live</span>
                </div>
              </div>

              {/* Right side icons */}
              <div className="hidden sm:flex items-center gap-3 text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path d="M12 8v4l2 2" strokeLinecap="round" strokeWidth="2" />
                </svg>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {/* Screenshot Content */}
            <div className="relative aspect-[16/9] sm:aspect-[16/10] md:aspect-[16/9] overflow-hidden">
              {screenshots.map((screenshot, index) => (
                <motion.div
                  animate={{
                    opacity: activeIndex === index ? 1 : 0,
                    scale: activeIndex === index ? 1 : 1.02,
                  }}
                  className="absolute inset-0"
                  initial={false}
                  key={screenshot.src}
                  transition={{ duration: 0.7, ease: 'easeInOut' }}
                >
                  <Image
                    alt={screenshot.alt}
                    className="object-cover object-top"
                    fill
                    priority={index === 0}
                    quality={95}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1400px"
                    src={screenshot.src}
                  />
                </motion.div>
              ))}

              {/* Bottom fade gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Glow effects */}
          <div className="absolute -inset-x-20 -top-20 h-40 bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute -inset-x-10 top-0 bottom-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 blur-3xl pointer-events-none -z-10" />
        </div>

        {/* Carousel Indicators */}
        <div className="flex justify-center gap-2 mt-6 pb-8">
          {screenshots.map((_, index) => (
            <button
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                activeIndex === index ? 'bg-white w-8' : 'bg-slate-600 hover:bg-slate-500 w-2'
              )}
              key={index}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
