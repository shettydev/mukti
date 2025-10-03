import { FloatingNav } from './ui/floating-navbar';

export function Navbar() {
  return (
    <div className="relative w-full">
      <FloatingNav
        navItems={[
          { name: 'Features', link: '#features' },
          { name: 'How it Works', link: '#how-it-works' },
        ]}
      />
    </div>
  );
}
