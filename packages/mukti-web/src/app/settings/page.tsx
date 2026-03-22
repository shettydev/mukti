'use client';

import { CheckCircle2, Key, RefreshCw, Sparkles, Trash2, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ModelSelector } from '@/components/ai/model-selector';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAiStore } from '@/lib/stores/ai-store';

export default function SettingsPage() {
  return (
    <ProtectedRoute redirectTo="/auth">
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
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
  const [refreshingModels, setRefreshingModels] = useState(false);

  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [hydrate, isHydrated]);

  return (
    <DashboardLayout title="Settings">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6 md:py-12">
        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-japandi-heading text-2xl tracking-wide text-japandi-stone">
            Configuration
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-japandi-stone/60">
            Manage your AI model preferences and API credentials.
          </p>
          <div className="mt-4 h-px bg-gradient-to-r from-japandi-sand via-japandi-terracotta/30 to-transparent" />
        </div>

        <div className="space-y-10">
          {/* ── Active Model ── */}
          <section>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-japandi-sage/15">
                <Sparkles className="h-4 w-4 text-japandi-sage" />
              </div>
              <div>
                <h2 className="text-japandi-label text-japandi-stone">Active Model</h2>
              </div>
            </div>

            <div className="rounded-xl border border-japandi-sand/60 bg-japandi-cream/40 p-5 transition-colors duration-300 hover:border-japandi-sand">
              <p className="mb-4 text-japandi-body text-sm text-japandi-stone/70">
                Select which model powers your Socratic sessions. Your choice applies to all new
                conversations and canvas dialogues.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <ModelSelector
                  className="h-11 flex-1 border-japandi-sand/60 bg-transparent transition-colors hover:border-japandi-terracotta/40"
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
                  className="h-11 shrink-0 gap-2 border-japandi-sand/60 bg-transparent px-4 text-japandi-stone/80 transition-all hover:border-japandi-sage/50 hover:bg-japandi-sage/10 hover:text-japandi-sage"
                  disabled={refreshingModels}
                  onClick={async () => {
                    setRefreshingModels(true);
                    try {
                      await refreshModels();
                    } finally {
                      setRefreshingModels(false);
                    }
                  }}
                  type="button"
                  variant="outline"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', refreshingModels && 'animate-spin')} />
                  Refresh
                </Button>
              </div>

              {savingModel && (
                <p className="mt-3 text-xs text-japandi-terracotta/80 animate-fade-in">
                  Updating model preference&hellip;
                </p>
              )}
            </div>
          </section>

          {/* ── OpenRouter API Key ── */}
          <section>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-japandi-terracotta/15">
                <Key className="h-4 w-4 text-japandi-terracotta" />
              </div>
              <div>
                <h2 className="text-japandi-label text-japandi-stone">OpenRouter API Key</h2>
              </div>
            </div>

            <div className="rounded-xl border border-japandi-sand/60 bg-japandi-cream/40 p-5 transition-colors duration-300 hover:border-japandi-sand">
              <p className="mb-4 text-japandi-body text-sm text-japandi-stone/70">
                Connect your own OpenRouter key to unlock the full model catalog. Mukti will route
                all AI calls through your account.
              </p>

              {/* Status indicator */}
              <div
                className={cn(
                  'mb-5 flex items-center gap-3 rounded-lg px-4 py-3 transition-colors duration-300',
                  hasOpenRouterKey
                    ? 'border border-japandi-sage/30 bg-japandi-sage/8'
                    : 'border border-japandi-sand/40 bg-japandi-light-stone/50'
                )}
              >
                {hasOpenRouterKey ? (
                  <>
                    <div className="relative flex h-2.5 w-2.5 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-japandi-sage opacity-40" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-japandi-sage" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-japandi-sage">Connected</span>
                      <span className="ml-2 font-mono text-xs text-japandi-stone/50">
                        &bull;&bull;&bull;&bull; {openRouterKeyLast4 ?? '????'}
                      </span>
                    </div>
                    <Button
                      className="h-8 gap-1.5 border-none bg-transparent px-3 text-xs text-japandi-stone/50 shadow-none transition-colors hover:bg-japandi-terracotta/10 hover:text-japandi-terracotta"
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
                      <Trash2 className="h-3.5 w-3.5" />
                      {removingKey ? 'Removing…' : 'Remove'}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 rounded-full bg-japandi-sand" />
                    <span className="text-sm text-japandi-stone/50">No key connected</span>
                  </>
                )}
              </div>

              {/* Key input */}
              {!hasOpenRouterKey && (
                <div className="animate-fade-in space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      aria-label="OpenRouter API key"
                      className="h-11 flex-1 border-japandi-sand/60 bg-transparent font-mono text-sm placeholder:font-sans placeholder:text-japandi-stone/30 focus-visible:border-japandi-terracotta/40 focus-visible:ring-japandi-terracotta/20"
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-or-v1-…"
                      type="password"
                      value={apiKey}
                    />
                    <Button
                      className="h-11 shrink-0 gap-2 bg-japandi-terracotta px-5 text-white shadow-none transition-all hover:bg-japandi-terracotta/90 disabled:bg-japandi-sand disabled:text-japandi-stone/40"
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
                      <Zap className="h-3.5 w-3.5" />
                      {savingKey ? 'Connecting…' : 'Connect'}
                    </Button>
                  </div>

                  <p className="flex items-start gap-1.5 text-xs leading-relaxed text-japandi-stone/40">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                    Your key is encrypted at rest and never logged.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
