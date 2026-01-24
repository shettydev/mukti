'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ModelSelector } from '@/components/ai/model-selector';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAiStore } from '@/lib/stores/ai-store';

export default function SettingsPage() {
  const {
    activeModel,
    deleteOpenRouterKey,
    hasOpenRouterKey,
    hydrate,
    isHydrated,
    models,
    openRouterKeyLast4,
    refreshModels,
    setActiveModel,
    setOpenRouterKey,
  } = useAiStore();

  const [apiKey, setApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [removingKey, setRemovingKey] = useState(false);
  const [savingModel, setSavingModel] = useState(false);

  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [hydrate, isHydrated]);

  return (
    <DashboardLayout title="Settings">
      <div className="mx-auto w-full max-w-3xl space-y-8 p-4 md:p-6">
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="text-lg font-semibold">AI</h2>
          <p className="text-sm text-muted-foreground">
            Pick your active model and optionally connect your own OpenRouter key.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">Active model</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <ModelSelector
                className="flex-1"
                models={models}
                onChange={async (modelId) => {
                  setSavingModel(true);
                  try {
                    await setActiveModel(modelId);
                    await refreshModels();
                  } finally {
                    setSavingModel(false);
                  }
                }}
                value={activeModel}
              />
              <Button
                className="min-h-[44px] shrink-0"
                onClick={() => refreshModels()}
                type="button"
                variant="outline"
              >
                Refresh models
              </Button>
            </div>
            {savingModel && <p className="text-xs text-muted-foreground">Saving model…</p>}
          </div>
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <h3 className="text-lg font-semibold">OpenRouter API key</h3>
          <p className="text-sm text-muted-foreground">
            If you add a key, Mukti will use it for all AI calls.
          </p>

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                aria-label="OpenRouter API key"
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-…"
                type="password"
                value={apiKey}
              />
              <Button
                className="min-h-[44px]"
                disabled={savingKey || apiKey.trim().length === 0}
                onClick={async () => {
                  setSavingKey(true);
                  try {
                    await setOpenRouterKey(apiKey);
                    setApiKey('');
                  } finally {
                    setSavingKey(false);
                  }
                }}
                type="button"
              >
                Save key
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                {hasOpenRouterKey ? (
                  <Badge
                    variant="outline"
                    className="gap-1.5 border-green-500/50 bg-green-500/10 py-1.5 text-green-500"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected (…{openRouterKeyLast4 ?? '????'})
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1.5 py-1.5 text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Not connected
                  </Badge>
                )}
              </div>
              {hasOpenRouterKey && (
                <Button
                  className="min-h-[44px]"
                  disabled={removingKey}
                  onClick={async () => {
                    setRemovingKey(true);
                    try {
                      await deleteOpenRouterKey();
                    } finally {
                      setRemovingKey(false);
                    }
                  }}
                  type="button"
                  variant="destructive"
                >
                  Remove
                </Button>
              )}
            </div>

            {savingKey && <p className="text-xs text-muted-foreground">Saving key…</p>}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
