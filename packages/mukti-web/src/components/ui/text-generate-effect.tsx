'use client';
import { motion, stagger, useAnimate } from 'motion/react';
import { useEffect } from 'react';

import { cn } from '@/lib/utils';

export const TextGenerateEffect = ({
  className,
  duration = 0.5,
  filter = true,
  words,
}: {
  className?: string;
  duration?: number;
  filter?: boolean;
  words: string;
}) => {
  const [scope, animate] = useAnimate();
  const wordsArray = words.split(' ');
  useEffect(() => {
    animate(
      'span',
      {
        filter: filter ? 'blur(0px)' : 'none',
        opacity: 1,
      },
      {
        delay: stagger(0.2),
        duration: duration ? duration : 1,
      }
    );
  }, [scope.current]);

  const renderWords = () => {
    return (
      <motion.div ref={scope}>
        {wordsArray.map((word, idx) => {
          return (
            <motion.span
              className="dark:text-white text-black opacity-0"
              key={word + idx}
              style={{
                filter: filter ? 'blur(10px)' : 'none',
              }}
            >
              {word}{' '}
            </motion.span>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div className={cn('font-medium', className)}>
      <div className="mt-4">
        <div className=" dark:text-white text-black leading-snug tracking-wide">
          {renderWords()}
        </div>
      </div>
    </div>
  );
};
