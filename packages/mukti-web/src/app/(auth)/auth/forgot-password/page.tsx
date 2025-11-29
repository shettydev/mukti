'use client';

import { useRouter } from 'next/navigation';

import { GradientBackground } from '@/components/auth';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

/**
 * Forgot password page
 *
 * Features:
 * - Animated gradient background
 * - Forgot password form
 * - Responsive design
 * - Back to sign in navigation
 *
 * @example
 * Navigate to: /auth/forgot-password
 */
export default function ForgotPasswordPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/auth');
  };

  return (
    <GradientBackground>
      <div className="w-full max-w-md">
        <div className="bg-black/60 backdrop-blur-lg rounded-3xl p-8 border border-white/10 shadow-2xl">
          <ForgotPasswordForm onBack={handleBack} />
        </div>
      </div>
    </GradientBackground>
  );
}
