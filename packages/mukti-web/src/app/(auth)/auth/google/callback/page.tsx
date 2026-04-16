'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { GradientBackground } from '@/components/auth/gradient-background';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Google OAuth callback page with Suspense boundary
 */
export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <GradientBackground>
          <Loader2 className="h-10 w-10 animate-spin text-japandi-timber/60" />
        </GradientBackground>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}

/**
 * Google OAuth callback page
 *
 * Handles the OAuth redirect from Google:
 * 1. Extracts authorization code from URL
 * 2. Calls backend OAuth endpoint
 * 3. Stores tokens and user data
 * 4. Redirects to dashboard
 * 5. Handles errors gracefully
 *
 * @example
 * URL: /auth/google/callback?code=4/0AY0e-g7...&state=...
 */
function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAccessToken, setUser } = useAuthStore();

  const [error, setError] = useState<null | string>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error from backend redirect
        const errorParam = searchParams.get('error');
        if (errorParam) {
          throw new Error(errorParam);
        }

        // Extract access token from backend redirect
        const token = searchParams.get('token');
        if (!token) {
          throw new Error('Authentication token not found in callback URL');
        }

        // Store access token
        setAccessToken(token);

        // Fetch user data using the token
        const user = await authApi.getMe();
        setUser(user);

        // Redirect to chat
        router.push('/chat');
      } catch (err) {
        console.error('Google OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Failed to complete Google authentication');
        setIsProcessing(false);
      }
    };

    void handleCallback();
  }, [searchParams, router, setAccessToken, setUser]);

  // Loading state
  if (isProcessing && !error) {
    return (
      <GradientBackground>
        <div className="mx-auto w-full max-w-[95%] xs:max-w-md sm:max-w-xl rounded-3xl border border-japandi-sand/70 bg-japandi-cream/85 backdrop-blur-sm p-8 sm:p-10 shadow-[0_24px_70px_-42px_rgba(107,77,58,0.45)] dark:shadow-[0_24px_70px_-42px_rgba(0,0,0,0.65)]">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-japandi-timber/60 mx-auto mb-5" />
            <h2 className="text-japandi-heading text-xl sm:text-2xl mb-2">Completing sign in...</h2>
            <p className="text-japandi-body text-sm text-japandi-stone/70">
              Please wait while we authenticate your account
            </p>
          </div>
        </div>
      </GradientBackground>
    );
  }

  // Error state
  if (error) {
    return (
      <GradientBackground>
        <div className="mx-auto w-full max-w-[95%] xs:max-w-md sm:max-w-xl rounded-3xl border border-japandi-sand/70 bg-japandi-cream/85 backdrop-blur-sm p-8 sm:p-10 shadow-[0_24px_70px_-42px_rgba(107,77,58,0.45)] dark:shadow-[0_24px_70px_-42px_rgba(0,0,0,0.65)]">
          <div className="text-center">
            <AlertCircle className="h-10 w-10 text-red-500/70 mx-auto mb-5" />
            <h2 className="text-japandi-heading text-xl sm:text-2xl mb-2">Authentication Failed</h2>
            <p className="text-japandi-body text-sm text-japandi-stone/70 mb-6">{error}</p>
            <Button
              className="w-full h-11 bg-japandi-terracotta text-sm font-medium text-white shadow-sm shadow-japandi-timber/20 transition-colors hover:bg-japandi-timber focus-visible:ring-japandi-sage/40 touch-manipulation sm:h-12 sm:text-base"
              onClick={() => router.push('/')}
              type="button"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </GradientBackground>
    );
  }

  return null;
}
