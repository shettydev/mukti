'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Sunrise } from 'lucide-react';

interface WrapUpChipProps {
  disabled?: boolean;
  onWrapUp: () => void;
  visible: boolean;
}

export function WrapUpChip({ disabled, onWrapUp, visible }: WrapUpChipProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center px-4 pb-2"
          exit={{ opacity: 0, y: 8 }}
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
        >
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-4 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-100"
            disabled={disabled}
            onClick={onWrapUp}
            type="button"
          >
            <Sunrise aria-hidden="true" className="h-4 w-4" />
            Wrap up
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
