"use client";

import { Example } from "@/components/example";
import { FAQ } from "@/components/faq";
import { Feature } from "@/components/feature";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { Proof } from "@/components/proof";
import { Testimonial } from "@/components/testimonial";
import { Waitlist } from "@/components/waitlist";
import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual waitlist submission
    setIsSubmitted(true);
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar Section */}
      <Navbar
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isMobileMenuOpen={isMobileMenuOpen}
      />

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
      <Waitlist
        email={email}
        handleWaitlistSubmit={handleWaitlistSubmit}
        isSubmitted={isSubmitted}
        setEmail={setEmail}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
