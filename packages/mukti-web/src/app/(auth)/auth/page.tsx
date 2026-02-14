'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { GradientBackground } from '@/components/auth/gradient-background';
import { SignInForm } from '@/components/auth/sign-in-form';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { JapandiThemeToggle } from '@/components/theme/japandi-theme-toggle';
import { cn } from '@/lib/utils';

type AuthTab = 'signin' | 'signup';

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <GradientBackground>
          <div
            className={cn(
              'w-full max-w-[95%] xs:max-w-md sm:max-w-lg',
              'rounded-3xl border border-japandi-sand/70 bg-japandi-cream/80',
              'p-6 sm:p-8 md:p-10',
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
      <div className="relative w-full max-w-[95%] xs:max-w-md sm:max-w-lg">
        <div
          className={cn(
            'relative w-full rounded-3xl border border-japandi-sand/70 bg-japandi-cream/80 backdrop-blur-sm',
            'p-6 sm:p-8 md:p-10',
            'shadow-[0_24px_70px_-42px_rgba(107,77,58,0.45)] dark:shadow-[0_24px_70px_-42px_rgba(0,0,0,0.65)]',
            'animate-in fade-in-0 zoom-in-95 duration-300'
          )}
          suppressHydrationWarning
        >
          <div className="absolute right-4 top-4">
            <JapandiThemeToggle ariaLabel="Toggle theme on auth page" />
          </div>

          {/* Logo/Title */}
          <div className="mb-6 pt-2 text-center sm:mb-8" suppressHydrationWarning>
            <p className="text-japandi-label mb-3 text-japandi-timber/85">Mukti</p>
            <h1 className="text-japandi-heading mb-2 text-2xl sm:text-3xl md:text-[2rem]">
              Welcome back
            </h1>
            <p className="text-japandi-body text-sm text-japandi-stone/75">
              {activeTab === 'signup'
                ? 'Create your account to begin your inquiry practice.'
                : 'Sign in to continue your inquiry journey.'}
            </p>
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
        </div>
      </div>
    </GradientBackground>
  );
}
