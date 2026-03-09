'use client';

/**
 * Dashboard Catch-all Handler
 *
 * Handles all /dashboard/* paths:
 * - /dashboard → renders the Dashboard home page directly
 * - All other /dashboard/* paths → redirect to clean URL structure
 *
 * Redirect Mapping:
 * - /dashboard/conversations → /chat
 * - /dashboard/conversations/:id → /chat/:id
 * - /dashboard/canvas → /canvas
 * - /dashboard/canvas/:id → /canvas/:id
 * - /dashboard/security → /security
 * - /dashboard/settings → /settings
 * - /dashboard/help → /help
 *
 * Requirements: 7.2, RFC-0003 Phase 1
 */

import { Brain, MessageSquare, Network, Plus } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { useCreateThoughtMap } from '@/lib/hooks/use-thought-map';

// ============================================================================
// Types
// ============================================================================

interface QuickActionCardProps {
  description: string;
  href: string;
  icon: React.ReactNode;
  label: string;
}

interface ThoughtMapActionCardProps {
  isLoading: boolean;
  onClick: () => void;
}

// ============================================================================
// Page Component (Export)
// ============================================================================

export default function DashboardCatchAllPage() {
  const pathname = usePathname();
  const router = useRouter();

  // Get the path after /dashboard
  const pathAfterDashboard = pathname.replace('/dashboard', '') || '/';

  // Determine if we should redirect or render
  const shouldRedirect = pathAfterDashboard !== '/' && pathAfterDashboard !== '';

  useEffect(() => {
    if (!shouldRedirect) {
      return;
    }

    // Define redirect mapping
    const getRedirectPath = (path: string): string => {
      if (path === '/conversations') {
        return '/chat';
      }
      if (path === '/canvas') {
        return '/canvas';
      }
      if (path === '/security') {
        return '/security';
      }
      if (path === '/settings') {
        return '/settings';
      }
      if (path === '/help') {
        return '/help';
      }

      // Pattern matches for dynamic routes
      if (path.startsWith('/conversations/')) {
        const id = path.replace('/conversations/', '');
        return `/chat/${id}`;
      }
      if (path.startsWith('/canvas/')) {
        const id = path.replace('/canvas/', '');
        return `/canvas/${id}`;
      }

      // Default: remove /dashboard prefix
      return path;
    };

    const redirectPath = getRedirectPath(pathAfterDashboard);
    router.replace(redirectPath);
  }, [pathAfterDashboard, router, shouldRedirect]);

  // Show loading state while redirecting
  if (shouldRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Render the dashboard home for /dashboard
  return (
    <ProtectedRoute redirectTo="/auth">
      <DashboardContent />
    </ProtectedRoute>
  );
}

// ============================================================================
// Internal Components
// ============================================================================

function DashboardContent() {
  const router = useRouter();
  const { isPending: isCreatingMap, mutate: createMap } = useCreateThoughtMap();

  /**
   * Create a new Thought Map and navigate to its canvas page on success
   */
  const handleNewThoughtMap = useCallback(() => {
    createMap(
      { topic: 'Untitled Map' },
      {
        onError: (error: Error) => {
          toast.error(error.message ?? 'Failed to create Thought Map. Please try again.');
        },
        onSuccess: (map) => {
          router.push(`/dashboard/map/${map.id}`);
        },
      }
    );
  }, [createMap, router]);

  return (
    <DashboardLayout title="Dashboard">
      <div className="p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* New Chat */}
          <QuickActionCard
            description="Start a Socratic dialogue to explore a question or problem with guided AI questioning."
            href="/chat"
            icon={<MessageSquare className="h-8 w-8 text-primary" />}
            label="New Chat"
          />

          {/* New Thinking Canvas */}
          <QuickActionCard
            description="Build a structured visual canvas with Seed, Soil, and Root nodes for deep problem analysis."
            href="/canvas"
            icon={<Brain className="h-8 w-8 text-primary" />}
            label="Thinking Canvas"
          />

          {/* New Thought Map */}
          <ThoughtMapActionCard isLoading={isCreatingMap} onClick={handleNewThoughtMap} />
        </div>
      </div>
    </DashboardLayout>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Quick-action card that navigates to a static route
 */
function QuickActionCard({ description, href, icon, label }: QuickActionCardProps) {
  const router = useRouter();

  return (
    <button
      className={[
        'flex flex-col gap-4 rounded-xl border border-japandi-sand/70',
        'bg-japandi-cream/60 p-6 text-left transition-all',
        'hover:border-japandi-sage/60 hover:bg-japandi-cream/80 hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      ].join(' ')}
      onClick={() => router.push(href)}
      type="button"
    >
      <div className="rounded-lg bg-primary/10 p-3 w-fit">{icon}</div>
      <div>
        <h3 className="text-base font-semibold text-japandi-stone">{label}</h3>
        <p className="mt-1 text-sm text-japandi-stone/65 leading-relaxed">{description}</p>
      </div>
      <Button className="mt-auto gap-2 w-fit" size="sm" tabIndex={-1}>
        <Plus className="h-4 w-4" />
        {label}
      </Button>
    </button>
  );
}

/**
 * Thought Map quick-action card — triggers async map creation on click
 */
function ThoughtMapActionCard({ isLoading, onClick }: ThoughtMapActionCardProps) {
  return (
    <button
      aria-busy={isLoading}
      className={[
        'flex flex-col gap-4 rounded-xl border border-japandi-sand/70',
        'bg-japandi-cream/60 p-6 text-left transition-all',
        'hover:border-japandi-sage/60 hover:bg-japandi-cream/80 hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isLoading ? 'cursor-wait opacity-80' : '',
      ].join(' ')}
      disabled={isLoading}
      onClick={onClick}
      type="button"
    >
      <div className="rounded-lg bg-primary/10 p-3 w-fit">
        <Network className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-japandi-stone">Thought Map</h3>
        <p className="mt-1 text-sm text-japandi-stone/65 leading-relaxed">
          Create a radial mind map to visually expand and explore a central topic through branching
          thoughts.
        </p>
      </div>
      <Button className="mt-auto gap-2 w-fit" disabled={isLoading} size="sm" tabIndex={-1}>
        {isLoading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Creating…</span>
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            <span>New Thought Map</span>
          </>
        )}
      </Button>
    </button>
  );
}
