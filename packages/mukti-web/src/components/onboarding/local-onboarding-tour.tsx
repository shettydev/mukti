'use client';

import { Brain, MessageCircleQuestion, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isLocalMode } from '@/lib/config';
import { hasSeenOnboarding, useOnboardingStore } from '@/lib/stores/onboarding-store';

/**
 * First-run welcome tour for local mode.
 *
 * @remarks
 * Introduces Mukti's Socratic philosophy and the main surfaces. Auto-opens once
 * (first run, tracked in `localStorage`); re-openable from the sidebar. Renders
 * nothing outside local mode. Mounted inside the dashboard layout.
 */
export function LocalOnboardingTour() {
  const isOpen = useOnboardingStore((s) => s.isOpen);
  const open = useOnboardingStore((s) => s.open);
  const close = useOnboardingStore((s) => s.close);
  const autoOpened = useRef(false);

  useEffect(() => {
    if (!isLocalMode() || autoOpened.current) {
      return;
    }
    autoOpened.current = true;
    if (!hasSeenOnboarding()) {
      open();
    }
  }, [open]);

  if (!isLocalMode()) {
    return null;
  }

  return (
    <Dialog onOpenChange={(next) => !next && close()} open={isOpen}>
      <DialogContent className="max-w-lg border-japandi-sand/70 bg-japandi-cream text-japandi-stone">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-japandi-sage/15">
              <Sparkles className="h-4.5 w-4.5 text-japandi-sage" />
            </div>
            <DialogTitle className="text-japandi-heading text-xl tracking-wide">
              Welcome to Mukti
            </DialogTitle>
          </div>
          <DialogDescription className="text-japandi-body text-sm leading-relaxed text-japandi-stone/70">
            Mukti is a thinking workspace, not an answer machine. It runs on your own Claude Code —
            and instead of handing you solutions, it asks the questions that help you reach them
            yourself. More questions than answers, by design.
          </DialogDescription>
        </DialogHeader>

        <ul className="my-2 space-y-4">
          <TourItem
            body="Chat through a problem. Mukti replies with probing questions — elenchus, dialectic, maieutics — rather than direct answers."
            icon={<MessageCircleQuestion className="h-4 w-4 text-japandi-sage" />}
            title="Socratic conversations"
          />
          <TourItem
            body="Map a problem visually with Seed, Soil, and Root nodes, and open a focused Socratic dialogue on any node."
            icon={<Brain className="h-4 w-4 text-japandi-terracotta" />}
            title="Thinking Canvas"
          />
          <TourItem
            body="Each surface auto-selects a questioning technique suited to what you're working through — no configuration needed."
            icon={<Sparkles className="h-4 w-4 text-japandi-sage" />}
            title="Techniques that adapt"
          />
        </ul>

        <DialogFooter>
          <Button
            className="bg-japandi-terracotta px-5 text-white hover:bg-japandi-terracotta/90"
            onClick={close}
            type="button"
          >
            Start thinking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TourItem({ body, icon, title }: { body: string; icon: React.ReactNode; title: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-japandi-sand/60 bg-japandi-light-stone/50">
        {icon}
      </div>
      <div>
        <p className="text-japandi-label text-sm text-japandi-stone">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-japandi-stone/65">{body}</p>
      </div>
    </li>
  );
}
