/**
 * Message component for displaying user and assistant messages
 */

'use client';

import type { Message as MessageType } from '@/types/conversation.types';

import { cn } from '@/lib/utils';

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full gap-3 py-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="whitespace-pre-wrap break-words text-sm">
              {message.content}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
              <time dateTime={message.timestamp}>
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
              {message.tokens && (
                <span>• {message.tokens} tokens</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
