'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import { Button } from './ui/button';
import { LampContainer } from './ui/lamp';
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
          className="mt-14 w-full max-w-5xl mx-auto px-4"
          initial={{ opacity: 0, y: 40 }}
          transition={{
            delay: 1.2,
            duration: 1,
            ease: 'easeInOut',
          }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden">
            {/* Browser Chrome */}
            <div className="absolute top-0 left-0 right-0 h-10 bg-slate-900/95 border-b border-slate-800 flex items-center px-4 gap-2 z-20 rounded-t-xl">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-slate-800/80 rounded-md px-4 py-1 text-xs text-slate-400 flex items-center gap-2">
                  <svg
                    className="w-3 h-3"
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
                  mukti.live
                </div>
              </div>
            </div>

            {/* Screenshot Carousel */}
            <div className="relative w-full h-full pt-10">
              {screenshots.map((screenshot, index) => (
                <motion.div
                  animate={{
                    opacity: activeIndex === index ? 1 : 0,
                    scale: activeIndex === index ? 1 : 1.02,
                  }}
                  className="absolute inset-0 pt-10"
                  initial={false}
                  key={screenshot.src}
                  transition={{ duration: 0.7, ease: 'easeInOut' }}
                >
                  <Image
                    alt={screenshot.alt}
                    className="object-cover object-top rounded-b-xl"
                    fill
                    priority={index === 0}
                    sizes="(max-width: 768px) 100vw, 1024px"
                    src={screenshot.src}
                  />
                </motion.div>
              ))}

              {/* Gradient overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020617] to-transparent z-10 pointer-events-none" />
            </div>

            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-3xl -z-10 opacity-50" />
          </div>

          {/* Carousel Indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {screenshots.map((_, index) => (
              <button
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  activeIndex === index ? 'bg-white w-6' : 'bg-slate-600 hover:bg-slate-500'
                )}
                key={index}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </motion.div>
      </LampContainer>
    </div>
  );
}
