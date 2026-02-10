'use client';

import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="w-full px-6 py-12 md:px-12 bg-japandi-cream border-t border-japandi-sand/20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="text-japandi-stone/60 text-sm tracking-widest lowercase">
          © {new Date().getFullYear()} mukti
        </div>

        <div className="flex items-center gap-8">
          <Link
            className="text-japandi-stone/60 hover:text-japandi-terracotta text-sm tracking-widest uppercase transition-colors duration-300"
            href="#philosophy"
          >
            Mission
          </Link>
          <Link
            className="text-japandi-stone/60 hover:text-japandi-terracotta text-sm tracking-widest uppercase transition-colors duration-300"
            href="#join"
          >
            Waitlist
          </Link>
        </div>

        <div className="text-japandi-stone/40 text-sm tracking-widest">
          Crafted by{' '}
          <Link
            className="font-normal text-japandi-stone/60 hover:text-japandi-terracotta transition-colors"
            href="https://github.com/shettydev"
            target="_blank"
          >
            प्रतीक शेट्टी
          </Link>
        </div>
      </div>
    </footer>
  );
}
