import {
  BookOpen,
  Brain,
  HelpCircle,
  Lightbulb,
  MessageCircle,
  Target,
  User,
  Zap,
} from 'lucide-react';

import Squares from './reactbits/sqaures';

export function Feature() {
  const features = [
    {
      description:
        'Instead of giving direct answers, Mukti asks thought-provoking questions that guide you to discover solutions yourself.',
      icon: <MessageCircle />,
      title: 'Socratic Questioning',
    },
    {
      description:
        'Unlock your own insights through guided exploration, making every breakthrough a personal achievement.',
      icon: <Lightbulb />,
      title: 'Self-Discovery',
    },
    {
      description:
        'Build long-term mental agility and independent thinking skills that serve you beyond any AI interaction.',
      icon: <Target />,
      title: 'Cognitive Resilience',
    },
    {
      description:
        'Develop the ability to analyze, evaluate, and synthesize information without relying on AI shortcuts.',
      icon: <Brain />,
      title: 'Critical Thinking',
    },
    {
      description:
        'Foster self-directed learning habits that make you a stronger, more autonomous thinker.',
      icon: <BookOpen />,
      title: 'Independent Learning',
    },
    {
      description:
        'Train your mind to adapt, pivot, and solve problems creatively without external cognitive crutches.',
      icon: <Zap />,
      title: 'Mental Agility',
    },
    {
      description:
        'Cultivate healthy skepticism and the courage to challenge assumptions, even your own.',
      icon: <HelpCircle />,
      title: 'Question Everything',
    },
    {
      description:
        'Break free from AI dependency and reclaim your intellectual autonomy and confidence.',
      icon: <User />,
      title: 'Think for Yourself',
    },
  ];

  return (
    <section className="py-24 bg-muted/20 relative overflow-hidden" id="features">
      {/* Animated Squares background */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
        <Squares
          borderColor="rgba(255, 255, 255, 0.1)"
          direction="right"
          hoverFillColor="rgba(59, 130, 246, 0.1)"
          speed={0.5}
          squareSize={60}
        />
      </div>

      {/* Foreground content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Rediscover Your Cognitive Independence
          </h2>
          <p className="text-lg text-muted-foreground">
            While other AI tools do the thinking for you, Mukti challenges you to think deeper,
            question assumptions, and build lasting cognitive resilience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

const FeatureCard = ({
  description,
  icon,
  index,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  index: number;
  title: string;
}) => {
  return (
    <div className={`group relative ${index >= 4 ? 'hidden md:block' : 'block'}`}>
      {/* Gradient border wrapper */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm group-hover:blur-none animate-gradient-x" />

      {/* Main card */}
      <div className="relative h-full p-6 rounded-xl backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02] group-hover:border-white/30">
        {/* Animated light effect */}
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        </div>

        {/* Icon container */}
        <div className="relative z-10 mb-4 p-3 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 w-fit group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300">
          <div className="text-primary/80 group-hover:text-primary transition-colors duration-300 group-hover:scale-110 transform">
            {icon}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <h3 className="text-lg font-semibold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-300">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};
