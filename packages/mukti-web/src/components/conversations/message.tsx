/**
 * Message component for displaying user and assistant messages
 * with smooth arrival animations and markdown rendering
 */

'use client';

import type { Message as MessageType } from '@/types/conversation.types';

import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full gap-3 py-4 md:py-5',
        isUser ? 'justify-end' : 'justify-start',
        'animate-fade-in-up motion-reduce:animate-none'
      )}
    >
      <div
        className={cn(
          'max-w-[min(90%,48rem)] rounded-2xl px-5 py-3.5 transition-colors duration-200 md:px-6 md:py-4',
          isUser
            ? 'border border-japandi-sand/75 bg-japandi-light-stone/70 text-japandi-stone shadow-sm'
            : 'border-l-2 border-japandi-sage/60 bg-japandi-cream/45 text-japandi-stone/95'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'sr-only',
            isUser ? 'bg-white/10 text-foreground' : 'bg-transparent text-foreground'
          )}
        />
        <div className="flex items-start gap-2">
          <div className="flex-1 space-y-2">
            {isUser ? (
              <p className="whitespace-pre-wrap break-words text-base leading-relaxed">
                {message.content}
              </p>
            ) : (
              <Markdown className="text-base leading-relaxed prose-p:leading-relaxed prose-pre:border prose-pre:border-japandi-sand/70 prose-pre:bg-japandi-light-stone/40 prose-code:text-japandi-indigo">
                {message.content}
              </Markdown>
            )}

            <div
              className={cn(
                'mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-japandi-stone/50',
                isUser ? 'justify-end' : 'justify-start'
              )}
            >
              <time dateTime={message.timestamp}>
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
              {message.tokens && <span>• {message.tokens} tokens</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
