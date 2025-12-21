/**
 * Message component for displaying user and assistant messages
 * with smooth arrival animations and markdown rendering
 */

'use client';

import { useEffect, useRef, useState } from 'react';

import type { Message as MessageType } from '@/types/conversation.types';

import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const [isNew, setIsNew] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mark message as "new" for 1 second to trigger highlight animation
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set message as new
    setIsNew(true);

    // Remove "new" status after 1 second (duration of highlight animation)
    timeoutRef.current = setTimeout(() => {
      setIsNew(false);
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message.timestamp]); // Re-run when message timestamp changes

  return (
    <div
      className={cn(
        'flex w-full gap-3 py-4',
        isUser ? 'justify-end' : 'justify-start',
        // Slide-in animation based on role
        isUser ? 'animate-slide-in-right' : 'animate-slide-in-left'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3 transition-all duration-300',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
          // Add highlight animation for new messages
          isNew && 'animate-highlight'
        )}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1">
            {isUser ? (
              <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
            ) : (
              <Markdown className="text-sm">{message.content}</Markdown>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
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
