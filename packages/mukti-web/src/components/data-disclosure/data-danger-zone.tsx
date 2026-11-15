'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { DataDeletionResult } from '@/lib/api/data-disclosure';

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
import { dataDisclosureApi } from '@/lib/api/data-disclosure';
import { isLocalMode } from '@/lib/config';
import { useAuthStore } from '@/lib/stores/auth-store';

/** Explicit, retryable deletion. A partial account deletion never signs the user out. */
export function DataDangerZone() {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<'account' | 'data' | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DataDeletionResult | null>(null);
  const [error, setError] = useState(false);

  function open(next: 'account' | 'data') {
    setTarget(next);
    setConfirmation('');
    setResult(null);
    setError(false);
  }

  async function remove() {
    if (confirmation !== 'DELETE' || busy || !target) {
      return;
    }
    setBusy(true);
    setError(false);
    try {
      const response = await dataDisclosureApi.deleteData(target === 'account');
      setResult(response);
      // Independent categories may have been deleted even after a partial failure.
      await queryClient.resetQueries();
      if (response.success && target === 'account') {
        queryClient.clear();
        useAuthStore.getState().clearAuth();
        window.location.assign('/auth');
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="scroll-mt-6 space-y-4 border-t border-red-500/30 pt-6" id="delete-data">
      <h2 className="text-lg font-medium text-japandi-stone">Danger zone</h2>
      <p className="text-sm leading-relaxed text-japandi-stone/80">
        Permanently remove your work from Mukti. Deleting data keeps your account, sign-in and saved
        settings.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => open('data')} variant="destructive">
          Delete all my Mukti data
        </Button>
        {!isLocalMode() && (
          <Button onClick={() => open('account')} variant="outline">
            Delete my account
          </Button>
        )}
      </div>
      <Dialog
        onOpenChange={(next) => {
          if (!next && !busy) {
            setTarget(null);
          }
        }}
        open={target !== null}
      >
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto border-japandi-sand bg-japandi-cream text-japandi-stone"
          onEscapeKeyDown={(event) => {
            if (busy) {
              event.preventDefault();
            }
          }}
          onPointerDownOutside={(event) => {
            if (busy) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {target === 'account' ? 'Delete my account' : 'Delete all my Mukti data'}
            </DialogTitle>
            <DialogDescription>
              This cannot be undone. Conversations and archived messages, canvases, node dialogues,
              thought maps, share links, learner knowledge and usage records will be permanently
              removed. Shared links will stop working.
              {target === 'account'
                ? ' Your account, saved API keys, subscription and all sign-in sessions will also be removed.'
                : ' Your account and saved settings will be kept.'}
            </DialogDescription>
          </DialogHeader>
          {!result?.success && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="deletion-confirmation">
                Type DELETE to confirm
              </label>
              <Input
                autoComplete="off"
                disabled={busy}
                id="deletion-confirmation"
                onChange={(event) => setConfirmation(event.target.value)}
                value={confirmation}
              />
            </div>
          )}
          {error && (
            <p role="alert">
              Deletion could not be completed. Check your connection and retry. Some data may
              already have been removed.
            </p>
          )}
          {result && (
            <div className="space-y-3" role={result.success ? 'status' : 'alert'}>
              <p>
                {result.success
                  ? target === 'account'
                    ? 'Your account was deleted.'
                    : 'All your Mukti data was deleted. Your account and settings were kept.'
                  : `Some data could not be deleted: ${result.failedCategories.join(', ')}. Retry to remove what remains.${target === 'account' ? ' Your account has been kept.' : ''}`}
              </p>
              {result.outside.length > 0 && (
                <div>
                  <h3 className="font-medium">Outside Mukti, not removed</h3>
                  <ul className="list-disc space-y-2 pl-5">
                    {result.outside.map((item) => (
                      <li className="break-words" key={item}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button disabled={busy} onClick={() => setTarget(null)} variant="outline">
              {result?.success ? 'Done' : 'Cancel'}
            </Button>
            {!result?.success && (
              <Button
                disabled={busy || confirmation !== 'DELETE'}
                onClick={remove}
                variant="destructive"
              >
                {busy
                  ? 'Deleting…'
                  : result || error
                    ? 'Retry deletion'
                    : target === 'account'
                      ? 'Permanently delete account'
                      : 'Permanently delete data'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
