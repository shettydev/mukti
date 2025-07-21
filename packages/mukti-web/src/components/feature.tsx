import { cn } from "@/lib/utils";
import {
  MessageCircle,
  Lightbulb,
  Target,
  Brain,
  BookOpen,
  Zap,
  HelpCircle,
  User,
} from "lucide-react";

export function Feature() {
  const features = [
    {
      title: "Socratic Questioning",
      description:
        "Instead of giving direct answers, Mukti asks thought-provoking questions that guide you to discover solutions yourself.",
      icon: <MessageCircle />,
    },
    {
      title: "Self-Discovery",
      description:
        "Unlock your own insights through guided exploration, making every breakthrough a personal achievement.",
      icon: <Lightbulb />,
    },
    {
      title: "Cognitive Resilience",
      description:
        "Build long-term mental agility and independent thinking skills that serve you beyond any AI interaction.",
      icon: <Target />,
    },
    {
      title: "Critical Thinking",
      description:
        "Develop the ability to analyze, evaluate, and synthesize information without relying on AI shortcuts.",
      icon: <Brain />,
    },
    {
      title: "Independent Learning",
      description:
        "Foster self-directed learning habits that make you a stronger, more autonomous thinker.",
      icon: <BookOpen />,
    },
    {
      title: "Mental Agility",
      description:
        "Train your mind to adapt, pivot, and solve problems creatively without external cognitive crutches.",
      icon: <Zap />,
    },
    {
      title: "Question Everything",
      description:
        "Cultivate healthy skepticism and the courage to challenge assumptions, even your own.",
      icon: <HelpCircle />,
    },
    {
      title: "Think for Yourself",
      description:
        "Break free from AI dependency and reclaim your intellectual autonomy and confidence.",
      icon: <User />,
    },
  ];

  return (
    <section id="features" className="py-24 bg-muted/20">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

const FeatureCard = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature dark:border-neutral-800",
        (index === 0 || index === 4) && "lg:border-l dark:border-neutral-800",
        index < 4 && "lg:border-b dark:border-neutral-800",
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-primary/5 dark:from-primary/10 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-primary/5 dark:from-primary/10 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-primary/70 dark:text-primary/60 group-hover/feature:text-primary transition-colors duration-200">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-primary transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800 dark:text-neutral-100">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};
