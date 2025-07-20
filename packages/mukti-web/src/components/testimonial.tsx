import { Star } from "lucide-react";
import { Card, CardContent } from "./ui/card";

export function Testimonial() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            What Early Users Are Saying
          </h2>
          <p className="text-lg text-muted-foreground">
            See how Mukti is already transforming the way people think and learn
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-current text-yellow-500"
                  />
                ))}
              </div>
              <p className="text-muted-foreground mb-4">
                &quot;Finally, an AI that doesn&apos;t make me lazy!
                Mukti&apos;s questions push me to think deeper about my coding
                problems. I&apos;m solving bugs I would&apos;ve just asked
                ChatGPT to fix.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">AS</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Alex Singh</p>
                  <p className="text-xs text-muted-foreground">
                    Software Engineer
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-current text-yellow-500"
                  />
                ))}
              </div>
              <p className="text-muted-foreground mb-4">
                &quot;As a researcher, I was shocked at how dependent I&apos;d
                become on AI for brainstorming. Mukti helped me rediscover my
                own creative process through strategic questioning.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">MJ</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Dr. Maria Johnson</p>
                  <p className="text-xs text-muted-foreground">
                    Research Scientist
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-current text-yellow-500"
                  />
                ))}
              </div>
              <p className="text-muted-foreground mb-4">
                &quot;Mukti is like having Socrates as your coding mentor.
                Instead of giving me answers, it guides me to better questions.
                My problem-solving skills have genuinely improved.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">JC</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Jamie Chen</p>
                  <p className="text-xs text-muted-foreground">
                    Product Designer
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
