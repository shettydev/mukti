'use client';

/**
 * HelpControls: let the learner see and steer the Socratic help in a dialogue
 * (dialogue-help-controls). Shared by chat, canvas node dialogue and
 * thought-map node dialogue.
 *
 * - The help-level indicator: 0 "Questions only" to 4 "Brief explanations".
 * - More help and Explain attach to the learner's next message, because both
 *   need something from the learner to act on. Choosing one replaces the
 *   other: a message carries at most one control.
 * - Wrap up sends straight away, once the dialogue has an assistant reply.
 * - The turn budget chip shows what is left, and sets or clears the budget.
 */

import { Hourglass, Lightbulb, Sunrise, TrendingUp } from 'lucide-react';
import { type FormEvent, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  HELP_LEVELS,
  type HelpLevel,
  MAX_HELP_LEVEL,
  type PendingHelpControl,
  TURN_BUDGET_MAX,
  TURN_BUDGET_MIN,
  type TurnBudgetView,
} from '@/lib/help-controls';
import { cn } from '@/lib/utils';

export interface HelpControlsProps {
  /** The dialogue's turn budget and exchanges so far, or null for none. */
  budget: null | TurnBudgetView;
  /** True once the dialogue has an assistant reply; Wrap up needs one. */
  canWrapUp: boolean;
  className?: string;
  /** True while a message is being sent or answered. */
  disabled?: boolean;
  /** The dialogue's current help level. */
  level: HelpLevel;
  /**
   * Sets (1-50) or clears (null) the budget. Without it the budget chip is
   * read-only and hidden when there is no budget.
   */
  onBudgetChange?: (turnBudget: null | number) => Promise<unknown> | void;
  /** Called with the control to attach to the next message, or null. */
  onPendingControlChange: (control: null | PendingHelpControl) => void;
  /** Sends the wrap-up request. */
  onWrapUp: () => void;
  /** The control that will go with the learner's next message. */
  pendingControl: null | PendingHelpControl;
}

const PENDING_HINTS: Record<PendingHelpControl, string> = {
  explain:
    "Explain is on for your next message: Mukti explains the one piece you're missing, then goes back to questions. It won't write the solution for you.",
  more_help: 'More help is on for your next message: the reply comes one help level higher.',
};

const chipClass =
  'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50';

const idleChipClass =
  'border-border/70 bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground';

const pressedChipClass = 'border-primary/50 bg-primary/10 text-foreground';

export function HelpControls({
  budget,
  canWrapUp,
  className,
  disabled = false,
  level,
  onBudgetChange,
  onPendingControlChange,
  onWrapUp,
  pendingControl,
}: HelpControlsProps) {
  const maxLevelHintId = useId();
  const atMaxLevel = level >= MAX_HELP_LEVEL;

  const toggle = (control: PendingHelpControl) => {
    onPendingControlChange(pendingControl === control ? null : control);
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        aria-label="Help controls"
        className="flex flex-wrap items-center gap-1.5"
        role="toolbar"
      >
        <HelpLevelPill level={level} />

        <button
          aria-describedby={atMaxLevel ? maxLevelHintId : undefined}
          aria-pressed={pendingControl === 'more_help'}
          className={cn(
            chipClass,
            pendingControl === 'more_help' ? pressedChipClass : idleChipClass
          )}
          disabled={disabled || atMaxLevel}
          onClick={() => toggle('more_help')}
          title={
            atMaxLevel
              ? 'Maximum help level already active'
              : 'Raise the help level for your next message'
          }
          type="button"
        >
          <TrendingUp aria-hidden="true" className="h-3.5 w-3.5" />
          {atMaxLevel ? 'Max help' : 'More help'}
        </button>
        {atMaxLevel && (
          <span className="sr-only" id={maxLevelHintId}>
            Maximum help level already active
          </span>
        )}

        <button
          aria-pressed={pendingControl === 'explain'}
          className={cn(chipClass, pendingControl === 'explain' ? pressedChipClass : idleChipClass)}
          disabled={disabled}
          onClick={() => toggle('explain')}
          title="Explain the one piece you're missing, for your next message only"
          type="button"
        >
          <Lightbulb aria-hidden="true" className="h-3.5 w-3.5" />
          Explain
        </button>

        {canWrapUp && (
          <button
            className={cn(chipClass, idleChipClass)}
            disabled={disabled}
            onClick={onWrapUp}
            title="Get a closing summary: what is settled, what is open, and your next step"
            type="button"
          >
            <Sunrise aria-hidden="true" className="h-3.5 w-3.5" />
            Wrap up
          </button>
        )}

        <TurnBudgetChip budget={budget} className="ml-auto" onBudgetChange={onBudgetChange} />
      </div>

      {pendingControl && (
        <p className="text-[11px] leading-snug text-muted-foreground" role="status">
          {PENDING_HINTS[pendingControl]}
        </p>
      )}
    </div>
  );
}

/**
 * The current help level as a pill, with the level's description in a
 * tooltip and for screen readers. Announces changes politely.
 */
export function HelpLevelPill({ level }: { level: HelpLevel }) {
  const { description, name } = HELP_LEVELS[level];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-live="polite"
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 text-xs text-foreground"
          data-level={level}
          data-testid="help-level"
          tabIndex={0}
        >
          <LevelDots level={level} />
          <span className="font-medium">Help {level}</span>
          <span className="text-muted-foreground">· {name}</span>
          <span className="sr-only">. {description}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64" side="top">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}

function budgetLabel(budget: TurnBudgetView): string {
  const count = `${budget.used}/${budget.limit} turns`;
  switch (budget.state) {
    case 'exceeded':
      return `${count} · exceeded`;
    case 'used':
      return `${count} · used`;
    default:
      return budget.remaining === 1
        ? `${count} · next wraps up`
        : `${count} · ${budget.remaining} left`;
  }
}

function LevelDots({ level }: { level: HelpLevel }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-0.5">
      {Array.from({ length: MAX_HELP_LEVEL + 1 }, (_, index) => (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            index <= level ? 'bg-primary/70' : 'bg-muted-foreground/25'
          )}
          key={index}
        />
      ))}
    </span>
  );
}

/**
 * The turn budget: what is left, used or exceeded. Opens a small form to set
 * or clear it when `onBudgetChange` is given.
 */
function TurnBudgetChip({
  budget,
  className,
  onBudgetChange,
}: {
  budget: null | TurnBudgetView;
  className?: string;
  onBudgetChange?: (turnBudget: null | number) => Promise<unknown> | void;
}) {
  const inputId = useId();
  const errorId = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<null | string>(null);
  const [saving, setSaving] = useState(false);

  // Seed the field when the form opens, not on every render: the budget view
  // is rebuilt each render and would wipe what the learner is typing.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setValue(budget ? String(budget.limit) : '');
      setError(null);
    }
    setOpen(next);
  };

  const label = budget ? budgetLabel(budget) : 'Set turn limit';
  const chip = (
    <span className="inline-flex items-center gap-1.5">
      <Hourglass aria-hidden="true" className="h-3.5 w-3.5" />
      {label}
    </span>
  );
  const stateClass =
    budget?.state === 'exceeded'
      ? 'border-amber-500/40 text-amber-700 dark:text-amber-300'
      : budget?.state === 'used'
        ? 'border-primary/40 text-foreground'
        : idleChipClass;

  if (!onBudgetChange) {
    return budget ? (
      <span
        className={cn(chipClass, stateClass, className)}
        data-budget-state={budget.state}
        data-testid="turn-budget"
      >
        {chip}
      </span>
    ) : null;
  }

  const save = async (turnBudget: null | number) => {
    setSaving(true);
    try {
      await onBudgetChange(turnBudget);
      setOpen(false);
    } catch {
      setError('Could not save the turn limit. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < TURN_BUDGET_MIN || parsed > TURN_BUDGET_MAX) {
      setError(`Enter a whole number from ${TURN_BUDGET_MIN} to ${TURN_BUDGET_MAX}.`);
      return;
    }
    void save(parsed);
  };

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-label={budget ? `Turn limit: ${label}` : 'Set a turn limit'}
          className={cn(chipClass, stateClass, className)}
          data-budget-state={budget?.state ?? 'none'}
          data-testid="turn-budget"
          type="button"
        >
          {chip}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 text-sm">
        <form className="space-y-3" noValidate onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor={inputId}>
              Turn limit (exchanges)
            </label>
            <Input
              aria-describedby={error ? errorId : undefined}
              aria-invalid={!!error}
              className="h-9"
              id={inputId}
              inputMode="numeric"
              max={TURN_BUDGET_MAX}
              min={TURN_BUDGET_MIN}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
              placeholder={`${TURN_BUDGET_MIN}-${TURN_BUDGET_MAX}`}
              type="number"
              value={value}
            />
            {error ? (
              <p className="text-xs text-destructive" id={errorId} role="alert">
                {error}
              </p>
            ) : (
              <p className="text-xs leading-snug text-muted-foreground">
                The message that reaches the limit gets a wrap-up summary. You can keep going after
                it.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            {budget && (
              <Button
                disabled={saving}
                onClick={() => void save(null)}
                size="sm"
                type="button"
                variant="ghost"
              >
                Clear limit
              </Button>
            )}
            <Button disabled={saving} size="sm" type="submit">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
