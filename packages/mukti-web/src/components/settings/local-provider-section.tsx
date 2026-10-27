'use client';

import { Check, Loader2, RefreshCw, SquareTerminal } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { LocalProvider, LocalProviderReadiness } from '@/lib/api/ai';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAiStore } from '@/lib/stores/ai-store';
import { cn } from '@/lib/utils';

import { SwitchProviderDialog } from './switch-provider-dialog';

const READINESS_LABEL: Readonly<Record<LocalProviderReadiness, string>> = {
  missing: 'Not installed',
  ready: 'Ready',
  'signed-out': 'Signed out',
};

/**
 * The AI CLI section of local-mode Settings.
 *
 * @remarks
 * Lists every supported local AI CLI with whether it is installed and signed
 * in, as the launcher's own token-free checks report it, and lets the user move
 * Mukti onto another ready one without restarting. A CLI that cannot be used
 * shows how to fix that, and Re-check asks again once the user has.
 */
export function LocalProviderSection() {
  const loadProviders = useAiStore((s) => s.loadProviders);
  const providersError = useAiStore((s) => s.providersError);
  const providersLoading = useAiStore((s) => s.providersLoading);
  const status = useAiStore((s) => s.providerStatus);
  const switchingTo = useAiStore((s) => s.switchingTo);

  const [target, setTarget] = useState<LocalProvider | null>(null);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const busy = switchingTo !== null;

  return (
    <section aria-labelledby="ai-provider-heading">
      <div className="mb-4 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-japandi-indigo/15">
            <SquareTerminal className="h-4 w-4 text-japandi-indigo" />
          </div>
          <h2 className="text-japandi-label text-japandi-stone" id="ai-provider-heading">
            AI CLI
          </h2>
        </div>
        <Button
          className="h-8 gap-1.5 border-japandi-sand/60 bg-transparent px-3 text-xs text-japandi-stone/70 hover:border-japandi-sage/50 hover:bg-japandi-sage/10 hover:text-japandi-sage"
          disabled={providersLoading || busy}
          onClick={() => void loadProviders({ refresh: true })}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', providersLoading && 'animate-spin')} />
          Re-check
        </Button>
      </div>

      <div className="rounded-xl border border-japandi-sand/60 bg-japandi-cream/40 p-5 transition-colors duration-300 hover:border-japandi-sand">
        <p className="mb-4 text-japandi-body text-sm text-japandi-stone/70">
          Mukti runs on an AI CLI you have installed and signed in to. Switch to another one here;
          new replies use it straight away, without restarting Mukti.
        </p>

        {providersError && !status && (
          <p className="text-sm text-japandi-terracotta" role="alert">
            Could not check your AI CLIs: {providersError}
          </p>
        )}

        {!status && !providersError && (
          <div aria-label="Checking your AI CLIs" className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {status && (
          <>
            <ul className="space-y-2">
              {status.providers.map((provider) => (
                <ProviderRow
                  busy={busy}
                  isDefault={
                    status.saveDefault.available && status.saveDefault.savedId === provider.id
                  }
                  key={provider.id}
                  onSelect={() => setTarget(provider)}
                  provider={provider}
                  switching={switchingTo === provider.id}
                />
              ))}
            </ul>
            <p className="mt-3 text-xs text-japandi-stone/40">
              Checked {formatChecked(status.checkedAt)}
              {providersError ? ` (re-check failed: ${providersError})` : ''}
            </p>
            <SwitchProviderDialog
              onOpenChange={(open) => {
                if (!open) {
                  setTarget(null);
                }
              }}
              provider={target}
              status={status}
            />
          </>
        )}
      </div>
    </section>
  );
}

function formatChecked(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) {
    return 'just now';
  }
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  return `${Math.round(seconds / 60)} min ago`;
}

function ProviderRow({
  busy,
  isDefault,
  onSelect,
  provider,
  switching,
}: {
  busy: boolean;
  isDefault: boolean;
  onSelect: () => void;
  provider: LocalProvider;
  switching: boolean;
}) {
  const ready = provider.readiness === 'ready';
  const selectable = ready && !provider.active && !busy;
  const remediation =
    provider.readiness === 'missing'
      ? provider.installRemediation
      : provider.readiness === 'signed-out'
        ? provider.signInRemediation
        : null;

  return (
    <li
      aria-current={provider.active ? 'true' : undefined}
      className={cn(
        'flex flex-col gap-3 rounded-lg border px-4 py-3 transition-colors duration-200 sm:flex-row sm:items-center',
        provider.active
          ? 'border-japandi-sage bg-japandi-sage/10'
          : 'border-japandi-sand/40 bg-transparent',
        !ready && 'opacity-80'
      )}
      data-testid={`provider-row-${provider.id}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {/* Radio-style selection mark, matching the technique selector:
            filled sage with a check for the CLI in use, an empty ring otherwise. */}
        <span
          aria-hidden
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
            provider.active
              ? 'border-japandi-sage bg-japandi-sage text-white dark:text-japandi-cream'
              : 'border-japandi-sand'
          )}
        >
          {provider.active && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cn(
                'text-sm text-japandi-stone',
                provider.active ? 'font-semibold' : 'font-medium'
              )}
            >
              {provider.label}
            </span>
            {provider.active && (
              <span className="rounded-full border border-japandi-sage/40 bg-japandi-sage/15 px-2 py-0.5 text-[11px] font-medium text-japandi-sage">
                Active
              </span>
            )}
            {isDefault && (
              <span className="rounded-full border border-japandi-indigo/30 bg-japandi-indigo/10 px-2 py-0.5 text-[11px] font-medium text-japandi-indigo">
                Default
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs text-japandi-stone/50">
              <span
                aria-hidden
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  ready ? 'bg-japandi-sage' : 'bg-japandi-terracotta/70'
                )}
              />
              <span>
                {READINESS_LABEL[provider.readiness]}
                {provider.version ? ` · ${provider.version}` : ''}
              </span>
            </span>
          </div>
          <p className="mt-0.5 text-xs text-japandi-stone/50">{provider.tradeOff}</p>
          {remediation && <p className="mt-1 text-xs text-japandi-terracotta/80">{remediation}</p>}
        </div>
      </div>

      {!provider.active && (
        <Button
          aria-label={`Switch to ${provider.label}`}
          className="h-8 shrink-0 self-start border-japandi-sand/60 bg-transparent px-3 text-xs text-japandi-stone/80 hover:border-japandi-sage/50 hover:bg-japandi-sage/10 hover:text-japandi-sage sm:self-center"
          disabled={!selectable}
          onClick={onSelect}
          size="sm"
          type="button"
          variant="outline"
        >
          {switching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Use'}
        </Button>
      )}
    </li>
  );
}
