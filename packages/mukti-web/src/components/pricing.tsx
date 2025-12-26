'use client';

import { Flame, Globe, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { cn } from '@/lib/utils';

import { Button } from './ui/button';
import { Spotlight } from './ui/spotlight-new';

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'annually' | 'monthly'>('monthly');

  const plans = [
    {
      buttonText: 'Get Started',
      features: [
        'Access to basic AI models (Llama 3, Mistral)',
        'Standard Socratic dialogue mode',
        'Basic Thinking Canvas (read-only)',
        'Community Support',
        'Standard rate limits',
      ],
      highlight: false,
      href: '/chat',
      icon: <Flame className="h-5 w-5 text-slate-300" />,
      period: '',
      price: 'FREE',
      subtitle: 'Best for personal exploration.',
      title: 'Seeker',
    },
    {
      buttonText: 'Coming Soon',
      features: [
        'Access to premium models (Claude 4.5, GPT-5.2)',
        'Create custom Socratic techniques',
        'Full Thinking Canvas editing',
        'Higher rate limits',
        'Priority Support',
        'Private knowledge base',
      ],
      highlight: true,
      icon: <Globe className="h-5 w-5 text-slate-300" />,
      period: '/ per month',
      price: '$20',
      subtitle: 'For serious thinkers and creators.',
      title: 'Philosopher',
    },
    {
      buttonText: 'Contact Us',
      features: [
        'Custom model fine-tuning',
        'Team collaboration spaces',
        'Enterprise-grade security & SSO',
        'Unlimited rate limits',
        'Dedicated success manager',
        'Custom integration support',
      ],
      highlight: false,
      icon: <MessageCircle className="h-5 w-5 text-slate-300" />,
      period: '',
      price: 'Custom',
      subtitle: 'For organizations and teams.',
      title: 'Enterprise',
    },
  ];

  return (
    <section
      className="min-h-screen w-full bg-[#020617] relative overflow-hidden flex flex-col items-center justify-center py-24 md:py-32"
      id="pricing"
    >
      {/* Background Gradients */}
      <Spotlight duration={10} height={1500} side="right" width={300} />

      <div className="container mx-auto px-4 relative z-10 flex flex-col items-center">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-xs font-medium text-slate-400">
            <span className="flex h-2 w-2 rounded-full bg-slate-400" />
            Pricing
          </div>

          <h2 className="text-3xl md:text-5xl font-medium tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
            Choose the perfect plan to fit your business goals and budget
          </h2>

          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Whether you&apos;re just getting started or looking to scale, we offer flexible pricing
            options that grow with you. Find the plan that works best for your needs and start
            experiencing the benefits of intelligent automation today.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="bg-slate-900/50 p-1 rounded-full border border-slate-800 inline-flex">
              <Button
                className={cn(
                  'px-6 py-2 rounded-full text-sm font-medium transition-all duration-300',
                  billingCycle === 'monthly'
                    ? 'bg-slate-200 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </Button>
              {/* TODO: Uncomment the following button, once annual billing is available */}
              {/*<Button
                className={cn(
                  'px-6 py-2 rounded-full text-sm font-medium transition-all duration-300',
                  billingCycle === 'annually'
                    ? 'bg-slate-200 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
                onClick={() => setBillingCycle('annually')}
              >
                Anually
              </Button>*/}
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory gap-4 md:gap-6 w-full max-w-6xl pb-12 md:pb-0 px-4 md:px-0 -mx-4 md:mx-auto [&::-webkit-scrollbar]:hidden">
          {plans.map((plan, index) => (
            <div
              className="min-w-[85vw] md:min-w-0 snap-center relative p-8 rounded-2xl bg-[#0A0F1C]/80 border border-slate-800/60 flex flex-col hover:border-slate-700 transition-all duration-300 backdrop-blur-sm group"
              key={index}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-6 group-hover:border-slate-600 transition-colors">
                {plan.icon}
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-xl font-medium text-white mb-2">{plan.title}</h3>
              <p className="text-slate-500 text-sm mb-8">{plan.subtitle}</p>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-normal text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-slate-500">{plan.period}</span>}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-slate-800/50 mb-8" />

              {/* Features List */}
              <div className="flex-grow mb-8">
                <p className="text-white font-medium mb-4">What you will get</p>
                <ul className="space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li className="flex items-start gap-3 text-slate-400 text-sm" key={idx}>
                      <div className="mt-0.5 min-w-[16px]">
                        <svg
                          className="opacity-70"
                          fill="none"
                          height="16"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          width="16"
                        >
                          <path d="M12 2v4" />
                          <path d="m16.2 7.8 2.9-2.9" />
                          <path d="M18 12h4" />
                          <path d="m16.2 16.2 2.9 2.9" />
                          <path d="M12 18v4" />
                          <path d="m7.8 16.2-2.9 2.9" />
                          <path d="M6 12H2" />
                          <path d="m7.8 7.8-2.9-2.9" />
                        </svg>
                      </div>
                      <span className="leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Button */}
              <Link href={plan.href ?? '/'}>
                <Button
                  className={cn(
                    'w-full rounded-xl py-6 border-slate-800 bg-transparent text-white hover:bg-slate-800 hover:text-white transition-all'
                  )}
                  variant="outline"
                >
                  {plan.buttonText}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
