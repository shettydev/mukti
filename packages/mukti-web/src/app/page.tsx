'use client';

import { Cta } from '@/components/cta';
import { Example } from '@/components/example';
import { FAQ } from '@/components/faq';
import { Feature } from '@/components/feature';
import { Footer } from '@/components/footer';
import { Hero } from '@/components/hero';
import { Navbar } from '@/components/navbar';
import { Pricing } from '@/components/pricing';
import { Proof } from '@/components/proof';
import { Testimonial } from '@/components/testimonial';

// Alias FAQ to satisfy PascalCase linting
const Faq = FAQ;

export default function Home() {
  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Navbar Section */}
      <Navbar />

      {/* Hero Section - Product showcase with carousel */}
      <Hero />

      {/* Social Proof - The problem statement */}
      <Proof />

      {/* Features Section - The solution */}
      <Feature />

      {/* How It Works Section - Interactive demo */}
      <Example />

      {/* Testimonials Section */}
      <Testimonial />

      {/* Pricing Section */}
      <Pricing />

      {/* FAQ Section */}
      <Faq />

      {/* Final CTA */}
      <Cta />

      {/* Footer */}
      <Footer />
    </div>
  );
}
