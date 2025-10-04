'use client';

import { motion, type MotionStyle, type Transition } from 'motion/react';

import { cn } from '@/lib/utils';

interface BorderBeamProps {
  /**
   * The border width of the beam.
   */
  borderWidth?: number;
  /**
   * The class name of the border beam.
   */
  className?: string;
  /**
   * The color of the border beam from.
   */
  colorFrom?: string;
  /**
   * The color of the border beam to.
   */
  colorTo?: string;
  /**
   * The delay of the border beam.
   */
  delay?: number;
  /**
   * The duration of the border beam.
   */
  duration?: number;
  /**
   * The initial offset position (0-100).
   */
  initialOffset?: number;
  /**
   * Whether to reverse the animation direction.
   */
  reverse?: boolean;
  /**
   * The size of the border beam.
   */
  size?: number;
  /**
   * The style of the border beam.
   */
  style?: React.CSSProperties;
  /**
   * The motion transition of the border beam.
   */
  transition?: Transition;
}

export const BorderBeam = ({
  borderWidth = 1,
  className,
  colorFrom = '#ffaa40',
  colorTo = '#9c40ff',
  delay = 0,
  duration = 6,
  initialOffset = 0,
  reverse = false,
  size = 50,
  style,
  transition,
}: BorderBeamProps) => {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)] border-(length:--border-beam-width)"
      style={
        {
          '--border-beam-width': `${borderWidth}px`,
        } as React.CSSProperties
      }
    >
      <motion.div
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }}
        className={cn(
          'absolute aspect-square',
          'bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent',
          className
        )}
        initial={{ offsetDistance: `${initialOffset}%` }}
        style={
          {
            '--color-from': colorFrom,
            '--color-to': colorTo,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            width: size,
            ...style,
          } as MotionStyle
        }
        transition={{
          delay: -delay,
          duration,
          ease: 'linear',
          repeat: Infinity,
          ...transition,
        }}
      />
    </div>
  );
};
