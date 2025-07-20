import { Lightbulb, MessageCircle, Target } from "lucide-react";
import { Card, CardContent } from "./ui/card";

export function Feature() {
  return (
    <section id="features" className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Rediscover Your Cognitive Independence
          </h2>
          <p className="text-lg text-muted-foreground">
            While other AI tools do the thinking for you, Mukti challenges you
            to think deeper, question assumptions, and build lasting cognitive
            resilience.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group">
            <CardContent className="p-8">
              <MessageCircle className="h-12 w-12 text-primary mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-semibold mb-3">
                Socratic Questioning
              </h3>
              <p className="text-muted-foreground">
                Instead of giving direct answers, Mukti asks thought-provoking
                questions that guide you to discover solutions yourself.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group animation-delay-200">
            <CardContent className="p-8">
              <Lightbulb className="h-12 w-12 text-primary mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-semibold mb-3">Self-Discovery</h3>
              <p className="text-muted-foreground">
                Unlock your own insights through guided exploration, making
                every breakthrough a personal achievement.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group animation-delay-400">
            <CardContent className="p-8">
              <Target className="h-12 w-12 text-primary mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-semibold mb-3">
                Cognitive Resilience
              </h3>
              <p className="text-muted-foreground">
                Build long-term mental agility and independent thinking skills
                that serve you beyond any AI interaction.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
