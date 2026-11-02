'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import { INSTALL_COMMAND } from './constants';

interface InstallCommandProps {
  className?: string;
}

/** The `npx muktiai` command with a copy button. */
export default function InstallCommand({ className }: InstallCommandProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
    } catch {
      // Clipboard can be unavailable (insecure context, denied permission); the
      // command stays visible and selectable, so there is nothing else to do.
    }
  };

  return (
    <button
      aria-label={copied ? 'Copied' : `Copy "${INSTALL_COMMAND}"`}
      className={cn(
        'group flex items-center gap-3 rounded-sm bg-japandi-stone px-5 py-3 font-mono text-sm text-japandi-cream transition-colors duration-300 hover:bg-japandi-timber',
        className
      )}
      onClick={handleCopy}
      type="button"
    >
      <span aria-hidden="true" className="opacity-50">
        $
      </span>
      <span className="select-all">{INSTALL_COMMAND}</span>
      {copied ? (
        <Check aria-hidden="true" className="h-4 w-4 text-japandi-sage" />
      ) : (
        <Copy
          aria-hidden="true"
          className="h-4 w-4 opacity-60 transition-opacity duration-300 group-hover:opacity-100"
        />
      )}
    </button>
  );
}
