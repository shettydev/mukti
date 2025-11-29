'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OAuthButtonsProps {
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Callback when Apple OAuth button is clicked (optional, defaults to redirect)
   */
  onAppleClick?: () => void;
  /**
   * Callback when Google OAuth button is clicked (optional, defaults to redirect)
   */
  onGoogleClick?: () => void;
}

/**
 * Get the API base URL from centralized config
 */
import { config } from '@/lib/config';
import { showErrorToast } from '@/lib/utils/error-handler';

const API_BASE_URL = config.api.baseUrl;

/**
 * OAuth authentication buttons component
 *
 * Features:
 * - Google OAuth button with icon
 * - Apple OAuth button with icon
 * - Loading states for each button
 * - Visual feedback on click
 * - Accessible with ARIA labels
 * - Responsive design
 *
 * @example
 * ```tsx
 * <OAuthButtons
 *   onGoogleClick={() => handleGoogleAuth()}
 *   onAppleClick={() => handleAppleAuth()}
 * />
 * ```
 */
export function OAuthButtons({ className, onAppleClick, onGoogleClick }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<'apple' | 'google' | null>(null);

  const handleGoogleClick = () => {
    if (loadingProvider) {
      return;
    }

    setLoadingProvider('google');
    try {
      // If custom handler provided, use it
      if (onGoogleClick) {
        onGoogleClick();
      } else {
        // Default behavior: redirect to backend Google OAuth endpoint
        window.location.href = `${API_BASE_URL}/auth/google`;
      }
    } catch (error) {
      showErrorToast(error, 'Failed to initiate Google sign in. Please try again.');
      setLoadingProvider(null);
    }
  };

  const handleAppleClick = () => {
    if (loadingProvider) {
      return;
    }

    setLoadingProvider('apple');
    try {
      // If custom handler provided, use it
      if (onAppleClick) {
        onAppleClick();
      } else {
        // Default behavior: redirect to backend Apple OAuth endpoint
        window.location.href = `${API_BASE_URL}/auth/apple`;
      }
    } catch (error) {
      showErrorToast(error, 'Failed to initiate Apple sign in. Please try again.');
      setLoadingProvider(null);
    }
  };

  return (
    <div className={cn('space-y-2 sm:space-y-3', className)}>
      {/* Divider */}
      <div className="relative">
        <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
          <span className="bg-transparent px-2 text-white/60">Or continue with</span>
        </div>
      </div>

      {/* OAuth Buttons - responsive grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* Google OAuth Button - touch-friendly */}
        <Button
          aria-label="Sign in with Google"
          className={cn(
            'bg-white/10 hover:bg-white/20 text-white border border-white/20',
            'transition-all duration-200',
            'hover:scale-[1.02] active:scale-[0.98]',
            'touch-manipulation',
            'h-10 sm:h-11',
            'text-xs sm:text-sm',
            loadingProvider === 'google' && 'opacity-80'
          )}
          disabled={loadingProvider !== null}
          onClick={handleGoogleClick}
          type="button"
          variant="outline"
        >
          {loadingProvider === 'google' ? (
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
          ) : (
            <GoogleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
          <span className="hidden xs:inline ml-1 sm:ml-2">Google</span>
        </Button>

        {/* Apple OAuth Button - touch-friendly */}
        <Button
          aria-label="Sign in with Apple"
          className={cn(
            'bg-white/10 hover:bg-white/20 text-white border border-white/20',
            'transition-all duration-200',
            'hover:scale-[1.02] active:scale-[0.98]',
            'touch-manipulation',
            'h-10 sm:h-11',
            'text-xs sm:text-sm',
            loadingProvider === 'apple' && 'opacity-80'
          )}
          disabled={loadingProvider !== null}
          onClick={handleAppleClick}
          type="button"
          variant="outline"
        >
          {loadingProvider === 'apple' ? (
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
          ) : (
            <AppleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
          <span className="hidden xs:inline ml-1 sm:ml-2">Apple</span>
        </Button>
      </div>
    </div>
  );
}

/**
 * Apple icon SVG component
 */
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

/**
 * Google icon SVG component
 */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
