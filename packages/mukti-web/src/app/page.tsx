'use client';

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
    <div className="min-h-screen bg-background">
      {/* Navbar Section */}
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <Feature />

      {/* How It Works Section */}
      <Example />

      {/* Testimonials Section */}
      <Testimonial />

      {/* Enhanced Social Proof */}
      <Proof />

      {/* Pricing Section */}
      <Pricing />

      {/* FAQ Section */}
      <Faq />

      {/* Footer */}
      <Footer />
    </div>
  );
}
