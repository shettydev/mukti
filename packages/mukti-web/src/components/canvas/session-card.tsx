'use client';

/**
 * Session Card component for Thinking Canvas
 * Displays individual canvas session information
 */

import { formatDistanceToNow } from 'date-fns';
import { Brain, GitBranch, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';

import type { CanvasSession } from '@/types/canvas.types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SessionCardProps {
  session: CanvasSession;
}

/**
 * SessionCard component
 *
 * Displays:
 * - Session seed (problem statement) as title
 * - Creation date
 * - Soil/roots count summary
 * - Click handler to navigate to canvas detail
 *
 * @param session - The canvas session to display
 */
export function SessionCard({ session }: SessionCardProps) {
  const router = useRouter();

  const handleClick = () => {
    // Navigate to canvas detail page
    router.push(`/canvas/${session.id}`);
  };

  const createdAt = formatDistanceToNow(new Date(session.createdAt), { addSuffix: true });
  const soilCount = session.problemStructure.soil.length;
  const rootsCount = session.problemStructure.roots.length;

  // Truncate seed if too long
  const truncatedSeed =
    session.problemStructure.seed.length > 100
      ? `${session.problemStructure.seed.slice(0, 100)}...`
      : session.problemStructure.seed;

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary/50 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-medium line-clamp-2">{truncatedSeed}</CardTitle>
            <CardDescription className="mt-1 text-xs">{createdAt}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5" title="Context items">
            <Layers className="w-3.5 h-3.5" />
            <span>
              {soilCount} {soilCount === 1 ? 'context' : 'contexts'}
            </span>
          </div>
          <div className="flex items-center gap-1.5" title="Assumptions">
            <GitBranch className="w-3.5 h-3.5" />
            <span>
              {rootsCount} {rootsCount === 1 ? 'assumption' : 'assumptions'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
