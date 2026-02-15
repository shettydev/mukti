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
        'flex w-full gap-3 py-6', // increased py for better spacing
        isUser ? 'justify-end' : 'justify-start',
        // Smooth slide-up animation on mount
        'animate-fade-in-up'
      )}
    >
      <div
        className={cn(
          'w-full max-w-[85%] rounded-2xl px-6 py-4 transition-all duration-300',
          isUser
            ? 'bg-white/10 text-foreground backdrop-blur-sm'
            : 'bg-transparent px-0 pl-2 text-[var(--assistant-text)]'
        )}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 space-y-2">
            {isUser ? (
              <p className="whitespace-pre-wrap break-words text-base leading-relaxed">
                {message.content}
              </p>
            ) : (
              <Markdown className="text-[0.99rem] leading-7 md:max-w-[76ch]">
                {message.content}
              </Markdown>
            )}

            {/* Minimal timestamp - only show on hover or for active messages if desired, 
                but keeping it visible and subtle for now */}
            <div
              className={cn(
                'flex items-center gap-2 text-[10px] opacity-40 uppercase tracking-widest mt-2',
                isUser ? 'justify-end' : 'justify-start text-[var(--assistant-muted)]'
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
