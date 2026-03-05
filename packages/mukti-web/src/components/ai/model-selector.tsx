'use client';

import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';

import type { AiModelOption } from '@/lib/stores/ai-store';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  className?: string;
  disabled?: boolean;
  models: AiModelOption[];
  onChange: (modelId: string) => void;
  value?: null | string;
}

const MAX_RENDERED_MODELS = 250;

export function ModelSelector({
  className,
  disabled = false,
  models,
  onChange,
  value,
}: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const selected = value ? models.find((m) => m.id === value) : undefined;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      return models;
    }

    return models.filter((m) => {
      return m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q);
    });
  }, [models, query]);

  const visible = filtered.slice(0, MAX_RENDERED_MODELS);

  const handleSelect = (modelId: string) => {
    onChange(modelId);
    setOpen(false);
  };

  return (
    <>
      <Button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Select model"
        className={cn('justify-between font-normal', className)}
        disabled={disabled}
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.label : (value ?? 'Select a model')}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Select Model</DialogTitle>
            <DialogDescription>
              Choose which configured AI model to use for your next message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              aria-label="Search models"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or id"
              value={query}
            />

            <div className="max-h-[420px] overflow-y-auto rounded-md border">
              {visible.map((m) => {
                const isSelected = m.id === value;

                return (
                  <button
                    aria-selected={isSelected}
                    className={cn(
                      'flex w-full items-start gap-3 border-b p-3 text-left transition-colors last:border-b-0',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                      isSelected && 'bg-primary/5'
                    )}
                    key={m.id}
                    onClick={() => handleSelect(m.id)}
                    role="option"
                    type="button"
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted'
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-none">{m.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.id}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {filtered.length > MAX_RENDERED_MODELS && (
              <p className="text-xs text-muted-foreground">
                Showing first {MAX_RENDERED_MODELS} of {filtered.length} models. Refine your search.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
