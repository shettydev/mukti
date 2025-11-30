'use client';

import { X } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { isValidTag } from '@/lib/validation/conversation-schemas';

interface TagInputProps {
  className?: string;
  disabled?: boolean;
  maxTags?: number;
  onChange: (tags: string[]) => void;
  placeholder?: string;
  value: string[];
}

/**
 * Tag input component for managing conversation tags
 *
 * Features:
 * - Add tags by pressing Enter or comma
 * - Remove tags by clicking X or pressing Backspace
 * - Validates tags before adding
 * - Prevents duplicate tags
 * - Limits maximum number of tags
 *
 * @param value - Current array of tags
 * @param onChange - Callback when tags change
 * @param placeholder - Input placeholder text
 * @param maxTags - Maximum number of tags allowed (default: 10)
 * @param disabled - Whether the input is disabled
 * @param className - Optional additional CSS classes
 */
export function TagInput({
  className,
  disabled = false,
  maxTags = 10,
  onChange,
  placeholder = 'Add tags...',
  value,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();

    // Validate tag
    if (!isValidTag(trimmedTag)) {
      return;
    }

    // Check for duplicates
    if (value.includes(trimmedTag)) {
      return;
    }

    // Check max tags
    if (value.length >= maxTags) {
      return;
    }

    onChange([...value, trimmedTag]);
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(value[value.length - 1]);
    }
  };

  const handleBlur = () => {
    // Add tag on blur if there's input
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        'flex flex-wrap gap-2 rounded-md border border-input bg-transparent p-2 min-h-[42px]',
        'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      onClick={handleContainerClick}
    >
      {value.map((tag) => (
        <Badge className="gap-1 pr-1" key={tag} variant="secondary">
          {tag}
          {!disabled && (
            <button
              aria-label={`Remove ${tag} tag`}
              className="ml-1 rounded-full hover:bg-secondary-foreground/20 p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      {value.length < maxTags && (
        <Input
          aria-label="Add tag"
          className="flex-1 min-w-[120px] border-0 p-0 h-6 shadow-none focus-visible:ring-0"
          disabled={disabled}
          onBlur={handleBlur}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          ref={inputRef}
          type="text"
          value={inputValue}
        />
      )}
    </div>
  );
}
