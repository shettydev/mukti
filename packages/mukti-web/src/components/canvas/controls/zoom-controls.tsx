'use client';

/**
 * ZoomControls component for Thinking Canvas
 *
 * Provides zoom in, zoom out, and fit view controls for the canvas.
 * Displays current zoom percentage.
 *
 * @requirements 4.5
 */

import { Maximize2, Minus, Plus } from 'lucide-react';

import type { ZoomControlsProps } from '@/types/canvas-visualization.types';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * ZoomControls - Canvas zoom toolbar
 *
 * Displays zoom controls with current zoom level indicator.
 * Buttons are disabled when zoom limits are reached.
 *
 * @param currentZoom - Current zoom level (0.25 to 2.0)
 * @param minZoom - Minimum zoom level (0.25)
 * @param maxZoom - Maximum zoom level (2.0)
 * @param onZoomIn - Handler for zoom in action
 * @param onZoomOut - Handler for zoom out action
 * @param onFitView - Handler for fit view action
 */
export function ZoomControls({
  currentZoom,
  maxZoom,
  minZoom,
  onFitView,
  onZoomIn,
  onZoomOut,
}: ZoomControlsProps) {
  const zoomPercentage = Math.round(currentZoom * 100);
  const isAtMinZoom = currentZoom <= minZoom;
  const isAtMaxZoom = currentZoom >= maxZoom;

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-lg border bg-background/95 p-1',
        'shadow-md backdrop-blur-sm'
      )}
    >
      {/* Zoom out button */}
      <Button
        aria-label="Zoom out"
        className="h-8 w-8"
        disabled={isAtMinZoom}
        onClick={onZoomOut}
        size="icon"
        title={`Zoom out (min ${Math.round(minZoom * 100)}%)`}
        variant="ghost"
      >
        <Minus className="h-4 w-4" />
      </Button>

      {/* Current zoom percentage */}
      <div
        className={cn(
          'min-w-[52px] px-2 py-1 text-center',
          'text-xs font-medium text-muted-foreground'
        )}
        title="Current zoom level"
      >
        {zoomPercentage}%
      </div>

      {/* Zoom in button */}
      <Button
        aria-label="Zoom in"
        className="h-8 w-8"
        disabled={isAtMaxZoom}
        onClick={onZoomIn}
        size="icon"
        title={`Zoom in (max ${Math.round(maxZoom * 100)}%)`}
        variant="ghost"
      >
        <Plus className="h-4 w-4" />
      </Button>

      {/* Divider */}
      <div className="mx-1 h-4 w-px bg-border" />

      {/* Fit view button */}
      <Button
        aria-label="Fit view"
        className="h-8 w-8"
        onClick={onFitView}
        size="icon"
        title="Fit all nodes in view"
        variant="ghost"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
