'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Google OAuth callback page with Suspense boundary
 */
export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-pink-600">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
        </div>
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
        // Extract authorization code from URL
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');

        // Handle OAuth errors from provider
        if (errorParam) {
          const errorDescription = searchParams.get('error_description');
          throw new Error(errorDescription || 'OAuth authentication was cancelled or failed');
        }

        // Validate code exists
        if (!code) {
          throw new Error('Authorization code not found in callback URL');
        }

        // Call backend OAuth endpoint
        const response = await authApi.googleAuth({ code });

        // Store tokens and user data
        setAccessToken(response.accessToken);
        setUser(response.user);

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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-pink-600">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">
            Completing sign in with Google...
          </h2>
          <p className="text-white/80">Please wait while we authenticate your account</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-pink-600 p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">Authentication Failed</h2>
            <p className="text-white/80 mb-6">{error}</p>
            <button
              className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-3 px-4 rounded-lg transition-colors border border-white/20"
              onClick={() => router.push('/')}
              type="button"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
