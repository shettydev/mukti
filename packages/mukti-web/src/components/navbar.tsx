'use client';

import { FloatingNav } from './ui/floating-navbar';

export function Navbar() {
  return (
    <div className="relative w-full">
      <FloatingNav
        navItems={[
          { link: '#features', name: 'Features' },
          { link: '#how-it-works', name: 'How it Works' },
        ]}
        signInHref="/auth?tab=signin"
        signUpHref="/auth?tab=signup"
      />
    </div>
  );
}
