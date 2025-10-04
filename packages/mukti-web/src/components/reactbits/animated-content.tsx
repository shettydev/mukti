import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import React, { type ReactNode, useEffect, useRef } from 'react';

gsap.registerPlugin(ScrollTrigger);

interface AnimatedContentProps {
  animateOpacity?: boolean;
  children: ReactNode;
  delay?: number;
  direction?: 'horizontal' | 'vertical';
  distance?: number;
  duration?: number;
  ease?: ((progress: number) => number) | string;
  initialOpacity?: number;
  onComplete?: () => void;
  reverse?: boolean;
  scale?: number;
  threshold?: number;
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({
  animateOpacity = true,
  children,
  delay = 0,
  direction = 'vertical',
  distance = 100,
  duration = 0.8,
  ease = 'power3.out',
  initialOpacity = 0,
  onComplete,
  reverse = false,
  scale = 1,
  threshold = 0.1,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    const axis = direction === 'horizontal' ? 'x' : 'y';
    const offset = reverse ? -distance : distance;
    const startPct = (1 - threshold) * 100;

    gsap.set(el, {
      [axis]: offset,
      opacity: animateOpacity ? initialOpacity : 1,
      scale,
    });

    gsap.to(el, {
      [axis]: 0,
      delay,
      duration,
      ease,
      onComplete,
      opacity: 1,
      scale: 1,
      scrollTrigger: {
        once: true,
        start: `top ${startPct}%`,
        toggleActions: 'play none none none',
        trigger: el,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
      gsap.killTweensOf(el);
    };
  }, [
    distance,
    direction,
    reverse,
    duration,
    ease,
    initialOpacity,
    animateOpacity,
    scale,
    threshold,
    delay,
    onComplete,
  ]);

  return <div ref={ref}>{children}</div>;
};

export default AnimatedContent;
