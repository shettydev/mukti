'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { GradientBackground } from '@/components/auth/gradient-background';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { SignInForm } from '@/components/auth/sign-in-form';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { cn } from '@/lib/utils';

type AuthTab = 'signin' | 'signup';

/**
 * Full-page authentication page with gradient background and tab switching.
 *
 * Features:
 * - Full-page gradient background (purple to blue)
 * - Centered dark card with backdrop blur
 * - Tab switching between sign up and sign in
 * - Smooth animations for tab transitions
 * - Responsive design for all screen sizes
 * - URL query parameter support (?tab=signup or ?tab=signin)
 * - Automatic redirect to dashboard on successful authentication
 *
 * @example
 * Navigate to /auth?tab=signup to show sign up form
 * Navigate to /auth?tab=signin to show sign in form
 * Navigate to /auth to show sign in form by default
 */
export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <GradientBackground>
          <div
            className={cn(
              'bg-black/60 backdrop-blur-xl',
              'border border-white/10',
              'rounded-2xl sm:rounded-3xl',
              'w-full max-w-[95%] xs:max-w-md sm:max-w-lg',
              'p-6 sm:p-8 md:p-10',
              'shadow-2xl shadow-black/50',
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

  // Initialize tab from URL parameter or default to signin
  const [activeTab, setActiveTab] = useState<AuthTab>(
    tabParam === 'signup' || tabParam === 'signin' ? tabParam : 'signin'
  );

  // Update tab when URL parameter changes
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
    // Redirect to dashboard on successful authentication
    router.push('/dashboard');
  };

  return (
    <GradientBackground>
      {/* Centered dark card with backdrop blur */}
      <div
        className={cn(
          // Card styling
          'bg-black/60 backdrop-blur-xl',
          'border border-white/10',
          'rounded-2xl sm:rounded-3xl',
          // Responsive sizing
          'w-full max-w-[95%] xs:max-w-md sm:max-w-lg',
          // Responsive padding
          'p-6 sm:p-8 md:p-10',
          // Shadow for depth
          'shadow-2xl shadow-black/50',
          // Animation
          'animate-in fade-in-0 zoom-in-95 duration-300'
        )}
      >
        {/* Logo/Title */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
            Welcome to Mukti
          </h1>
          <p className="text-xs sm:text-sm text-white/60">
            {activeTab === 'signup'
              ? 'Create your account to get started'
              : 'Sign in to continue your journey'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 sm:mb-8 p-1 bg-white/5 rounded-lg sm:rounded-xl border border-white/10">
          <button
            className={cn(
              'flex-1 py-2.5 sm:py-3 px-4 rounded-md sm:rounded-lg',
              'text-sm sm:text-base font-medium',
              'transition-all duration-300 ease-in-out',
              'touch-manipulation',
              activeTab === 'signin'
                ? 'bg-white/10 text-white shadow-lg'
                : 'text-white/60 hover:text-white/80'
            )}
            onClick={() => handleTabChange('signin')}
            type="button"
          >
            Sign In
          </button>
          <button
            className={cn(
              'flex-1 py-2.5 sm:py-3 px-4 rounded-md sm:rounded-lg',
              'text-sm sm:text-base font-medium',
              'transition-all duration-300 ease-in-out',
              'touch-manipulation',
              activeTab === 'signup'
                ? 'bg-white/10 text-white shadow-lg'
                : 'text-white/60 hover:text-white/80'
            )}
            onClick={() => handleTabChange('signup')}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {/* Form Content with smooth transition */}
        <div className="relative">
          {/* Sign In Form */}
          <div
            className={cn(
              'transition-all duration-300 ease-in-out',
              activeTab === 'signin'
                ? 'opacity-100 translate-x-0 relative'
                : 'opacity-0 -translate-x-4 absolute inset-0 pointer-events-none'
            )}
          >
            {activeTab === 'signin' && (
              <>
                <SignInForm
                  onSuccess={handleAuthSuccess}
                  onSwitchToSignUp={() => handleTabChange('signup')}
                />
                <div className="mt-4 sm:mt-6">
                  <OAuthButtons />
                </div>
              </>
            )}
          </div>

          {/* Sign Up Form */}
          <div
            className={cn(
              'transition-all duration-300 ease-in-out',
              activeTab === 'signup'
                ? 'opacity-100 translate-x-0 relative'
                : 'opacity-0 translate-x-4 absolute inset-0 pointer-events-none'
            )}
          >
            {activeTab === 'signup' && (
              <>
                <SignUpForm
                  onSuccess={handleAuthSuccess}
                  onSwitchToSignIn={() => handleTabChange('signin')}
                />
                <div className="mt-4 sm:mt-6">
                  <OAuthButtons />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </GradientBackground>
  );
}
