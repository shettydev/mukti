'use client';

import type { TurnKind } from '@muktiai/contracts';

import { Lightbulb, Sunrise } from 'lucide-react';

import { replyTagFor } from '@/lib/help-controls';
import { cn } from '@/lib/utils';

/**
 * Tags an explanation or a wrap-up summary in the message list, so a learner
 * scrolling back can tell it from a Socratic question (dialogue-help-controls).
 * Renders nothing for question-shaped replies.
 */
export function ReplyKindTag({
  className,
  turnKind,
}: {
  className?: string;
  turnKind?: null | TurnKind;
}) {
  const tag = replyTagFor(turnKind);
  if (!tag) {
    return null;
  }
  const Icon = tag === 'Explanation' ? Lightbulb : Sunrise;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground',
        className
      )}
      data-turn-kind={turnKind}
    >
      <Icon aria-hidden="true" className="h-3 w-3" />
      {tag}
    </span>
  );
}
