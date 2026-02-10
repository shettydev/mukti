'use client';

import './japandi/japandi.css';
import LandingCTA from '@/components/landing/landing-cta';
import LandingFooter from '@/components/landing/landing-footer';
import LandingHero from '@/components/landing/landing-hero';
import LandingNav from '@/components/landing/landing-nav';
import LandingPhilosophy from '@/components/landing/landing-philosophy';
import LandingPillars from '@/components/landing/landing-pillars';
import LandingProcess from '@/components/landing/landing-process';
import LandingResearch from '@/components/landing/landing-research';

export default function Home() {
  return (
    <main className="japandi-page bg-grain min-h-screen w-full overflow-x-hidden selection:bg-japandi-sage selection:text-white">
      <LandingNav />
      <LandingHero />
      <LandingPhilosophy />
      <LandingPillars />
      <LandingProcess />
      <LandingResearch />
      <LandingCTA />
      <LandingFooter />
    </main>
  );
}
