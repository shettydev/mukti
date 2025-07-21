import { ArrowRight, Brain, Star, Users, Zap } from "lucide-react";
import Link from "next/link";
import { Particles } from "./magicui/particles";
import { Button } from "./ui/button";

export function Hero() {
  return (
    <div className="min-h-screen w-full bg-[#020617] relative overflow-hidden">
      {/* Dark Radial Glow Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(circle 300px at 50% 150px, #3e3e3e, transparent)`,
        }}
      />
      <Particles className="absolute inset-0 z-0" />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32 lg:py-48 relative z-10">
        <div className="mx-auto max-w-4xl text-center flex flex-col items-center">
          <div className="mb-6 sm:mb-8 inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs sm:text-sm animate-fade-in-up">
            <Zap className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-pulse" />
            AI that makes you smarter, not lazier
          </div>

          <h1 className="mb-4 sm:mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-tight animate-fade-in-up animation-delay-200">
            Think for Yourself,
            <br />
            <span className="bg-gradient-to-r from-primary via-purple-500 to-primary/60 bg-clip-text text-transparent animate-gradient">
              Not Through AI
            </span>
          </h1>

          <p className="mx-auto mb-6 sm:mb-8 max-w-2xl text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed px-4 sm:px-0 animate-fade-in-up animation-delay-400">
            Mukti is your AI mentor that uses the Socratic method to guide you
            toward your own insights. Break free from cognitive dependency and
            rediscover the power of independent thinking.
          </p>

          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:justify-center sm:items-center animate-fade-in-up animation-delay-600 w-full sm:w-auto">
            <Button
              size="lg"
              className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto"
              asChild
            >
              <Link href="#waitlist">
                Join the Liberation{" "}
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          <div className="mt-48 sm:mt-12 flex flex-col items-center justify-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm text-muted-foreground px-4 sm:px-0">
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center">
              <div className="flex items-center gap-2">
                <Brain className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>89% Report Better Thinking</span>
              </div>
              <span className="text-xs italic text-muted-foreground/70">
                (study conducted in my living room)
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center">
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>1000+ Early Users</span>
              </div>
              <span className="text-xs italic text-muted-foreground/70">
                (users so early, they haven&apos;t even signed up yet)
              </span>
            </div>

            <Link
              href="https://github.com/shettydev/mukti/stargazers"
              target="_blank"
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center hover:text-primary transition-colors"
            >
              <div className="flex items-center gap-2">
                <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-current text-yellow-500 flex-shrink-0" />
                <span>Star my project</span>
              </div>
              <span className="text-xs italic text-muted-foreground/70">
                (or I&apos;ll keep making bad puns in the code)
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
