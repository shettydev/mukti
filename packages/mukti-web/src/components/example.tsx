import { Card, CardContent } from "./ui/card";

export function Example() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            The Anti-Autopilot Approach
          </h2>
          <p className="text-lg text-muted-foreground">
            Mukti doesn&apos;t replace your thinking—it enhances it through
            iterative dialogue and strategic questioning.
          </p>
        </div>

        <div className="mx-auto max-w-4xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Ask Better Questions
                  </h3>
                  <p className="text-muted-foreground">
                    Instead of &quot;What&apos;s the answer?&quot;, Mukti helps
                    you ask &quot;What&apos;s the real problem?&quot;
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Explore Perspectives
                  </h3>
                  <p className="text-muted-foreground">
                    Challenge your assumptions and consider alternative angles
                    through guided dialogue.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Build Understanding
                  </h3>
                  <p className="text-muted-foreground">
                    Develop deep, personal insights that stick because you
                    discovered them yourself.
                  </p>
                </div>
              </div>
            </div>

            <Card className="bg-muted/30 border-0">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="bg-background rounded-lg p-4 border">
                    <p className="text-sm font-medium text-primary">You:</p>
                    <p className="text-sm mt-1">
                      &quot;I can&apos;t focus while studying. Any advice?&quot;
                    </p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-4 border">
                    <p className="text-sm font-medium text-primary">Mukti:</p>
                    <p className="text-sm mt-1">
                      &quot;What usually distracts you during study sessions?
                      Have you tried breaking your study time into shorter
                      intervals?&quot;
                    </p>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">
                    Iterative dialogue continues...
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
