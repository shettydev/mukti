'use client';

import { useEffect, useState } from 'react';

import { ModelSelector } from '@/components/ai/model-selector';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { useAiStore } from '@/lib/stores/ai-store';

export default function SettingsPage() {
  const { activeModel, aiConfigured, hydrate, isHydrated, models, refreshModels, setActiveModel } =
    useAiStore();

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
            AI providers and API keys are configured on the server by your workspace admin.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">Active model</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <ModelSelector
                className="h-11 flex-1"
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
                className="h-11 shrink-0 px-4"
                onClick={() => refreshModels()}
                type="button"
                variant="outline"
              >
                Refresh models
              </Button>
            </div>
            {!aiConfigured && (
              <p className="text-xs text-muted-foreground">
                AI is currently unavailable. Ask your admin to configure an active provider and
                model.
              </p>
            )}
            {savingModel && <p className="text-xs text-muted-foreground">Saving model…</p>}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
