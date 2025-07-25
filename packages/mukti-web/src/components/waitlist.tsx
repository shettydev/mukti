import { Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState } from "react";
import { useWaitlist } from "@/lib/hooks/useWaitlist";
import { BackgroundBeams } from "./ui/background-beams";
import Dither from "./reactbits/dither";
import GlassSurface from "./reactbits/glass-surface";
import Iridescence from "./reactbits/iridescence";

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

  return (
    <section
      id="waitlist"
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
    >
      <Iridescence
        color={[0.5, 0.1, 0.22]}
        mouseReact={false}
        amplitude={0.1}
        speed={1.0}
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
      />

      <div className="container mx-auto px-4 relative z-10 max-w-2xl text-center">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Ready to Think Again?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join the waitlist and be among the first to experience AI mentorship
            that makes you smarter, not dependent.
          </p>

          {!isSubmitted ? (
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm bg-background/95">
              <CardContent className="p-8">
                <form onSubmit={handleWaitlistSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-left block">
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
                      className="transition-all duration-200 focus:scale-105"
                    />

                    {/* Error Message */}
                    {error && (
                      <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Existing User Message */}
                    {isExisting && !error && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                        <Check className="h-4 w-4" />
                        <span>
                          You&apos;re already on the waitlist! We&apos;ll notify
                          you when Mukti is ready.
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isProcessing || isExisting}
                    className="w-full cursor-pointer hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:hover:scale-100 disabled:cursor-not-allowed"
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
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Be the first to break free from AI dependency. No spam, just
                    liberation.
                  </p>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-green-900/30 animate-fade-in-up">
              <CardContent className="p-8 text-center">
                <Check className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4 animate-bounce" />
                <h3 className="text-xl font-semibold mb-2 text-green-900 dark:text-green-100">
                  Welcome to the Liberation!
                </h3>
                <p className="text-green-700 dark:text-green-200 text-base">
                  You&apos;re on the waitlist. We&apos;ll notify you when Mukti
                  is ready to challenge your thinking.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <GlassSurface
          width={300}
          height={200}
          borderRadius={24}
          className="my-custom-class"
        >
          <h2>Glass Surface Content</h2>
        </GlassSurface>
      </div>
    </section>
  );
}
