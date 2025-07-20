import { MenuIcon, XIcon } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import Link from "next/link";

export function Navbar({
  setIsMobileMenuOpen,
  isMobileMenuOpen,
}: {
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  isMobileMenuOpen: boolean;
}) {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold">mukti</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="#features"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            How it Works
          </Link>
          <Link
            href="#waitlist"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Join Waitlist
          </Link>
          <ThemeToggle />
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center space-x-2">
          <ThemeToggle />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden"
          >
            {isMobileMenuOpen ? (
              <XIcon className="h-5 w-5" />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto py-4 space-y-4">
            <Link
              href="#features"
              className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              How it Works
            </Link>
            <Link
              href="#waitlist"
              className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Join Waitlist
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
