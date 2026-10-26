'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { LaunchSource, LocalProvider, LocalProvidersStatus } from '@/lib/api/ai';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAiStore } from '@/lib/stores/ai-store';

/** CLIs that take long enough to prepare that the wait needs explaining. */
const SLOW_TO_PREPARE: Readonly<Record<string, string>> = {
  agy: 'Antigravity can take 10 to 15 seconds to check and prepare.',
};

interface SwitchProviderDialogProps {
  onOpenChange: (open: boolean) => void;
  /** The CLI to switch to; the dialog is open while this is set. */
  provider: LocalProvider | null;
  status: LocalProvidersStatus;
}

/**
 * Confirms a switch to another local AI CLI.
 *
 * @remarks
 * Shows what the CLI costs and, where it has one, its disclosure, in the same
 * words the launcher uses, and offers to keep it as the default for future
 * launches (on by default, as in the launcher's picker). A refused switch keeps
 * the dialog open with the API's explanation, which names the fix.
 */
export function SwitchProviderDialog({
  onOpenChange,
  provider,
  status,
}: SwitchProviderDialogProps) {
  const switchProvider = useAiStore((s) => s.switchProvider);
  const switchingTo = useAiStore((s) => s.switchingTo);

  const canSave = status.saveDefault.available;
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [error, setError] = useState<null | string>(null);

  const switching = provider !== null && switchingTo === provider.id;

  const close = (open: boolean) => {
    if (switching) {
      return; // The request is in flight; closing would hide its outcome.
    }
    if (!open) {
      setError(null);
      setSaveAsDefault(true);
    }
    onOpenChange(open);
  };

  const confirm = async () => {
    if (!provider) {
      return;
    }
    setError(null);
    try {
      const result = await switchProvider(provider.id, canSave && saveAsDefault);
      if (result.warning) {
        toast.warning(`Now using ${provider.label}`, { description: result.warning });
      } else {
        toast.success(`Now using ${provider.label}`, {
          description: result.saved ? 'Saved as your default for future launches.' : undefined,
        });
      }
      setSaveAsDefault(true);
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The switch did not go through.');
    }
  };

  return (
    <Dialog onOpenChange={close} open={provider !== null}>
      <DialogContent
        className="border-japandi-sand/80 bg-japandi-cream text-japandi-stone sm:max-w-[480px]"
        showCloseButton={!switching}
      >
        {provider && (
          <>
            <DialogHeader>
              <DialogTitle>Switch to {provider.label}?</DialogTitle>
              <DialogDescription className="text-japandi-stone/70">
                New replies will use {provider.label}, {provider.tradeOff}. Replies already being
                written finish on the current CLI.
              </DialogDescription>
            </DialogHeader>

            {provider.disclosure && (
              // The catalogue wraps disclosures for an 80-column terminal;
              // here the dialog wraps them, so the line breaks are dropped.
              <p
                className="rounded-lg border border-japandi-sand/60 bg-japandi-light-stone/40 px-4 py-3 text-xs leading-relaxed text-japandi-stone/80"
                data-testid="provider-disclosure"
              >
                {provider.disclosure.replace(/\s*\n\s*/g, ' ')}
              </p>
            )}

            <div className="space-y-2">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  checked={canSave && saveAsDefault}
                  disabled={!canSave || switching}
                  id="save-provider-default"
                  onCheckedChange={(checked) => setSaveAsDefault(checked === true)}
                />
                <Label
                  className="text-sm font-normal leading-snug text-japandi-stone/80"
                  htmlFor="save-provider-default"
                >
                  Use as default for future launches
                </Label>
              </div>
              {!status.saveDefault.available && (
                <p className="pl-6 text-xs text-japandi-stone/50">{status.saveDefault.reason}</p>
              )}
              {canSave && overridesDefault(status.launchSource) && (
                <p className="pl-6 text-xs text-japandi-stone/50" data-testid="precedence-note">
                  {precedenceNote(status.launchSource)}
                </p>
              )}
            </div>

            {switching && SLOW_TO_PREPARE[provider.id] && (
              <p className="text-xs text-japandi-stone/60">{SLOW_TO_PREPARE[provider.id]}</p>
            )}

            {error && (
              <p
                className="flex items-start gap-2 rounded-lg border border-japandi-terracotta/30 bg-japandi-terracotta/10 px-3 py-2 text-xs leading-relaxed text-japandi-terracotta"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <DialogFooter className="mt-2 gap-2 sm:gap-0">
              <Button
                className="border-japandi-sand/80 bg-japandi-cream text-japandi-stone hover:bg-japandi-light-stone/75"
                disabled={switching}
                onClick={() => close(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="bg-japandi-sage text-white shadow-none hover:bg-japandi-sage/90"
                disabled={switching}
                onClick={confirm}
              >
                {switching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking {provider.label}…
                  </>
                ) : (
                  `Switch to ${provider.label}`
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Whether this launch named its provider, which wins over a saved default. */
function overridesDefault(source: LaunchSource): boolean {
  return source === 'option' || source === 'env';
}

function precedenceNote(source: LaunchSource): string {
  const named = source === 'option' ? '--provider' : 'AI_PROVIDER';
  return `This launch named its AI CLI with ${named}, which overrides a saved default. The default applies when Mukti starts without naming one.`;
}
