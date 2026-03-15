'use client';

import { Loader2, Network } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ThoughtMap } from '@/types/thought-map';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateThoughtMap } from '@/lib/hooks/use-thought-map';

const MAX_TITLE_LENGTH = 500;

interface CreateThoughtMapDialogProps {
  onOpenChange: (open: boolean) => void;
  onSuccess?: (map: ThoughtMap) => void;
  open: boolean;
}

export function CreateThoughtMapDialog({
  onOpenChange,
  onSuccess,
  open,
}: CreateThoughtMapDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const createMutation = useCreateThoughtMap();

  const [error, setError] = useState<null | string>(null);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setTitle('');

    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);

    return () => window.clearTimeout(timer);
  }, [open]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (createMutation.isPending) {
        return;
      }

      onOpenChange(nextOpen);
    },
    [createMutation.isPending, onOpenChange]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedTitle = title.trim();

      if (!trimmedTitle) {
        setError('Please enter a topic to start your thought map.');
        return;
      }

      setError(null);

      try {
        const map = await createMutation.mutateAsync({ title: trimmedTitle });
        onOpenChange(false);
        onSuccess?.(map);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : 'Failed to create Thought Map. Please try again.'
        );
      }
    },
    [createMutation, onOpenChange, onSuccess, title]
  );

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            New Thought Map
          </DialogTitle>
          <DialogDescription>
            What do you want to think about? Start with a single topic and grow the map from there.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="thought-map-title">
              Topic
              <span className="ml-1 text-stone-400 dark:text-stone-500">
                ({title.length}/{MAX_TITLE_LENGTH})
              </span>
            </Label>
            <Input
              autoComplete="off"
              disabled={createMutation.isPending}
              id="thought-map-title"
              maxLength={MAX_TITLE_LENGTH}
              onChange={(event) => {
                setTitle(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              placeholder="e.g. How should I design my database schema?"
              ref={inputRef}
              value={title}
            />
            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              disabled={createMutation.isPending}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={createMutation.isPending || !title.trim()} type="submit">
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Thought Map'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
