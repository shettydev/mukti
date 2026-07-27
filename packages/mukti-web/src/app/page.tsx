'use client';

import { redirect } from 'next/navigation';

import LandingCTA from '@/components/landing/landing-cta';
import LandingDemo from '@/components/landing/landing-demo';
import LandingFaq from '@/components/landing/landing-faq';
import LandingFooter from '@/components/landing/landing-footer';
import LandingHero from '@/components/landing/landing-hero';
import LandingNav from '@/components/landing/landing-nav';
import LandingPhilosophy from '@/components/landing/landing-philosophy';
import LandingPillars from '@/components/landing/landing-pillars';
import LandingProcess from '@/components/landing/landing-process';
import LandingResearch from '@/components/landing/landing-research';
import { isLocalMode } from '@/lib/config';

export default function Home() {
  // Local mode has no marketing landing — route straight into the app. The
  // first-run welcome tour mounts inside the dashboard layout.
  if (isLocalMode()) {
    redirect('/chat');
  }

  return (
    <main className="japandi-page bg-grain min-h-screen w-full overflow-x-hidden selection:bg-japandi-sage selection:text-white">
      <LandingNav />
      <LandingHero />
      <LandingDemo />
      <LandingPhilosophy />
      <LandingPillars />
      <LandingProcess />
      <LandingResearch />
      <LandingFaq />
      <LandingCTA />
      <LandingFooter />
    </main>
  );
}
