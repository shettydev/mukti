import { ArrowRight, Brain, Star, Users, Zap } from "lucide-react";
import Link from "next/link";
import DarkVeil from "./reactbits/dark-veil";
import { Button } from "./ui/button";
import BlurText from "./reactbits/blur-text";
import ShinyText from "./reactbits/shiny-text";
import AnimatedContent from "./reactbits/animated-content";

export function Hero() {
  return (
    <div className="min-h-screen w-full bg-[#020617] relative overflow-hidden">
      {/* DarkVeil Animated Background */}
      <div className="absolute inset-0 z-0">
        <DarkVeil />
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32 lg:py-48 relative z-10">
        <div className="mx-auto max-w-4xl text-center flex flex-col items-center">
          <AnimatedContent
            distance={30}
            direction="vertical"
            duration={0.8}
            delay={0.2}
          >
            <div className="mb-6 sm:mb-8 inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs sm:text-sm">
              <Zap className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-pulse" />
              <ShinyText
                text="AI that makes you smarter, not lazier"
                className="text-foreground"
                speed={4}
              />
            </div>
          </AnimatedContent>

          <AnimatedContent
            distance={50}
            direction="vertical"
            duration={1}
            delay={0.4}
          >
            <BlurText
              text="Think for Yourself,"
              className="mb-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-tight text-white"
              animateBy="words"
              delay={150}
              stepDuration={0.6}
            />
          </AnimatedContent>

          <AnimatedContent
            distance={50}
            direction="vertical"
            duration={1}
            delay={0.6}
          >
            <BlurText
              text="Not Through AI"
              className="mb-4 sm:mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-tight bg-gradient-to-r from-primary via-purple-500 to-primary/60 bg-clip-text text-transparent"
              animateBy="words"
              delay={150}
              stepDuration={0.6}
            />
          </AnimatedContent>

          <AnimatedContent
            distance={40}
            direction="vertical"
            duration={0.9}
            delay={0.8}
          >
            <BlurText
              text="Mukti is your AI mentor that uses the Socratic method to guide you toward your own insights. Break free from cognitive dependency and rediscover the power of independent thinking."
              className="mx-auto mb-6 sm:mb-8 max-w-2xl text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed px-4 sm:px-0"
              animateBy="words"
              delay={50}
              stepDuration={0.3}
            />
          </AnimatedContent>

          <AnimatedContent
            distance={30}
            direction="vertical"
            duration={0.8}
            delay={1.2}
          >
            <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:justify-center sm:items-center w-full sm:w-auto">
              <Button
                size="lg"
                className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto group"
                asChild
              >
                <Link href="#waitlist">
                  Join the Liberation{" "}
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </AnimatedContent>

          <AnimatedContent
            distance={20}
            direction="vertical"
            duration={0.8}
            delay={1.6}
          >
            <div className="mt-48 sm:mt-12 flex flex-col items-center justify-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm text-muted-foreground px-4 sm:px-0">
              <div
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center opacity-0 animate-fade-in-up"
                style={{ animationDelay: "2s", animationFillMode: "forwards" }}
              >
                <div className="flex items-center gap-2">
                  <Brain className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <ShinyText
                    text="89% Report Better Thinking"
                    className="text-muted-foreground"
                    speed={5}
                  />
                </div>
                <span className="text-xs italic text-muted-foreground/70">
                  (study conducted in my living room)
                </span>
              </div>

              <div
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center opacity-0 animate-fade-in-up"
                style={{
                  animationDelay: "2.2s",
                  animationFillMode: "forwards",
                }}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <ShinyText
                    text="1000+ Early Users"
                    className="text-muted-foreground"
                    speed={5}
                  />
                </div>
                <span className="text-xs italic text-muted-foreground/70">
                  (users so early, they haven&apos;t even signed up yet)
                </span>
              </div>

              <Link
                href="https://github.com/shettydev/mukti/stargazers"
                target="_blank"
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center hover:text-primary transition-colors opacity-0 animate-fade-in-up"
                style={{
                  animationDelay: "2.4s",
                  animationFillMode: "forwards",
                }}
              >
                <div className="flex items-center gap-2">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-current text-yellow-500 flex-shrink-0" />
                  <ShinyText
                    text="Star my project"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    speed={5}
                  />
                </div>
                <span className="text-xs italic text-muted-foreground/70">
                  (or I&apos;ll keep making bad puns in the code)
                </span>
              </Link>
            </div>
          </AnimatedContent>
        </div>
      </div>
    </div>
  );
}
