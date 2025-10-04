import Link from 'next/link';

import { cn } from '@/lib/utils';

import { DotPattern } from './magicui/dot-pattern';

export function Proof() {
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-background">
      <DotPattern
        className={cn('[mask-image:radial-gradient(300px_circle_at_center,white,transparent)]')}
      />
      <div className="my-44 mx-auto max-w-2xl text-center">
        <p className="text-lg mb-4 text-foreground font-medium">
          &quot;MIT research shows AI dependency leads to cognitive debt. Mukti reverses this
          trend.&quot;
        </p>
        <Link
          className="text-sm text-primary hover:underline"
          href="https://arxiv.org/pdf/2506.08872"
          rel="noopener noreferrer"
          target="_blank"
        >
          Read the MIT Study →
        </Link>
      </div>
    </div>
  );
}
