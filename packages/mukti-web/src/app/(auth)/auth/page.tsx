'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { GradientBackground } from '@/components/auth/gradient-background';
import { SignInForm } from '@/components/auth/sign-in-form';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { Button } from '@/components/ui/button';
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
                ? 'Create your account to begin your liberation.'
                : 'Sign in to continue your inquiry journey.'}
            </p>
          </div>

          {/* Tab Navigation */}
          <div
            className="mb-6 flex gap-2 rounded-xl border border-japandi-sand/80 bg-japandi-light-stone/55 p-1 sm:mb-8"
            suppressHydrationWarning
          >
            <Button
              className={cn(
                'min-h-11 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium sm:text-base',
                'transition-all duration-200 ease-out touch-manipulation',
                'focus-visible:ring-2 focus-visible:ring-japandi-sage/60 focus-visible:outline-none',
                activeTab === 'signin'
                  ? 'bg-japandi-cream text-japandi-stone shadow-sm hover:bg-japandi-cream'
                  : 'text-japandi-stone/70 hover:text-japandi-timber hover:bg-japandi-cream/55'
              )}
              onClick={() => handleTabChange('signin')}
              type="button"
              variant="ghost"
            >
              Sign In
            </Button>
            <Button
              className={cn(
                'min-h-11 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium sm:text-base',
                'transition-all duration-200 ease-out touch-manipulation',
                'focus-visible:ring-2 focus-visible:ring-japandi-sage/60 focus-visible:outline-none',
                activeTab === 'signup'
                  ? 'bg-japandi-cream text-japandi-stone shadow-sm hover:bg-japandi-cream'
                  : 'text-japandi-stone/70 hover:text-japandi-timber hover:bg-japandi-cream/55'
              )}
              onClick={() => handleTabChange('signup')}
              type="button"
              variant="ghost"
            >
              Sign Up
            </Button>
          </div>

          {/* Form Content with smooth transition */}
          <div className="relative overflow-hidden" suppressHydrationWarning>
            <AnimatePresence initial={false} mode="wait">
              {activeTab === 'signin' ? (
                <motion.div
                  animate={{ filter: 'blur(0px)', opacity: 1, x: 0 }}
                  exit={{ filter: 'blur(4px)', opacity: 0, x: -20 }}
                  initial={{ filter: 'blur(4px)', opacity: 0, x: -20 }}
                  key="signin"
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <SignInForm
                    onSuccess={handleAuthSuccess}
                    onSwitchToSignUp={() => handleTabChange('signup')}
                  />
                </motion.div>
              ) : (
                <motion.div
                  animate={{ filter: 'blur(0px)', opacity: 1, x: 0 }}
                  exit={{ filter: 'blur(4px)', opacity: 0, x: 20 }}
                  initial={{ filter: 'blur(4px)', opacity: 0, x: 20 }}
                  key="signup"
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <SignUpForm
                    onSuccess={handleAuthSuccess}
                    onSwitchToSignIn={() => handleTabChange('signin')}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </GradientBackground>
  );
}
