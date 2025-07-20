import { ArrowRight, Brain, Star, Users, Zap } from "lucide-react";
import Link from "next/link";
import { Particles } from "./magicui/particles";
import { Button } from "./ui/button";

export function Hero() {
  return (
    <div className="min-h-screen w-full bg-[#020617] relative">
      {/* Dark Radial Glow Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(circle 500px at 50% 200px, #3e3e3e, transparent)`,
        }}
      />
      <Particles className="absolute inset-0 z-0" />

      <div className="w-full max-w-7xl mx-auto px-4 py-32 md:py-48 relative z-10">
        <div className="mx-auto max-w-4xl text-center flex flex-col items-center">
          <div className="mb-8 inline-flex items-center rounded-full border bg-muted px-3 py-1 text-sm animate-fade-in-up">
            <Zap className="mr-2 h-4 w-4 animate-pulse" />
            AI that makes you smarter, not lazier
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl animate-fade-in-up animation-delay-200">
            Think for Yourself,
            <br />
            <span className="bg-gradient-to-r from-primary via-purple-500 to-primary/60 bg-clip-text text-transparent animate-gradient">
              Not Through AI
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl animate-fade-in-up animation-delay-400">
            Mukti is your AI mentor that uses the Socratic method to guide you
            toward your own insights. Break free from cognitive dependency and
            rediscover the power of independent thinking.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center sm:items-center animate-fade-in-up animation-delay-600">
            <Button
              size="lg"
              className="text-lg px-8 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              asChild
            >
              <Link href="#waitlist">
                Join the Liberation{" "}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          <div className="mt-12 flex flex-col sm:flex-col items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span>89% Report Better Thinking</span>{" "}
              <span className="text-xs italic">
                (study conducted in my living room)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>1000+ Early Users</span>
              <span className="text-xs italic">
                (users so early, they haven’t even signed up yet)
              </span>
            </div>
            <Link
              href="https://github.com/shettydev/mukti/stargazers"
              target="_blank"
              className="flex items-center gap-2"
            >
              <Star className="h-4 w-4 fill-current text-yellow-500" />
              <span>Star my project</span>
              <span className="text-xs italic">
                (or I’ll keep making bad puns in the code)
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
