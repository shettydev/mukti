'use client';

import { CheckCircle2, Layers, Loader2, Pencil, Sprout, TreeDeciduous } from 'lucide-react';

import type { WizardStep } from '@/lib/stores/wizard-store';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReviewStepProps {
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
  onEditStep: (step: WizardStep) => void;
  roots: string[];
  seed: string;
  soil: string[];
}

/**
 * ReviewStep component for reviewing the complete problem structure
 *
 * Features:
 * - Display complete problem structure (Seed, Soil, Roots)
 * - Edit buttons for each section to navigate back
 * - Back and Confirm buttons
 * - Loading state during submission
 *
 * @param seed - The problem statement
 * @param soil - Array of context items
 * @param roots - Array of assumptions
 * @param onConfirm - Callback to confirm and submit
 * @param onBack - Callback to go back to previous step
 * @param onEditStep - Callback to navigate to a specific step for editing
 * @param isSubmitting - Whether the form is currently submitting
 */
export function ReviewStep({
  isSubmitting,
  onBack,
  onConfirm,
  onEditStep,
  roots,
  seed,
  soil,
}: ReviewStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Review your thinking canvas</h2>
        <p className="text-muted-foreground text-sm">
          Take a moment to review your problem structure. You can edit any section before starting
          your Socratic inquiry session.
        </p>
      </div>

      {/* Seed Section */}
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sprout className="h-4 w-4 text-amber-500" />
              Seed (Problem Statement)
            </CardTitle>
            <Button
              aria-label="Edit problem statement"
              disabled={isSubmitting}
              onClick={() => onEditStep('seed')}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{seed}</p>
        </CardContent>
      </Card>

      {/* Soil Section */}
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-blue-500" />
              Soil (Context & Constraints)
            </CardTitle>
            <Button
              aria-label="Edit context and constraints"
              disabled={isSubmitting}
              onClick={() => onEditStep('soil')}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {soil.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {soil.map((item, index) => (
                <Badge key={index} variant="secondary">
                  {item}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No context items added</p>
          )}
        </CardContent>
      </Card>

      {/* Roots Section */}
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TreeDeciduous className="h-4 w-4 text-green-600" />
              Roots (Assumptions)
            </CardTitle>
            <Button
              aria-label="Edit assumptions"
              disabled={isSubmitting}
              onClick={() => onEditStep('roots')}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {roots.map((item, index) => (
              <Badge key={index} variant="secondary">
                {item}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ready message */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        <span>
          Your thinking canvas is ready. Click &quot;Start Session&quot; to begin your Socratic
          inquiry.
        </span>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button disabled={isSubmitting} onClick={onBack} type="button" variant="outline">
          Back
        </Button>
        <Button disabled={isSubmitting} onClick={onConfirm} type="button">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Creating...
            </>
          ) : (
            'Start Session'
          )}
        </Button>
      </div>
    </div>
  );
}
