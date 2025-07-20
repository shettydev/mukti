import { Check } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function Waitlist({
  isSubmitted,
  email,
  setEmail,
  handleWaitlistSubmit,
}: {
  isSubmitted: boolean;
  email: string;
  setEmail: (email: string) => void;
  handleWaitlistSubmit: React.FormEventHandler<HTMLFormElement>;
}) {
  return (
    <section id="waitlist" className="py-24">
      <div className="container mx-auto px-4">
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
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="text-center transition-all duration-200 focus:scale-105"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Join the Liberation Waitlist
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Be the first to break free from AI dependency. No spam, just
                    liberation.
                  </p>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-primary/5 animate-fade-in-up">
              <CardContent className="p-8 text-center">
                <Check className="h-12 w-12 text-green-500 mx-auto mb-4 animate-bounce" />
                <h3 className="text-xl font-semibold mb-2">
                  Welcome to the Liberation!
                </h3>
                <p className="text-muted-foreground">
                  You&apos;re on the waitlist. We&apos;ll notify you when Mukti
                  is ready to challenge your thinking.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
