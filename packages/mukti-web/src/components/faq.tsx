import { Card, CardContent } from './ui/card';

export function FAQ() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about Mukti and cognitive independence
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-3">
                How is Mukti different from ChatGPT or Claude?
              </h3>
              <p className="text-muted-foreground">
                While other AI tools give you direct answers, Mukti uses the Socratic method to ask
                questions that guide you to discover solutions yourself. This builds your critical
                thinking skills instead of creating dependency.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-3">
                Will Mukti work for technical problems like coding?
              </h3>
              <p className="text-muted-foreground">
                Absolutely! Mukti excels at helping you debug code, plan architecture, and solve
                technical challenges by asking the right questions to guide your thinking process,
                rather than just providing code snippets.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-3">What if I just want a quick answer?</h3>
              <p className="text-muted-foreground">
                Mukti is designed for people who want to grow their thinking abilities. If you need
                quick facts, traditional AI tools work fine. But if you want to become a better
                thinker and problem-solver, Mukti is your companion.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-3">
                How does the Socratic method actually work in practice?
              </h3>
              <p className="text-muted-foreground">
                Instead of &quot;Here&apos;s the solution,&quot; Mukti might ask &quot;What
                assumptions are you making?&quot; or &quot;What would happen if you tried a
                different approach?&quot; This iterative questioning helps you build understanding
                from the ground up.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-3">When will Mukti be available?</h3>
              <p className="text-muted-foreground">
                We&apos;re currently in private beta with early users. Join the waitlist to be among
                the first to experience cognitive liberation when we launch publicly.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
