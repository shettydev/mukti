'use client';

import './japandi.css';
import JapandiCTA from '@/components/japandi/japandi-cta';
import JapandiFooter from '@/components/japandi/japandi-footer';
import JapandiHero from '@/components/japandi/japandi-hero';
import JapandiNav from '@/components/japandi/japandi-nav';
import JapandiPhilosophy from '@/components/japandi/japandi-philosophy';
import JapandiPillars from '@/components/japandi/japandi-pillars';
import JapandiRitual from '@/components/japandi/japandi-ritual';
import JapandiVoices from '@/components/japandi/japandi-voices';

export default function JapandiPage() {
  return (
    <main className="japandi-page bg-grain min-h-screen w-full overflow-x-hidden selection:bg-japandi-sage selection:text-white">
      <JapandiNav />
      <JapandiHero />
      <JapandiPhilosophy />
      <JapandiPillars />
      <JapandiRitual />
      <JapandiVoices />
      <JapandiCTA />
      <JapandiFooter />
    </main>
  );
}
