import {
  ArrowRight,
  Brain,
  Lightbulb,
  MessageCircle,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] animate-fade-in" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />

      {/* Floating brain icons */}
      <div className="absolute top-20 left-10 text-primary/20 animate-float">
        <Brain className="h-8 w-8" />
      </div>
      <div className="absolute top-40 right-20 text-primary/20 animate-float animation-delay-1000">
        <Lightbulb className="h-6 w-6" />
      </div>
      <div className="absolute bottom-40 left-20 text-primary/20 animate-float animation-delay-2000">
        <MessageCircle className="h-7 w-7" />
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 py-32 md:py-48">
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
              <a href="#waitlist">
                Join the Liberation{" "}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </a>
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
    </section>
  );
}
