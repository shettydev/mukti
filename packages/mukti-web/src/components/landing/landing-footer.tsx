'use client';

import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="w-full px-5 xs:px-6 py-10 sm:py-12 md:px-12 bg-japandi-cream border-t border-japandi-sand/20">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-8 md:grid md:grid-cols-3 md:items-center">
        <div className="text-japandi-stone/60 text-sm tracking-widest lowercase md:justify-self-start">
          © {new Date().getFullYear()} mukti
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
          <Link
            className="text-japandi-stone/60 hover:text-japandi-terracotta text-sm tracking-widest uppercase transition-colors duration-300"
            href="#philosophy"
          >
            Philosophy
          </Link>
          <Link
            className="text-japandi-stone/60 hover:text-japandi-terracotta text-sm tracking-widest uppercase transition-colors duration-300"
            href="#demo"
          >
            Demo
          </Link>
          <Link
            className="text-japandi-stone/60 hover:text-japandi-terracotta text-sm tracking-widest uppercase transition-colors duration-300"
            href="/auth"
          >
            Sign Up
          </Link>
          <Link
            className="text-japandi-stone/60 hover:text-japandi-terracotta text-sm tracking-widest uppercase transition-colors duration-300"
            href="https://github.com/shettydev/mukti"
            target="_blank"
          >
            GitHub
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-japandi-stone/40 text-xs tracking-widest md:justify-self-end">
          <span>
            Crafted by{' '}
            <Link
              className="font-normal text-japandi-stone/60 hover:text-japandi-terracotta transition-colors"
              href="https://github.com/shettydev"
              target="_blank"
            >
              प्रतीक शेट्टी
            </Link>
          </span>
          <span className="hidden md:inline text-japandi-sand/60">|</span>
          <Link className="hover:text-japandi-terracotta transition-colors" href="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-japandi-terracotta transition-colors" href="/terms">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
