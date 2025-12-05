'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { CanvasSession } from '@/types/canvas.types';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useCreateCanvasSession } from '@/lib/hooks/use-canvas';
import { useWizardStore, type WizardStep } from '@/lib/stores/wizard-store';
import { cn } from '@/lib/utils';

import { ReviewStep } from './review-step';
import { RootsStep } from './roots-step';
import { SeedStep } from './seed-step';
import { SoilStep } from './soil-step';

/**
 * Step configuration for the wizard
 */
const STEPS: { label: string; step: WizardStep }[] = [
  { label: 'Seed', step: 'seed' },
  { label: 'Soil', step: 'soil' },
  { label: 'Roots', step: 'roots' },
  { label: 'Review', step: 'review' },
];

interface SetupWizardDialogProps {
  onOpenChange: (open: boolean) => void;
  onSuccess?: (canvasSession: CanvasSession) => void;
  open: boolean;
}

/**
 * SetupWizardDialog component - Main wizard container
 *
 * Features:
 * - Dialog with semi-transparent backdrop
 * - Progress indicator showing current step (1-4)
 * - Wires up step components with wizard store
 * - Handles step navigation
 * - Submission flow with error handling
 *
 * @param open - Whether the dialog is open
 * @param onOpenChange - Callback when dialog open state changes
 * @param onSuccess - Optional callback when canvas session is created successfully
 */
export function SetupWizardDialog({ onOpenChange, onSuccess, open }: SetupWizardDialogProps) {
  const [submitError, setSubmitError] = useState<null | string>(null);

  // Wizard store state and actions
  const {
    addRootsItem,
    addSoilItem,
    currentStep,
    nextStep,
    prevStep,
    removeRootsItem,
    removeSoilItem,
    reset,
    roots,
    seed,
    setSeed,
    setStep,
    soil,
  } = useWizardStore();

  // Canvas session mutation
  const { isPending: isSubmitting, mutate: createSession } = useCreateCanvasSession();

  /**
   * Reset wizard state when dialog closes
   */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Reset wizard state when closing
        reset();
        setSubmitError(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, reset]
  );

  /**
   * Handle wizard submission
   */
  const handleConfirm = useCallback(() => {
    setSubmitError(null);

    createSession(
      { roots, seed, soil },
      {
        onError: (error) => {
          setSubmitError(error.message || 'Failed to create canvas session. Please try again.');
          toast.error('Failed to create session', {
            description: error.message,
          });
        },
        onSuccess: (session) => {
          toast.success('Thinking canvas created!', {
            description: 'Your Socratic inquiry session is ready.',
          });
          onSuccess?.(session);
          handleOpenChange(false);
        },
      }
    );
  }, [createSession, roots, seed, soil, onSuccess, handleOpenChange]);

  /**
   * Handle editing a specific step from review
   */
  const handleEditStep = useCallback(
    (step: WizardStep) => {
      setStep(step);
    },
    [setStep]
  );

  // Reset error when step changes
  useEffect(() => {
    setSubmitError(null);
  }, [currentStep]);

  /**
   * Render the current step component
   */
  const renderStep = () => {
    switch (currentStep) {
      case 'review':
        return (
          <ReviewStep
            isSubmitting={isSubmitting}
            onBack={prevStep}
            onConfirm={handleConfirm}
            onEditStep={handleEditStep}
            roots={roots}
            seed={seed}
            soil={soil}
          />
        );

      case 'roots':
        return (
          <RootsStep
            items={roots}
            onAdd={addRootsItem}
            onBack={prevStep}
            onNext={nextStep}
            onRemove={removeRootsItem}
          />
        );

      case 'seed':
        return <SeedStep onChange={setSeed} onNext={nextStep} value={seed} />;

      case 'soil':
        return (
          <SoilStep
            items={soil}
            onAdd={addSoilItem}
            onBack={prevStep}
            onNext={nextStep}
            onRemove={removeSoilItem}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        showCloseButton={!isSubmitting}
      >
        {/* Accessible title and description */}
        <DialogTitle className="sr-only">Setup Thinking Canvas</DialogTitle>
        <DialogDescription className="sr-only">
          A multi-step wizard to define your problem structure for Socratic inquiry
        </DialogDescription>

        {/* Progress indicator */}
        <ProgressIndicator currentStep={currentStep} />

        {/* Error display */}
        {submitError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 mb-4">
            <p className="text-sm text-destructive">{submitError}</p>
          </div>
        )}

        {/* Current step content */}
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Progress indicator component showing current step
 */
function ProgressIndicator({ currentStep }: { currentStep: WizardStep }) {
  const currentIndex = STEPS.findIndex((s) => s.step === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((stepConfig, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;

        return (
          <div className="flex items-center" key={stepConfig.step}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  isActive && 'bg-primary text-primary-foreground',
                  isCompleted && 'bg-primary/20 text-primary',
                  !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                )}
              >
                {index + 1}
              </div>
              <span
                className={cn(
                  'text-xs mt-1 hidden sm:block',
                  isActive && 'text-primary font-medium',
                  !isActive && 'text-muted-foreground'
                )}
              >
                {stepConfig.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn('w-8 sm:w-12 h-0.5 mx-1', isCompleted ? 'bg-primary/50' : 'bg-muted')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
