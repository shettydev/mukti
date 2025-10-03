'use client';

import { Example } from '@/components/example';
import { FAQ } from '@/components/faq';
import { Feature } from '@/components/feature';
import { Footer } from '@/components/footer';
import { Hero } from '@/components/hero';
import { Navbar } from '@/components/navbar';
import { Proof } from '@/components/proof';
import { Testimonial } from '@/components/testimonial';
import { Waitlist } from '@/components/waitlist';

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

      {/* FAQ Section */}
      <FAQ />

      {/* Waitlist Section */}
      <Waitlist />

      {/* Footer */}
      <Footer />
    </div>
  );
}
