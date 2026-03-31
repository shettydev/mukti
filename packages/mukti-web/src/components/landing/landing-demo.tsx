'use client';

import { Play } from 'lucide-react';
import { motion } from 'motion/react';

import VideoJsPlayer from './video-js-player';

const demos = [
  {
    description:
      'Choose from six classical Socratic techniques — each a different lens for examining your ideas. The AI never answers, only asks.',
    id: 'chat',
    label: 'Socratic Dialogue',
    placeholder: '/demos/socratic-chat.mp4',
    title: 'Six methods, one purpose: deeper thinking',
    video: '/demo/demo-01.mp4',
  },
  {
    description:
      'Place your problem at the center. Add constraints as Soil, surface hidden Assumptions as Roots, and let Insights emerge naturally. Each node opens its own Socratic dialogue.',
    id: 'canvas',
    label: 'Thinking Canvas',
    placeholder: '/demos/thinking-canvas.mp4',
    title: 'Map the problem before you solve it',
    video: '/demo/demo-02.mp4',
  },
  {
    description:
      "Start with a question and let your thinking unfold. Branch into possibilities, surface questions you hadn't thought to ask, and track which paths you've truly explored.",
    id: 'map',
    label: 'Thinking Map',
    placeholder: '/demos/thinking-map.mp4',
    title: 'Let your reasoning branch freely',
  },
];

export default function LandingDemo() {
  return (
    <section
      className="relative w-full px-5 xs:px-6 py-20 sm:py-24 md:px-12 lg:py-32 bg-japandi-light-stone/20"
      id="demo"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span className="text-japandi-label block mb-4 tracking-[0.2em] text-japandi-sage">
            See It In Action
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-wide leading-tight text-japandi-stone">
            How Mukti works
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-12 lg:gap-16">
          {demos.map((demo, index) => (
            <motion.div
              className={
                demo.video
                  ? 'flex flex-col gap-6'
                  : 'grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center'
              }
              initial={{ opacity: 0, y: 30 }}
              key={demo.id}
              transition={{
                delay: index * 0.15,
                duration: 1.2,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              {/* Alternate layout: even rows swap text/video */}
              <div className={!demo.video && index % 2 === 1 ? 'md:order-2' : ''}>
                <div
                  className={`relative w-full overflow-hidden rounded-sm border border-japandi-sand/40 bg-japandi-cream ${demo.video ? '' : 'aspect-[16/10]'}`}
                >
                  {demo.video ? (
                    <VideoJsPlayer src={demo.video} />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-japandi-light-stone/30">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-japandi-stone/15 bg-japandi-cream/80">
                        <Play className="ml-0.5 h-5 w-5 text-japandi-terracotta" />
                      </div>
                      <div className="text-center">
                        <p className="text-japandi-label text-xs tracking-[0.2em] text-japandi-sage">
                          {demo.label}
                        </p>
                        <p className="mt-1 text-xs text-japandi-stone/40">
                          Video placeholder — record with Screen Studio
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="bg-grain pointer-events-none absolute inset-0 opacity-30" />
                </div>
              </div>

              <div className={!demo.video && index % 2 === 1 ? 'md:order-1' : ''}>
                <span className="text-japandi-label block mb-3 text-xs tracking-[0.2em] text-japandi-terracotta">
                  Pillar {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mb-4 text-2xl md:text-3xl font-light tracking-wide text-japandi-stone leading-tight">
                  {demo.title}
                </h3>
                <p className="text-base md:text-lg font-light leading-relaxed text-japandi-stone/70">
                  {demo.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
