'use client';

import { Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { GradientBackground } from '@/components/auth/gradient-background';
import { SignInForm } from '@/components/auth/sign-in-form';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { cn } from '@/lib/utils';

type AuthTab = 'signin' | 'signup';

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <GradientBackground>
          <div
            className={cn(
              'mx-auto w-full max-w-[95%] xs:max-w-md sm:max-w-xl',
              'rounded-3xl border border-japandi-sand/70 bg-japandi-cream/85',
              'p-6 sm:p-8',
              'shadow-[0_24px_70px_-42px_rgba(107,77,58,0.45)] dark:shadow-[0_24px_70px_-42px_rgba(0,0,0,0.65)] backdrop-blur-sm',
              'animate-pulse'
            )}
          >
            <div className="h-96" />
          </div>
        </GradientBackground>
      }
    >
      <AuthContent />
    </Suspense>
  );
}

/**
 * Auth content component that uses search params.
 * Separated to allow Suspense boundary wrapping.
 */
function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as AuthTab | null;

  // Initialize with default value to avoid hydration mismatch
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');

  // Sync tab from URL parameter after hydration
  useEffect(() => {
    if (tabParam === 'signup' || tabParam === 'signin') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    // Update URL without page reload
    router.push(`/auth?tab=${tab}`, { scroll: false });
  };

  const handleAuthSuccess = () => {
    // Redirect to chat on successful authentication
    router.push('/chat');
  };

  return (
    <GradientBackground>
      <div className="relative mx-auto w-full max-w-[95%] xs:max-w-md sm:max-w-xl">
        <div
          className={cn(
            'relative w-full rounded-3xl border border-japandi-sand/70 bg-japandi-cream/85 backdrop-blur-sm',
            'p-6 sm:p-8',
            'shadow-[0_24px_70px_-42px_rgba(107,77,58,0.45)] dark:shadow-[0_24px_70px_-42px_rgba(0,0,0,0.65)]',
            'animate-in fade-in-0 zoom-in-95 duration-300'
          )}
          suppressHydrationWarning
        >
          {/* Logo/Title */}
          <div className="mb-6 space-y-4 text-center sm:mb-8" suppressHydrationWarning>
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-japandi-sand/75 bg-japandi-cream/70 px-3 py-1.5">
              <span className="text-japandi-label text-japandi-timber/85">Mukti</span>
              <span className="text-japandi-label text-japandi-stone/45">Socratic Workspace</span>
            </div>
            <h1 className="text-japandi-heading mb-2 text-2xl sm:text-3xl md:text-[2rem]">
              {activeTab === 'signup' ? 'Begin with intention' : 'Welcome back'}
            </h1>
            <p className="text-japandi-body text-sm text-japandi-stone/75">
              {activeTab === 'signup'
                ? 'Create your account with a waitlisted email to enter Mukti.'
                : 'Sign in to continue your inquiry journey.'}
            </p>
            {activeTab === 'signup' && (
              <p className="text-xs text-japandi-timber/85">
                Sign up is invite-gated through the waitlist.
              </p>
            )}
          </div>

          {/* Tab Navigation */}
          <div
            className="mb-6 flex gap-2 rounded-xl border border-japandi-sand/80 bg-japandi-light-stone/55 p-1 sm:mb-8"
            suppressHydrationWarning
          >
            <button
              className={cn(
                'min-h-11 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium sm:text-base',
                'transition-all duration-200 ease-out touch-manipulation',
                'focus-visible:ring-2 focus-visible:ring-japandi-sage/60 focus-visible:outline-none',
                activeTab === 'signin'
                  ? 'bg-japandi-cream text-japandi-stone shadow-sm'
                  : 'text-japandi-stone/70 hover:text-japandi-timber hover:bg-japandi-cream/55'
              )}
              onClick={() => handleTabChange('signin')}
              type="button"
            >
              Sign In
            </button>
            <button
              className={cn(
                'min-h-11 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium sm:text-base',
                'transition-all duration-200 ease-out touch-manipulation',
                'focus-visible:ring-2 focus-visible:ring-japandi-sage/60 focus-visible:outline-none',
                activeTab === 'signup'
                  ? 'bg-japandi-cream text-japandi-stone shadow-sm'
                  : 'text-japandi-stone/70 hover:text-japandi-timber hover:bg-japandi-cream/55'
              )}
              onClick={() => handleTabChange('signup')}
              type="button"
            >
              Sign Up
            </button>
          </div>

          {/* Form Content with smooth transition */}
          <div className="relative" suppressHydrationWarning>
            {/* Sign In Form */}
            <div
              className={cn(
                'transition-all duration-300 ease-in-out',
                activeTab === 'signin'
                  ? 'relative translate-x-0 opacity-100'
                  : 'pointer-events-none absolute inset-0 -translate-x-4 opacity-0'
              )}
            >
              {activeTab === 'signin' && (
                <SignInForm
                  onSuccess={handleAuthSuccess}
                  onSwitchToSignUp={() => handleTabChange('signup')}
                />
              )}
            </div>

            {/* Sign Up Form */}
            <div
              className={cn(
                'transition-all duration-300 ease-in-out',
                activeTab === 'signup'
                  ? 'relative translate-x-0 opacity-100'
                  : 'pointer-events-none absolute inset-0 translate-x-4 opacity-0'
              )}
            >
              {activeTab === 'signup' && (
                <SignUpForm
                  onSuccess={handleAuthSuccess}
                  onSwitchToSignIn={() => handleTabChange('signin')}
                />
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-2 border-t border-japandi-sand/70 pt-5 text-left xs:grid-cols-3">
            <div className="rounded-lg border border-japandi-sand/60 bg-japandi-light-stone/45 px-3 py-2">
              <div className="mb-1 flex items-center gap-2 text-japandi-timber">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="text-japandi-label">Private</span>
              </div>
              <p className="text-xs text-japandi-stone/70">Session-backed secure authentication.</p>
            </div>
            <div className="rounded-lg border border-japandi-sand/60 bg-japandi-light-stone/45 px-3 py-2">
              <div className="mb-1 flex items-center gap-2 text-japandi-timber">
                <Leaf className="h-3.5 w-3.5" />
                <span className="text-japandi-label">Calm</span>
              </div>
              <p className="text-xs text-japandi-stone/70">
                Focused space designed for deep inquiry.
              </p>
            </div>
            <div className="rounded-lg border border-japandi-sand/60 bg-japandi-light-stone/45 px-3 py-2">
              <div className="mb-1 flex items-center gap-2 text-japandi-timber">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-japandi-label">Guided</span>
              </div>
              <p className="text-xs text-japandi-stone/70">
                Socratic prompts instead of instant answers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </GradientBackground>
  );
}
