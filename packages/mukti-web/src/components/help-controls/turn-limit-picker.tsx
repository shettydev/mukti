'use client';

/**
 * TurnLimitPicker: choose a dialogue's turn limit without a bare number field.
 *
 * Presets cover the common cases, a stepper fine-tunes, and a track shows the
 * exchanges already used against the one that will get the wrap-up summary.
 * Shared by the help-controls popover and the Settings default.
 *
 * The draft is a string so a learner can type freely: '' means no limit, and
 * the owner validates on save.
 */

import { Minus, Plus } from 'lucide-react';
import { type KeyboardEvent, useId } from 'react';

import { TURN_BUDGET_MAX, TURN_BUDGET_MIN } from '@/lib/help-controls';
import { cn } from '@/lib/utils';

export const TURN_LIMIT_PRESETS = [5, 10, 20] as const;

/** The step a stepper starts from when no limit is set yet. */
const START_FROM = 10;

export interface TurnLimitPickerProps {
  /** Shown as the field's accessible name and the group label. */
  ariaLabel: string;
  /** Id of the hint or error that describes the field. */
  describedBy?: string;
  disabled?: boolean;
  /** '' for no limit, otherwise what the learner typed or picked. */
  draft: string;
  invalid?: boolean;
  onDraftChange: (draft: string) => void;
  /** Exchanges the dialogue has had so far; omitted where there is none (Settings). */
  used?: number;
}

/** The draft as a valid limit, or null when it is empty or out of range. */
export function parseTurnLimit(draft: string): null | number {
  if (!/^\d+$/.test(draft.trim())) {
    return null;
  }
  const value = Number(draft);
  return value >= TURN_BUDGET_MIN && value <= TURN_BUDGET_MAX ? value : null;
}

/** What a limit will do to this dialogue, in one sentence. */
export function turnLimitConsequence(limit: null | number, used = 0): string {
  if (limit === null) {
    return 'No limit. Wrap up is there whenever you want a summary.';
  }
  if (used >= limit) {
    return `You've already had ${used} ${plural(used)}, so this limit has passed and nothing wraps up automatically.`;
  }
  const left = limit - used;
  if (left === 1) {
    return 'Your next message gets the wrap-up summary. You can keep going after it.';
  }
  const prefix = used > 0 ? `${used} used so far. ` : '';
  return `${prefix}Mukti wraps up on exchange ${limit}${used > 0 ? `, ${left} from now` : ''}. You can keep going after it.`;
}

export function TurnLimitPicker({
  ariaLabel,
  describedBy,
  disabled = false,
  draft,
  invalid = false,
  onDraftChange,
  used,
}: TurnLimitPickerProps) {
  const groupName = useId();
  const off = draft.trim() === '';
  const limit = parseTurnLimit(draft);
  const current = limit ?? (off ? null : Number(draft) || null);

  const step = (delta: number) => {
    const base = current ?? START_FROM - delta;
    onDraftChange(String(clamp(base + delta)));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      step(event.key === 'ArrowUp' ? 1 : -1);
    }
  };

  return (
    <div className="space-y-3">
      <div
        aria-label={`${ariaLabel} presets`}
        className="grid grid-cols-4 gap-1 rounded-lg bg-muted/50 p-1"
        role="radiogroup"
      >
        {(['off', ...TURN_LIMIT_PRESETS] as const).map((option) => {
          const value = option === 'off' ? '' : String(option);
          const checked = option === 'off' ? off : limit === option;
          return (
            <label
              className={cn(
                'relative flex h-8 cursor-pointer items-center justify-center rounded-md text-xs font-medium tabular-nums transition-colors',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50',
                checked
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
                disabled && 'cursor-not-allowed opacity-50'
              )}
              key={option}
            >
              <input
                checked={checked}
                className="sr-only"
                disabled={disabled}
                name={groupName}
                onChange={() => onDraftChange(value)}
                type="radio"
                value={value}
              />
              {option === 'off' ? 'Off' : option}
            </label>
          );
        })}
      </div>

      <div
        className={cn(
          'flex h-10 items-center rounded-lg border bg-transparent',
          invalid ? 'border-destructive' : 'border-border/70',
          'focus-within:ring-2 focus-within:ring-ring/40'
        )}
      >
        <StepButton
          disabled={disabled || (current !== null && current <= TURN_BUDGET_MIN)}
          label="Fewer exchanges"
          onClick={() => step(-1)}
        >
          <Minus className="h-3.5 w-3.5" />
        </StepButton>
        <div className="flex flex-1 items-baseline justify-center gap-1.5">
          <input
            aria-describedby={describedBy}
            aria-invalid={invalid}
            aria-label={ariaLabel}
            autoComplete="off"
            className="bg-transparent text-center text-base font-semibold tabular-nums text-foreground outline-none"
            disabled={disabled}
            inputMode="numeric"
            maxLength={2}
            onChange={(event) => onDraftChange(event.target.value.replace(/\D/g, ''))}
            onKeyDown={handleKeyDown}
            // Sized to its digits, so the unit beside it stays centred
            style={{ width: `${Math.max(draft.length, 1) + 0.5}ch` }}
            value={draft}
          />
          <span aria-hidden="true" className="text-xs text-muted-foreground">
            {off ? 'No limit' : plural(current ?? 0)}
          </span>
        </div>
        <StepButton
          disabled={disabled || (current !== null && current >= TURN_BUDGET_MAX)}
          label="More exchanges"
          onClick={() => step(1)}
        >
          <Plus className="h-3.5 w-3.5" />
        </StepButton>
      </div>

      {limit !== null && <ExchangeTrack limit={limit} used={used} />}
    </div>
  );
}

function clamp(value: number): number {
  return Math.min(TURN_BUDGET_MAX, Math.max(TURN_BUDGET_MIN, value));
}

/**
 * One mark per exchange up to the limit: used ones filled, the last one (the
 * wrap-up) in the accent. Past the limit every mark is filled.
 */
function ExchangeTrack({ limit, used = 0 }: { limit: number; used?: number }) {
  return (
    <div
      aria-hidden="true"
      className={cn('flex h-1.5 items-stretch', limit > 20 ? 'gap-px' : 'gap-0.5')}
      data-testid="exchange-track"
    >
      {Array.from({ length: limit }, (_, index) => {
        const isWrapUp = index === limit - 1;
        const isUsed = index < used;
        return (
          <span
            className={cn(
              'flex-1 rounded-full transition-colors',
              isWrapUp
                ? isUsed
                  ? 'bg-japandi-terracotta/40'
                  : 'bg-japandi-terracotta'
                : isUsed
                  ? 'bg-muted-foreground/45'
                  : 'bg-muted-foreground/15'
            )}
            data-state={isWrapUp ? 'wrap-up' : isUsed ? 'used' : 'open'}
            key={index}
          />
        );
      })}
    </div>
  );
}

function plural(count: number): string {
  return count === 1 ? 'exchange' : 'exchanges';
}

function StepButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-full w-10 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
