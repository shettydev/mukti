'use client';
import { motion } from 'motion/react';
import React from 'react';

type SpotlightProps = {
  duration?: number;
  gradientFirst?: string;
  gradientSecond?: string;
  gradientThird?: string;
  height?: number;
  side?: 'both' | 'left' | 'right';
  smallWidth?: number;
  translateY?: number;
  width?: number;
  xOffset?: number;
};

export const Spotlight = ({
  duration = 7,
  gradientFirst = 'radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 85%, .08) 0, hsla(210, 100%, 55%, .02) 50%, hsla(210, 100%, 45%, 0) 80%)',
  gradientSecond = 'radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .06) 0, hsla(210, 100%, 55%, .02) 80%, transparent 100%)',
  gradientThird = 'radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .04) 0, hsla(210, 100%, 45%, .02) 80%, transparent 100%)',
  height = 1380,
  side = 'both',
  smallWidth = 240,
  translateY = -350,
  width = 560,
  xOffset = 100,
}: SpotlightProps = {}) => {
  return (
    <motion.div
      animate={{
        opacity: 1,
      }}
      className="pointer-events-none absolute inset-0 h-full w-full"
      initial={{
        opacity: 0,
      }}
      transition={{
        duration: 1.5,
      }}
    >
      <motion.div
        animate={{
          x: [0, xOffset, 0],
        }}
        className="absolute top-0 left-0 w-screen h-screen z-40 pointer-events-none"
        style={{
          opacity: side === 'left' || side === 'both' ? 1 : 0,
        }}
        transition={{
          duration,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      >
        <div
          className="absolute top-0 left-0"
          style={{
            background: gradientFirst,
            height: `${height}px`,
            transform: `translateY(${translateY}px) rotate(-45deg)`,
            width: `${width}px`,
          }}
        />

        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            background: gradientSecond,
            height: `${height}px`,
            transform: 'rotate(-45deg) translate(5%, -50%)',
            width: `${smallWidth}px`,
          }}
        />

        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            background: gradientThird,
            height: `${height}px`,
            transform: 'rotate(-45deg) translate(-180%, -70%)',
            width: `${smallWidth}px`,
          }}
        />
      </motion.div>

      <motion.div
        animate={{
          x: [0, -xOffset, 0],
        }}
        className="absolute top-0 right-0 w-screen h-screen z-40 pointer-events-none"
        style={{
          opacity: side === 'right' || side === 'both' ? 1 : 0,
        }}
        transition={{
          duration,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      >
        <div
          className="absolute top-0 right-0"
          style={{
            background: gradientFirst,
            height: `${height}px`,
            transform: `translateY(${translateY}px) rotate(45deg)`,
            width: `${width}px`,
          }}
        />

        <div
          className="absolute top-0 right-0 origin-top-right"
          style={{
            background: gradientSecond,
            height: `${height}px`,
            transform: 'rotate(45deg) translate(-5%, -50%)',
            width: `${smallWidth}px`,
          }}
        />

        <div
          className="absolute top-0 right-0 origin-top-right"
          style={{
            background: gradientThird,
            height: `${height}px`,
            transform: 'rotate(45deg) translate(180%, -70%)',
            width: `${smallWidth}px`,
          }}
        />
      </motion.div>
    </motion.div>
  );
};
