'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Eye, EyeOff, Loader2, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useRegister } from '@/lib/hooks/use-auth';
import { cn } from '@/lib/utils';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';
import { getPasswordStrengthLabel, type RegisterFormData, registerSchema } from '@/lib/validation';

/**
 * Password strength levels
 */
type PasswordStrength = 'medium' | 'strong' | 'weak';

interface SignUpFormProps {
  /**
   * Callback when sign up is successful
   */
  onSuccess?: () => void;
  /**
   * Callback to switch to sign in form
   */
  onSwitchToSignIn?: () => void;
}

/**
 * Sign up form component with validation and password strength indicator
 *
 * Features:
 * - Form validation with React Hook Form + Zod
 * - Password strength indicator
 * - Phone number input with country selector
 * - Inline error messages
 * - Loading state on submit button
 * - Show/hide password toggle
 *
 * @example
 * ```tsx
 * <SignUpForm
 *   onSuccess={() => router.push('/dashboard')}
 *   onSwitchToSignIn={() => setTab('signin')}
 * />
 * ```
 */
export function SignUpForm({ onSuccess, onSwitchToSignIn }: SignUpFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const registerMutation = useRegister();

  const form = useForm<RegisterFormData>({
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      phone: '',
    },
    resolver: zodResolver(registerSchema),
  });

  const password = form.watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerMutation.mutateAsync(data);
      showSuccessToast(
        'Account created successfully! Please check your email to verify your account.'
      );
      onSuccess?.();
    } catch (error) {
      // Show error toast with user-friendly message
      showErrorToast(error);
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-3 sm:space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        {/* First Name and Last Name - responsive grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm">First Name</FormLabel>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                  <FormControl>
                    <Input
                      {...field}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:border-white/40 h-10 sm:h-11 text-sm sm:text-base"
                      placeholder="John"
                      type="text"
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-red-300 text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm">Last Name</FormLabel>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                  <FormControl>
                    <Input
                      {...field}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:border-white/40 h-10 sm:h-11 text-sm sm:text-base"
                      placeholder="Doe"
                      type="text"
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-red-300 text-xs" />
              </FormItem>
            )}
          />
        </div>

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white text-sm">Email</FormLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <FormControl>
                  <Input
                    {...field}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:border-white/40 h-10 sm:h-11 text-sm sm:text-base"
                    placeholder="john@example.com"
                    type="email"
                  />
                </FormControl>
              </div>
              <FormMessage className="text-red-300 text-xs" />
            </FormItem>
          )}
        />

        {/* Phone */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white text-sm">Phone (Optional)</FormLabel>
              <FormControl>
                <PhoneInput
                  {...field}
                  className={cn(
                    'phone-input',
                    '[&_.PhoneInputInput]:bg-white/10',
                    '[&_.PhoneInputInput]:border-white/20',
                    '[&_.PhoneInputInput]:text-white',
                    '[&_.PhoneInputInput]:placeholder:text-white/40',
                    '[&_.PhoneInputInput]:focus-visible:border-white/40',
                    '[&_.PhoneInputInput]:focus-visible:ring-white/20',
                    '[&_.PhoneInputInput]:h-10 sm:[&_.PhoneInputInput]:h-11',
                    '[&_.PhoneInputInput]:text-sm sm:[&_.PhoneInputInput]:text-base',
                    '[&_.PhoneInputCountrySelect]:bg-white/10',
                    '[&_.PhoneInputCountrySelect]:border-white/20',
                    '[&_.PhoneInputCountrySelect]:text-white',
                    '[&_.PhoneInputCountrySelectArrow]:text-white/50'
                  )}
                  defaultCountry="US"
                  international
                  placeholder="Enter phone number"
                />
              </FormControl>
              <FormMessage className="text-red-300 text-xs" />
            </FormItem>
          )}
        />

        {/* Password */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white text-sm">Password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    {...field}
                    className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:border-white/40 h-10 sm:h-11 text-sm sm:text-base"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                  />
                </FormControl>
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors touch-manipulation"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FormMessage className="text-red-300 text-xs" />
              <PasswordStrengthIndicator password={password} />
            </FormItem>
          )}
        />

        {/* API Error Message */}
        {registerMutation.error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2.5 sm:p-3">
            <p className="text-xs sm:text-sm text-red-300">
              {registerMutation.error instanceof Error
                ? registerMutation.error.message
                : 'Registration failed. Please try again.'}
            </p>
          </div>
        )}

        {/* Submit Button - blue gradient, touch-friendly */}
        <Button
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium touch-manipulation h-11 sm:h-12 text-sm sm:text-base shadow-lg shadow-blue-500/20"
          disabled={registerMutation.isPending}
          type="submit"
        >
          {registerMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden xs:inline">Creating account...</span>
              <span className="xs:hidden">Creating...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Create Account
            </>
          )}
        </Button>

        {/* Switch to Sign In */}
        <div className="text-center">
          <p className="text-xs sm:text-sm text-white/70">
            Already have an account?{' '}
            <button
              className="text-white font-medium hover:underline touch-manipulation"
              onClick={onSwitchToSignIn}
              type="button"
            >
              Sign in
            </button>
          </p>
        </div>

        {/* Terms & Service */}
        <p className="text-[10px] sm:text-xs text-white/50 text-center leading-relaxed">
          By creating an account, you agree to our{' '}
          <a className="underline hover:text-white/70 touch-manipulation" href="/terms">
            Terms of Service
          </a>{' '}
          and{' '}
          <a className="underline hover:text-white/70 touch-manipulation" href="/privacy">
            Privacy Policy
          </a>
        </p>
      </form>
    </Form>
  );
}

/**
 * Calculate password strength based on criteria
 * Uses centralized validation helper
 */
function calculatePasswordStrength(password: string): PasswordStrength {
  return getPasswordStrengthLabel(password);
}

/**
 * Password strength indicator component
 */
function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = calculatePasswordStrength(password);

  const strengthConfig = {
    medium: {
      color: 'bg-yellow-500',
      label: 'Medium',
      width: 'w-2/3',
    },
    strong: {
      color: 'bg-green-500',
      label: 'Strong',
      width: 'w-full',
    },
    weak: {
      color: 'bg-red-500',
      label: 'Weak',
      width: 'w-1/3',
    },
  };

  const config = strengthConfig[strength];

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/70">Password strength:</span>
        <span
          className={cn('font-medium', {
            'text-green-400': strength === 'strong',
            'text-red-400': strength === 'weak',
            'text-yellow-400': strength === 'medium',
          })}
        >
          {config.label}
        </span>
      </div>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <div className={cn('h-full transition-all duration-300', config.color, config.width)} />
      </div>
    </div>
  );
}
