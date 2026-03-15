'use client';

import { Loader2, Network } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { useThoughtMaps } from '@/lib/hooks/use-thought-map';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/time-formatting';

interface ThoughtMapListProps {
  onThoughtMapClick?: (id: string) => void;
}

export function ThoughtMapList({ onThoughtMapClick }: ThoughtMapListProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: maps, error, isLoading } = useThoughtMaps();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-japandi-stone/55" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-xs text-red-600 dark:text-red-300">Failed to load thought maps</p>
      </div>
    );
  }

  if (!maps || maps.length === 0) {
    return (
      <div className="px-3 py-2">
        <p className="text-xs text-japandi-stone/55">No thought maps yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {maps.map((map) => {
        const isActive = pathname === `/maps/${map.id}`;

        return (
          <button
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
              isActive
                ? 'bg-japandi-sage/20 text-japandi-stone'
                : 'text-japandi-stone/75 hover:bg-japandi-cream/70 hover:text-japandi-stone'
            )}
            key={map.id}
            onClick={() => {
              router.push(`/maps/${map.id}`);
              onThoughtMapClick?.(map.id);
            }}
            type="button"
          >
            <div className="rounded-md bg-primary/10 p-1.5">
              <Network className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{map.title}</p>
              <p className="text-xs text-japandi-stone/55">
                {map.nodeCount} node{map.nodeCount === 1 ? '' : 's'} ·{' '}
                {formatRelativeTime(map.updatedAt)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
