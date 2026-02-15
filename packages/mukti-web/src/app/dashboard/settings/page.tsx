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
    activeProvider,
    deleteGeminiKey,
    deleteOpenRouterKey,
    geminiKeyLast4,
    hasGeminiKey,
    hasOpenRouterKey,
    hydrate,
    isHydrated,
    mode,
    models,
    openRouterKeyLast4,
    refreshModels,
    setActiveModel,
    setGeminiKey,
    setOpenRouterKey,
  } = useAiStore();

  const [apiKey, setApiKey] = useState('');
  const [geminiKey, setGeminiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [savingGeminiKey, setSavingGeminiKey] = useState(false);
  const [removingKey, setRemovingKey] = useState(false);
  const [removingGeminiKey, setRemovingGeminiKey] = useState(false);
  const [savingModel, setSavingModel] = useState(false);

  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [hydrate, isHydrated]);

  const openRouterActive = activeProvider === 'openrouter' && hasOpenRouterKey;
  const geminiActive = activeProvider === 'gemini' && hasGeminiKey;
  const selectorDescription =
    activeProvider === 'gemini'
      ? 'Choose which Gemini model to use.'
      : mode === 'openrouter'
        ? 'Choose which OpenRouter model to use.'
        : 'Choose which curated model to use.';

  return (
    <DashboardLayout title="Settings">
      <div className="mx-auto w-full max-w-3xl space-y-8 p-4 md:p-6">
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="text-lg font-semibold">AI</h2>
          <p className="text-sm text-muted-foreground">
            Exactly one provider is active at a time. Saving a provider key activates it
            immediately.
          </p>

          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
            <span className="text-sm font-medium">Active provider</span>
            <Badge className="capitalize" variant="outline">
              {activeProvider}
            </Badge>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Active model ({activeProvider === 'gemini' ? 'Gemini' : 'OpenRouter'})
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <ModelSelector
                className="flex-1 h-11"
                description={selectorDescription}
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
                title={`Select ${activeProvider === 'gemini' ? 'Gemini' : 'OpenRouter'} Model`}
                value={activeModel}
              />
              <Button
                className="h-11 px-4 shrink-0"
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
            Saving an OpenRouter key makes OpenRouter active and removes any Gemini key.
          </p>

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                aria-label="OpenRouter API key"
                className="h-11 flex-1"
                disabled={hasOpenRouterKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  hasOpenRouterKey ? 'Remove existing key to add a new one' : 'sk-or-v1-…'
                }
                type="password"
                value={apiKey}
              />
              <Button
                className="h-11 px-4 shrink-0"
                disabled={savingKey || apiKey.trim().length === 0 || hasOpenRouterKey}
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

            <div className="flex items-center justify-between gap-3 min-h-[44px]">
              <div>
                {openRouterActive ? (
                  <Badge
                    className="gap-1.5 border-green-500/50 bg-green-500/10 py-1.5 px-3 text-sm text-green-500 h-9"
                    variant="outline"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Active (…{openRouterKeyLast4 ?? '????'})
                  </Badge>
                ) : hasOpenRouterKey ? (
                  <Badge className="gap-1.5 py-1.5 px-3 text-sm h-9" variant="secondary">
                    <AlertCircle className="h-4 w-4" />
                    Stored (inactive)
                  </Badge>
                ) : (
                  <Badge
                    className="gap-1.5 py-1.5 px-3 text-sm text-muted-foreground h-9"
                    variant="secondary"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Not connected
                  </Badge>
                )}
              </div>
              {hasOpenRouterKey && (
                <Button
                  className="h-9 px-4 hover:bg-red-900/20 hover:text-red-400"
                  disabled={removingKey}
                  onClick={async () => {
                    setRemovingKey(true);
                    try {
                      await deleteOpenRouterKey();
                    } finally {
                      setRemovingKey(false);
                    }
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <span className="text-red-400">Remove key</span>
                </Button>
              )}
            </div>

            {savingKey && <p className="text-xs text-muted-foreground">Saving key…</p>}
          </div>
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <h3 className="text-lg font-semibold">Gemini API key</h3>
          <p className="text-sm text-muted-foreground">
            Saving a Gemini key makes Gemini active and removes any OpenRouter key.
          </p>

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                aria-label="Gemini API key"
                className="h-11 flex-1"
                disabled={hasGeminiKey}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder={hasGeminiKey ? 'Remove existing key to add a new one' : 'AIzaSy…'}
                type="password"
                value={geminiKey}
              />
              <Button
                className="h-11 px-4 shrink-0"
                disabled={savingGeminiKey || geminiKey.trim().length === 0 || hasGeminiKey}
                onClick={async () => {
                  setSavingGeminiKey(true);
                  try {
                    await setGeminiKey(geminiKey);
                    setGeminiKeyInput('');
                  } finally {
                    setSavingGeminiKey(false);
                  }
                }}
                type="button"
              >
                Save key
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3 min-h-[44px]">
              <div>
                {geminiActive ? (
                  <Badge
                    className="gap-1.5 border-green-500/50 bg-green-500/10 py-1.5 px-3 text-sm text-green-500 h-9"
                    variant="outline"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Active (…{geminiKeyLast4 ?? '????'})
                  </Badge>
                ) : hasGeminiKey ? (
                  <Badge className="gap-1.5 py-1.5 px-3 text-sm h-9" variant="secondary">
                    <AlertCircle className="h-4 w-4" />
                    Stored (inactive)
                  </Badge>
                ) : (
                  <Badge
                    className="gap-1.5 py-1.5 px-3 text-sm text-muted-foreground h-9"
                    variant="secondary"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Not connected
                  </Badge>
                )}
              </div>
              {hasGeminiKey && (
                <Button
                  className="h-9 px-4 hover:bg-red-900/20 hover:text-red-400"
                  disabled={removingGeminiKey}
                  onClick={async () => {
                    setRemovingGeminiKey(true);
                    try {
                      await deleteGeminiKey();
                    } finally {
                      setRemovingGeminiKey(false);
                    }
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <span className="text-red-400">Remove key</span>
                </Button>
              )}
            </div>

            {savingGeminiKey && <p className="text-xs text-muted-foreground">Saving key…</p>}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
