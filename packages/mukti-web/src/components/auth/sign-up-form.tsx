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
 *   onSuccess={() => router.push('/chat')}
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
      <form className="space-y-4 sm:space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        {/* First Name and Last Name - responsive grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-japandi-label text-japandi-stone/85">
                  First Name
                </FormLabel>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-japandi-timber/60" />
                  <FormControl>
                    <Input
                      {...field}
                      className="h-11 border-japandi-sand/80 bg-japandi-cream/65 pl-10 text-japandi-stone placeholder:text-japandi-stone/45 focus-visible:border-japandi-sage focus-visible:ring-japandi-sage/30 sm:h-12 sm:text-base"
                      placeholder="John"
                      type="text"
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-xs text-red-600 dark:text-red-300" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-japandi-label text-japandi-stone/85">
                  Last Name
                </FormLabel>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-japandi-timber/60" />
                  <FormControl>
                    <Input
                      {...field}
                      className="h-11 border-japandi-sand/80 bg-japandi-cream/65 pl-10 text-japandi-stone placeholder:text-japandi-stone/45 focus-visible:border-japandi-sage focus-visible:ring-japandi-sage/30 sm:h-12 sm:text-base"
                      placeholder="Doe"
                      type="text"
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-xs text-red-600 dark:text-red-300" />
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
              <FormLabel className="text-japandi-label text-japandi-stone/85">Email</FormLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-japandi-timber/60" />
                <FormControl>
                  <Input
                    {...field}
                    className="h-11 border-japandi-sand/80 bg-japandi-cream/65 pl-10 text-japandi-stone placeholder:text-japandi-stone/45 focus-visible:border-japandi-sage focus-visible:ring-japandi-sage/30 sm:h-12 sm:text-base"
                    placeholder="john@example.com"
                    type="email"
                  />
                </FormControl>
              </div>
              <FormMessage className="text-xs text-red-600 dark:text-red-300" />
            </FormItem>
          )}
        />

        {/* Phone */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-japandi-label text-japandi-stone/85">
                Phone (Optional)
              </FormLabel>
              <FormControl>
                <PhoneInput
                  {...field}
                  className={cn(
                    'phone-input',
                    '[&_.PhoneInputInput]:h-11 sm:[&_.PhoneInputInput]:h-12',
                    '[&_.PhoneInputInput]:border-japandi-sand/80',
                    '[&_.PhoneInputInput]:bg-japandi-cream/65',
                    '[&_.PhoneInputInput]:text-sm sm:[&_.PhoneInputInput]:text-base',
                    '[&_.PhoneInputInput]:text-japandi-stone',
                    '[&_.PhoneInputInput]:placeholder:text-japandi-stone/45',
                    '[&_.PhoneInputInput]:focus-visible:border-japandi-sage',
                    '[&_.PhoneInputInput]:focus-visible:ring-japandi-sage/30',
                    '[&_.PhoneInputCountrySelect]:border-japandi-sand/80',
                    '[&_.PhoneInputCountrySelect]:bg-japandi-cream/65',
                    '[&_.PhoneInputCountrySelect]:text-japandi-stone',
                    '[&_.PhoneInputCountrySelectArrow]:text-japandi-stone/55'
                  )}
                  defaultCountry="US"
                  international
                  placeholder="Enter phone number"
                />
              </FormControl>
              <FormMessage className="text-xs text-red-600 dark:text-red-300" />
            </FormItem>
          )}
        />

        {/* Password */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-japandi-label text-japandi-stone/85">Password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    {...field}
                    className="h-11 border-japandi-sand/80 bg-japandi-cream/65 pr-10 text-japandi-stone placeholder:text-japandi-stone/45 focus-visible:border-japandi-sage focus-visible:ring-japandi-sage/30 sm:h-12 sm:text-base"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                  />
                </FormControl>
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 min-h-[44px] min-w-[44px] -translate-y-1/2 text-japandi-timber/65 transition-colors hover:text-japandi-timber focus-visible:outline-none touch-manipulation"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FormMessage className="text-xs text-red-600 dark:text-red-300" />
              <PasswordStrengthIndicator password={password} />
            </FormItem>
          )}
        />

        {/* API Error Message */}
        {registerMutation.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 sm:p-3">
            <p className="text-xs text-red-700 dark:text-red-300 sm:text-sm">
              {registerMutation.error instanceof Error
                ? registerMutation.error.message
                : 'Registration failed. Please try again.'}
            </p>
          </div>
        )}

        {/* Submit Button - blue gradient, touch-friendly */}
        <Button
          className="h-11 w-full bg-japandi-terracotta text-sm font-medium text-white shadow-sm shadow-japandi-timber/20 transition-colors hover:bg-japandi-timber focus-visible:ring-japandi-sage/40 touch-manipulation sm:h-12 sm:text-base"
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
          <p className="text-xs text-japandi-stone/70 sm:text-sm">
            Already have an account?{' '}
            <button
              className="font-medium text-japandi-timber underline-offset-4 hover:underline touch-manipulation"
              onClick={onSwitchToSignIn}
              type="button"
            >
              Sign in
            </button>
          </p>
        </div>

        {/* Terms & Service */}
        <p className="text-center text-[10px] leading-relaxed text-japandi-stone/55 sm:text-xs">
          By creating an account, you agree to our{' '}
          <a
            className="underline decoration-japandi-sand underline-offset-3 hover:text-japandi-timber touch-manipulation"
            href="/terms"
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            className="underline decoration-japandi-sand underline-offset-3 hover:text-japandi-timber touch-manipulation"
            href="/privacy"
          >
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
      color: 'bg-amber-500',
      label: 'Medium',
      width: 'w-2/3',
    },
    strong: {
      color: 'bg-japandi-sage',
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
        <span className="text-japandi-stone/70">Password strength:</span>
        <span
          className={cn('font-medium', {
            'text-amber-600 dark:text-amber-400': strength === 'medium',
            'text-japandi-sage': strength === 'strong',
            'text-red-500 dark:text-red-300': strength === 'weak',
          })}
        >
          {config.label}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-japandi-light-stone/80">
        <div className={cn('h-full transition-all duration-300', config.color, config.width)} />
      </div>
    </div>
  );
}
