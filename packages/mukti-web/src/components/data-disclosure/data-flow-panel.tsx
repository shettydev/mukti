'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { DataDisclosure } from '@/lib/api/data-disclosure';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { dataDisclosureApi } from '@/lib/api/data-disclosure';
import { useDataDisclosureStore } from '@/lib/stores/data-disclosure-store';

interface DataFlowPanelProps {
  onContinue?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  publicView?: boolean;
}

export function DataFlowLink({ publicView = false }: { publicView?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        className="h-auto p-0 text-sm underline underline-offset-4"
        onClick={() => setOpen(true)}
        type="button"
        variant="link"
      >
        Your data and costs
      </Button>
      <DataFlowPanel onOpenChange={setOpen} open={open} publicView={publicView} />
    </>
  );
}

/** A configuration-specific reading view. Refetch on every open, including provider switches. */
export function DataFlowPanel({
  onContinue,
  onOpenChange,
  open,
  publicView = false,
}: DataFlowPanelProps) {
  const [data, setData] = useState<DataDisclosure | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }
    let current = true;
    setData(null);
    setError(false);
    dataDisclosureApi.get(publicView).then(
      (response) => {
        if (current) {
          setData(response);
        }
      },
      () => {
        if (current) {
          setError(true);
        }
      }
    );
    return () => {
      current = false;
    };
  }, [attempt, open, publicView]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col border-japandi-sand/70 bg-japandi-cream text-japandi-stone">
        <DialogHeader>
          <DialogTitle className="text-japandi-heading text-xl">Your data and costs</DialogTitle>
          <DialogDescription>
            Who runs your replies, what is sent and where your work is kept.
          </DialogDescription>
        </DialogHeader>
        <div
          aria-busy={!data && !error}
          className="min-h-0 overflow-y-auto space-y-6 pr-2 text-sm leading-relaxed"
        >
          {error ? (
            <div role="alert">
              <p>Could not load your data and costs. No message has been sent.</p>
              <Button onClick={() => setAttempt((value) => value + 1)} variant="outline">
                Try again
              </Button>
            </div>
          ) : !data ? (
            <p role="status">Loading your current configuration…</p>
          ) : (
            <>
              <section className="space-y-2">
                <h3 className="font-semibold">Who runs the model and who pays</h3>
                <p>{data.model.runner}</p>
                <p>{data.model.billedTo}</p>
                <p>{data.model.planNote}</p>
                {data.model.disclosure && <p>{data.model.disclosure}</p>}
                {data.model.limits.kind === 'free-daily' && (
                  <p>
                    {data.model.limits.dailyMessages} messages per day. Resets at{' '}
                    <time dateTime={data.model.limits.resetsAt}>
                      {new Date(data.model.limits.resetsAt).toLocaleString()}
                    </time>
                    .
                  </p>
                )}
              </section>
              <section className="space-y-3 border-t border-japandi-sand pt-4">
                <h3 className="font-semibold">What is sent to the model</h3>
                {data.surfaces.map((surface) => (
                  <div key={surface.id}>
                    <h4 className="font-medium">{surface.label}</h4>
                    <p className="text-japandi-stone/75">{surface.keyNote}</p>
                    <ul className="list-disc pl-5">
                      {surface.sends.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                {data.notRun.map((surface) => (
                  <p key={surface.id}>{surface.label}: not run in this configuration.</p>
                ))}
              </section>
              <section className="space-y-2 border-t border-japandi-sand pt-4">
                <h3 className="font-semibold">What Mukti stores</h3>
                <p className="break-words">{data.storage.location}</p>
                {data.storage.settingsLocation && (
                  <p className="break-words">Settings: {data.storage.settingsLocation}</p>
                )}
                <ul className="list-disc pl-5">
                  {data.storage.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              {data.outside.length > 0 && (
                <section className="space-y-3 border-t border-japandi-sand pt-4">
                  <h3 className="font-semibold">Outside Mukti</h3>
                  {data.outside.map((item) => (
                    <div key={item.where + item.what}>
                      <p>{item.what}</p>
                      <p className="break-words">{item.where}</p>
                      <p>{item.howToRemove}</p>
                      <p>Mukti does not delete this data.</p>
                    </div>
                  ))}
                </section>
              )}
              <section className="border-t border-japandi-sand pt-4">
                <h3 className="font-semibold">Delete your Mukti data</h3>
                <p>
                  Remove your conversations, canvases, maps and learner data from the Settings
                  danger zone.
                </p>
                {!publicView && (
                  <Link
                    className="underline underline-offset-4"
                    href="/settings#delete-data"
                    onClick={() => onOpenChange(false)}
                  >
                    {data.deletion.label}
                  </Link>
                )}
              </section>
            </>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            {onContinue ? 'Not now' : 'Close'}
          </Button>
          {onContinue && (
            <Button disabled={!data} onClick={onContinue}>
              Continue and send
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LocalDataFlowGate() {
  const { close, continue: continueSend, isOpen } = useDataDisclosureStore();
  useEffect(() => () => close(), [close]);
  return (
    <DataFlowPanel
      onContinue={continueSend}
      onOpenChange={(next) => {
        if (!next) {
          close();
        }
      }}
      open={isOpen}
    />
  );
}
