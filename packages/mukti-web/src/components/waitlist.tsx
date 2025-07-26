import { Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useMemo, useState } from "react";
import { useWaitlist } from "@/lib/hooks/useWaitlist";
import GlassSurface from "./reactbits/glass-surface";
import Iridescence from "./reactbits/iridescence";
import BlurText from "./reactbits/blur-text";
import ShinyText from "./reactbits/shiny-text";
import AnimatedContent from "./reactbits/animated-content";
import { RainbowButton } from "./magicui/rainbow-button";

export function Waitlist() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    isLoading,
    isSubmitted,
    error,
    isExisting,
    checkEmail,
    joinWaitlist,
    reset,
  } = useWaitlist();

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return;

    // Set immediate loading state
    setIsSubmitting(true);

    try {
      // First check if email exists
      const exists = await checkEmail(email);

      if (!exists) {
        // If email doesn't exist, try to join waitlist
        const success = await joinWaitlist(email);
        if (success) {
          setEmail("");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check email on blur for better UX
  const handleEmailBlur = async () => {
    if (email.trim() && email.includes("@")) {
      await checkEmail(email);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Reset states when user starts typing again
    if (error || isExisting) {
      reset();
    }
  };

  // Combined loading state for immediate feedback
  const isProcessing = isSubmitting || isLoading;

  const iridescence = useMemo(
    () => (
      <Iridescence
        color={[0.5, 0.1, 0.22]}
        mouseReact={false}
        amplitude={0.15}
        speed={0.8}
        className="absolute inset-0 w-full h-full z-0"
      />
    ),
    [],
  );

  return (
    <section
      id="waitlist"
      className="relative w-full min-h-screen grid place-items-center overflow-hidden"
    >
      {/* Iridescence Background */}
      {iridescence}

      {/* Top Gradient Overlay - Dark to Transparent */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#020617] via-[#020617]/80 to-transparent z-10 pointer-events-none" />

      {/* Bottom Gradient Overlay - Transparent to Dark */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent z-10 pointer-events-none" />

      <div className="container mx-auto px-4 relative z-20 max-w-3xl">
        <AnimatedContent distance={50} direction="vertical" duration={1}>
          <div className="text-center mb-12">
            <BlurText
              text="Ready to Think Again?"
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-white"
              animateBy="words"
              delay={100}
              stepDuration={0.5}
            />

            <BlurText
              text="Join the waitlist and be among the first to experience AI mentorship that makes you smarter, not dependent."
              className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed mt-44"
              animateBy="words"
              delay={50}
              stepDuration={0.3}
            />
          </div>

          {!isSubmitted ? (
            <GlassSurface
              width="100%"
              height="auto"
              borderRadius={24}
              className="max-w-lg mx-auto"
            >
              <Card className="border-0 bg-transparent shadow-none">
                <CardContent className="p-8">
                  <form onSubmit={handleWaitlistSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-left block text-white/90 text-base font-medium"
                      >
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={handleEmailChange}
                        onBlur={handleEmailBlur}
                        required
                        disabled={isProcessing}
                        className="bg-white/10 border-white/20 text-white placeholder-white/60 focus:border-white/40 focus:ring-white/20 transition-all duration-200 backdrop-blur-sm"
                      />

                      {/* Error Message */}
                      {error && (
                        <div className="flex items-center gap-2 text-sm text-red-400 mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <span>{error}</span>
                        </div>
                      )}

                      {/* Existing User Message */}
                      {isExisting && !error && (
                        <div className="flex items-center gap-2 text-sm text-green-400 mt-2">
                          <Check className="h-4 w-4" />
                          <span>
                            You&apos;re already on the waitlist! We&apos;ll
                            notify you when Mukti is ready.
                          </span>
                        </div>
                      )}
                    </div>
                    <RainbowButton
                      type="submit"
                      size="lg"
                      disabled={isProcessing || isExisting}
                      className="w-full"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isSubmitting
                            ? "Processing..."
                            : isExisting
                              ? "Checking..."
                              : "Joining..."}
                        </>
                      ) : isExisting ? (
                        "Already on Waitlist"
                      ) : (
                        "Join the Liberation Waitlist"
                      )}
                    </RainbowButton>
                    <p className="text-xs text-white/70 text-center leading-relaxed">
                      Be the first to break free from AI dependency. No spam,
                      just liberation.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </GlassSurface>
          ) : (
            <GlassSurface
              width="100%"
              height="auto"
              borderRadius={24}
              brightness={80}
              opacity={0.2}
              blur={15}
              backgroundOpacity={0.1}
              className="max-w-lg mx-auto"
            >
              <Card className="border-0 bg-transparent shadow-none">
                <CardContent className="p-8 text-center">
                  <Check className="h-16 w-16 text-green-400 mx-auto mb-6 animate-bounce" />

                  <ShinyText
                    text="Welcome to the Liberation!"
                    className="text-2xl font-bold mb-4 text-white"
                    speed={3}
                  />

                  <BlurText
                    text="You're on the waitlist. We'll notify you when Mukti is ready to challenge your thinking."
                    className="text-white/90 text-base leading-relaxed"
                    animateBy="words"
                    delay={30}
                    stepDuration={0.2}
                  />
                </CardContent>
              </Card>
            </GlassSurface>
          )}
        </AnimatedContent>
      </div>
    </section>
  );
}
