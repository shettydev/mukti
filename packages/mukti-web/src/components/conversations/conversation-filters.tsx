'use client';

import { Archive, Heart, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { ConversationFilters as Filters, SocraticTechnique } from '@/types/conversation.types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Debounce delay for filter changes in milliseconds
 * Prevents excessive API calls during rapid filter changes
 */
const FILTER_DEBOUNCE_DELAY = 300;

interface ConversationFiltersProps {
  className?: string;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const TECHNIQUES: { label: string; value: SocraticTechnique }[] = [
  { label: 'Elenchus', value: 'elenchus' },
  { label: 'Dialectic', value: 'dialectic' },
  { label: 'Maieutics', value: 'maieutics' },
  { label: 'Definitional', value: 'definitional' },
  { label: 'Analogical', value: 'analogical' },
  { label: 'Counterfactual', value: 'counterfactual' },
];

const SORT_OPTIONS: { label: string; value: 'createdAt' | 'lastMessageAt' | 'updatedAt' }[] = [
  { label: 'Last Updated', value: 'updatedAt' },
  { label: 'Last Message', value: 'lastMessageAt' },
  { label: 'Created Date', value: 'createdAt' },
];

/**
 * Filter panel for conversations
 *
 * Features:
 * - Filter by technique
 * - Filter by archived/favorite status
 * - Sort by date fields
 * - Clear all filters
 * - Visual indicators for active filters
 * - Responsive layout (horizontal scroll on mobile)
 * - Touch-friendly targets (44x44px minimum)
 * - Accessible with proper ARIA labels
 *
 * Requirements: 5.3, 5.4, 14.4, 14.5, 15.2
 */
export function ConversationFilters({
  className,
  filters,
  onFiltersChange,
}: ConversationFiltersProps) {
  const [tagInput, setTagInput] = useState('');

  // Pending filters for debouncing
  const [pendingFilters, setPendingFilters] = useState<Filters | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced filter change handler
  useEffect(() => {
    if (pendingFilters === null) {
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      onFiltersChange(pendingFilters);
      setPendingFilters(null);
    }, FILTER_DEBOUNCE_DELAY);

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [pendingFilters, onFiltersChange]);

  // Helper to apply filter changes with debouncing
  const applyFilterChange = (newFilters: Filters) => {
    setPendingFilters(newFilters);
  };

  const handleTechniqueChange = (technique: SocraticTechnique) => {
    applyFilterChange({
      ...filters,
      technique: filters.technique === technique ? undefined : technique,
    });
  };

  const handleSortChange = (sort: 'createdAt' | 'lastMessageAt' | 'updatedAt') => {
    applyFilterChange({
      ...filters,
      sort: filters.sort === sort ? undefined : sort,
    });
  };

  const handleToggleFavorite = () => {
    applyFilterChange({
      ...filters,
      isFavorite: filters.isFavorite ? undefined : true,
    });
  };

  const handleToggleArchived = () => {
    applyFilterChange({
      ...filters,
      isArchived: filters.isArchived ? undefined : true,
    });
  };

  const _handleAddTag = () => {
    if (tagInput.trim() && !filters.tags?.includes(tagInput.trim())) {
      applyFilterChange({
        ...filters,
        tags: [...(filters.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    applyFilterChange({
      ...filters,
      tags: filters.tags?.filter((t) => t !== tag),
    });
  };

  const handleClearFilters = () => {
    // Clear filters immediately (no debounce for clear action)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setPendingFilters(null);
    onFiltersChange({
      limit: filters.limit,
      sort: 'updatedAt',
    });
  };

  const hasActiveFilters =
    filters.technique ||
    filters.isFavorite ||
    filters.isArchived ||
    (filters.tags && filters.tags.length > 0);

  return (
    <div
      aria-label="Conversation filters"
      className={cn('flex flex-col gap-3 md:gap-4', className)}
      role="group"
    >
      {/* Scrollable filter buttons on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
        {/* Technique Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={`Filter by technique${filters.technique ? ` (${filters.technique} selected)` : ''}`}
              className="min-h-[44px] shrink-0"
              size="sm"
              variant="outline"
            >
              Technique
              {filters.technique && (
                <Badge className="ml-2" variant="secondary">
                  1
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by Technique</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {TECHNIQUES.map((technique) => (
              <DropdownMenuCheckboxItem
                checked={filters.technique === technique.value}
                className="min-h-[44px]"
                key={technique.value}
                onCheckedChange={() => handleTechniqueChange(technique.value)}
              >
                {technique.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={`Sort conversations${filters.sort ? ` (by ${filters.sort})` : ''}`}
              className="min-h-[44px] shrink-0"
              size="sm"
              variant="outline"
            >
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sort By</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                checked={filters.sort === option.value}
                className="min-h-[44px]"
                key={option.value}
                onCheckedChange={() => handleSortChange(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Favorite Filter */}
        <Button
          aria-label={filters.isFavorite ? 'Show all conversations' : 'Show only favorites'}
          aria-pressed={filters.isFavorite}
          className="min-h-[44px] shrink-0"
          onClick={handleToggleFavorite}
          size="sm"
          variant={filters.isFavorite ? 'default' : 'outline'}
        >
          <Heart
            aria-hidden="true"
            className={cn('h-4 w-4', filters.isFavorite && 'fill-current')}
          />
          <span className="hidden sm:inline ml-1">Favorites</span>
        </Button>

        {/* Archived Filter */}
        <Button
          aria-label={filters.isArchived ? 'Show all conversations' : 'Show only archived'}
          aria-pressed={filters.isArchived}
          className="min-h-[44px] shrink-0"
          onClick={handleToggleArchived}
          size="sm"
          variant={filters.isArchived ? 'default' : 'outline'}
        >
          <Archive aria-hidden="true" className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Archived</span>
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            aria-label="Clear all filters"
            className="min-h-[44px] shrink-0"
            onClick={handleClearFilters}
            size="sm"
            variant="ghost"
          >
            <X aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Clear</span>
          </Button>
        )}
      </div>

      {/* Active Tags */}
      {filters.tags && filters.tags.length > 0 && (
        <div
          aria-label="Active tag filters"
          className="flex flex-wrap items-center gap-2"
          role="list"
        >
          <span className="text-xs md:text-sm text-muted-foreground">Tags:</span>
          {filters.tags.map((tag) => (
            <Badge className="gap-1" key={tag} role="listitem" variant="secondary">
              {tag}
              <button
                aria-label={`Remove ${tag} filter`}
                className="ml-1 hover:text-destructive min-w-[20px] min-h-[20px] flex items-center justify-center"
                onClick={() => handleRemoveTag(tag)}
                type="button"
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
