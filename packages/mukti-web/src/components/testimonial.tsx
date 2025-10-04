import { Star } from 'lucide-react';

import { Card, CardContent } from './ui/card';

export function Testimonial() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            What Totally Real Users Are Saying
          </h2>
          <p className="text-lg text-muted-foreground italic">
            Disclaimer: These testimonials are as real as unicorns.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star className="h-4 w-4 fill-current text-yellow-500" key={i} />
                ))}
              </div>
              <p className="text-muted-foreground mb-4">
                &quot;After using Mukti, my plants started growing faster and my coffee tasted
                better. Coincidence? I think not.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">PL</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Phil the Plant</p>
                  <p className="text-xs text-muted-foreground">Aspiring Ficus</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star className="h-4 w-4 fill-current text-yellow-500" key={i} />
                ))}
              </div>
              <p className="text-muted-foreground mb-4">
                &quot;Mukti asked me more questions than the Riddler. <br /> For once, I enjoyed
                it.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">BW</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Batman.</p>
                  <p className="text-xs text-muted-foreground">
                    Vigilante by Night, Debugger by Day
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star className="h-4 w-4 fill-current text-yellow-500" key={i} />
                ))}
              </div>
              <p className="text-muted-foreground mb-4">
                &quot;Mukti made me question everything. Including why I’m reading fake testimonials
                on a landing page.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">AI</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Anonymous Intern</p>
                  <p className="text-xs text-muted-foreground">Existential Overthinker</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
