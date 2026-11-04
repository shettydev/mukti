'use client';

import { Hourglass } from 'lucide-react';
import { type FormEvent, useEffect, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TURN_BUDGET_MAX, TURN_BUDGET_MIN } from '@/lib/help-controls';
import { useAiStore } from '@/lib/stores/ai-store';

/**
 * Settings: the turn budget each new dialogue starts with
 * (dialogue-help-controls, "default budget from Settings"). Shown in hosted
 * and local mode. Off by default; existing dialogues keep their own budget.
 */
export function DefaultTurnBudgetSection() {
  const defaultTurnBudget = useAiStore((s) => s.defaultTurnBudget);
  const isHydrated = useAiStore((s) => s.isHydrated);
  const setDefaultTurnBudget = useAiStore((s) => s.setDefaultTurnBudget);

  const inputId = useId();
  const messageId = useId();
  const [value, setValue] = useState('');
  const [error, setError] = useState<null | string>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Show the stored default once settings load, and after each save
  useEffect(() => {
    setValue(defaultTurnBudget === null ? '' : String(defaultTurnBudget));
  }, [defaultTurnBudget]);

  const save = async (turnBudget: null | number) => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await setDefaultTurnBudget(turnBudget);
      setSaved(true);
    } catch {
      setError('Could not save the default turn limit. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim() === '') {
      void save(null);
      return;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < TURN_BUDGET_MIN || parsed > TURN_BUDGET_MAX) {
      setError(
        `Enter a whole number from ${TURN_BUDGET_MIN} to ${TURN_BUDGET_MAX}, or leave it empty.`
      );
      setSaved(false);
      return;
    }
    void save(parsed);
  };

  return (
    <section>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-japandi-indigo/10">
          <Hourglass className="h-4 w-4 text-japandi-indigo" />
        </div>
        <div>
          <h2 className="text-japandi-label text-japandi-stone">Default turn limit</h2>
        </div>
      </div>

      <div className="rounded-xl border border-japandi-sand/60 bg-japandi-cream/40 p-5 transition-colors duration-300 hover:border-japandi-sand">
        <p className="mb-4 text-japandi-body text-sm text-japandi-stone/70">
          Cap each new conversation and node dialogue at a number of exchanges. The message that
          reaches the limit gets a wrap-up summary of what is settled, what is open and your next
          step; you can keep going after it. Leave it empty for no limit. You can change the limit
          of any dialogue from its help controls.
        </p>

        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-start"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="flex-1">
            <label className="sr-only" htmlFor={inputId}>
              Default turn limit (exchanges)
            </label>
            <Input
              aria-describedby={messageId}
              aria-invalid={!!error}
              className="h-11 border-japandi-sand/60 bg-transparent"
              disabled={!isHydrated || saving}
              id={inputId}
              inputMode="numeric"
              max={TURN_BUDGET_MAX}
              min={TURN_BUDGET_MIN}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
                setSaved(false);
              }}
              placeholder={`No limit (${TURN_BUDGET_MIN}-${TURN_BUDGET_MAX})`}
              type="number"
              value={value}
            />
          </div>
          <div className="flex gap-2">
            <Button className="h-11 shrink-0 px-5" disabled={!isHydrated || saving} type="submit">
              {saving ? 'Saving…' : 'Save'}
            </Button>
            {defaultTurnBudget !== null && (
              <Button
                className="h-11 shrink-0 border-japandi-sand/60 bg-transparent px-4 text-japandi-stone/80"
                disabled={saving}
                onClick={() => void save(null)}
                type="button"
                variant="outline"
              >
                No limit
              </Button>
            )}
          </div>
        </form>

        <p
          className={error ? 'mt-3 text-xs text-destructive' : 'mt-3 text-xs text-japandi-stone/50'}
          id={messageId}
          role={error ? 'alert' : 'status'}
        >
          {error ??
            (saved
              ? defaultTurnBudget === null
                ? 'Saved. New dialogues have no turn limit.'
                : `Saved. New dialogues start with a limit of ${defaultTurnBudget} turns.`
              : defaultTurnBudget === null
                ? 'New dialogues have no turn limit.'
                : `New dialogues start with a limit of ${defaultTurnBudget} turns.`)}
        </p>
      </div>
    </section>
  );
}
