'use client';

/**
 * ShareMapDialog component
 *
 * Radix Dialog for managing a public share link on a Thought Map.
 * - Shows a copy-able share URL when a link exists
 * - "Generate Link" button creates a new link (or replaces existing)
 * - "Revoke" button deactivates the link
 *
 * Japandi aesthetic: warm stone palette, minimal copy/revoke affordances.
 */

import { Check, Copy, Link2, Link2Off, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useThoughtMapActions, useThoughtMapShareLink } from '@/lib/stores/thought-map-store';

// ============================================================================
// Types
// ============================================================================

export interface ShareMapDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ShareMapDialog({ onOpenChange, open }: ShareMapDialogProps) {
  const shareLink = useThoughtMapShareLink();
  const { loadShareLink, revokeShareLink, shareMap } = useThoughtMapActions();

  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load share link when dialog opens
  useEffect(() => {
    if (!open) {
      return;
    }

    setIsLoading(true);
    loadShareLink().finally(() => setIsLoading(false));
  }, [open, loadShareLink]);

  const shareUrl = shareLink
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/map/${shareLink.token}`
    : null;

  const handleCopy = useCallback(async () => {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
    }
  }, [shareUrl]);

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    await shareMap();
    setIsLoading(false);
  }, [shareMap]);

  const handleRevoke = useCallback(async () => {
    setIsLoading(true);
    await revokeShareLink();
    setIsLoading(false);
  }, [revokeShareLink]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-stone-500" />
            Share Thought Map
          </DialogTitle>
          <DialogDescription>
            Anyone with the link can view this map — no login required.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
            </div>
          ) : shareLink && shareUrl ? (
            /* Active share link */
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 dark:border-stone-700 dark:bg-stone-800/50">
                <span className="flex-1 truncate text-sm text-stone-600 dark:text-stone-300">
                  {shareUrl}
                </span>
                <button
                  aria-label={copied ? 'Copied!' : 'Copy link'}
                  className="shrink-0 rounded p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-700 dark:hover:text-stone-200"
                  onClick={handleCopy}
                  title={copied ? 'Copied!' : 'Copy link'}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <p className="text-xs text-stone-400">
                {shareLink.viewCount > 0
                  ? `Viewed ${shareLink.viewCount} time${shareLink.viewCount === 1 ? '' : 's'}`
                  : 'Not viewed yet'}
                {shareLink.expiresAt
                  ? ` · Expires ${new Date(shareLink.expiresAt).toLocaleDateString()}`
                  : ''}
              </p>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleCopy} size="sm" variant="outline">
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  className="text-destructive hover:text-destructive"
                  onClick={handleRevoke}
                  size="sm"
                  variant="outline"
                >
                  <Link2Off className="mr-1.5 h-3.5 w-3.5" />
                  Revoke
                </Button>
              </div>
            </div>
          ) : (
            /* No active link */
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="rounded-full bg-stone-100 p-3 dark:bg-stone-800">
                <Link2 className="h-5 w-5 text-stone-400" />
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                No public link yet. Generate one to share this map.
              </p>
              <Button className="mt-1" onClick={handleGenerate} size="sm">
                <Link2 className="mr-1.5 h-3.5 w-3.5" />
                Generate Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
