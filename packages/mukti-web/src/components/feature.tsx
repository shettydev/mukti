'use client';
import { Brain, Key, MessageSquare, Sparkles } from 'lucide-react';

import { Spotlight } from './ui/spotlight-new';

export function Feature() {
  const features = [
    {
      description:
        'Stop accepting the first answer. Engage in rigorous dialogue that challenges your premises and uncovers the flaws in your logic.',
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'Socratic Inquiry',
    },
    {
      description:
        'Visualize the chaos of your mind. Map out complex arguments and logical flows in a space designed for deep, structural thinking.',
      icon: <Brain className="w-6 h-6" />,
      title: 'Cartography of Thought',
    },
    {
      description:
        "Don't rely on a single oracle. Switch between top-tier models like Claude 4.5 Sonnet and GPT-5.2 to stress-test your ideas against different intelligences.",
      icon: <Sparkles className="w-6 h-6" />,
      title: 'Cognitive Diversity',
    },
    {
      description:
        'Your thoughts are yours alone. Bring your own OpenRouter API key and rest assured that your cognitive data remains under your control.',
      icon: <Key className="w-6 h-6" />,
      title: 'Sovereign Data Control',
    },
  ];

  return (
    <section
      className="min-h-screen w-full bg-[#020617] relative overflow-hidden flex flex-col items-center justify-center py-24"
      id="features"
    >
      {/* Background Gradients */}
      <Spotlight duration={10} height={1500} side="left" width={300} />

      <div className="container mx-auto px-4 relative z-10 flex flex-col items-center">
        {/* Dome / Header Section */}
        <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center pt-16 pb-12">
          {/* The Curved Line/Dome Border */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] md:w-[70%] h-[250px] border-t border-slate-600/40 rounded-[100%] pointer-events-none bg-gradient-to-b from-slate-800/20 to-transparent shadow-[0_0_120px_-20px_rgba(255,255,255,0.1)]" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-black/50 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-slate-300">
              <Sparkles className="w-3 h-3 text-white" />
              Why Choose Mukti
            </div>

            <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-6 text-white text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
              Liberate Your Thinking
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
              {/* While most AI tools give you the answer. Mukti gives you the questions. <br /> */}
              Mukti empowers you to think better, faster, and more independently through intelligent
              conversations, visual thinking, and tailored insights.
            </p>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-7xl mt-8">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

const FeatureCard = ({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) => {
  return (
    <div className="group relative p-6 h-full rounded-2xl bg-[#0A0F1C]/80 border border-slate-800/50 hover:border-slate-700 transition-all duration-300 flex flex-col items-center text-center backdrop-blur-sm">
      {/* Ripple Icon Effect */}
      <div className="mb-8 relative mt-4">
        {/* Concentric Circles */}
        <div className="absolute inset-0 -m-4 border border-slate-800/60 rounded-full opacity-20 group-hover:opacity-100 transition-opacity duration-500 scale-110" />
        <div className="absolute inset-0 -m-8 border border-slate-800/40 rounded-full opacity-10 group-hover:opacity-100 transition-opacity duration-500 delay-75 scale-125" />

        <div className="w-16 h-16 rounded-full bg-[#0F1629] border border-slate-800 flex items-center justify-center relative z-10 group-hover:border-slate-600 transition-colors duration-300">
          <div className="text-slate-300 group-hover:text-white transition-colors duration-300">
            {icon}
          </div>
        </div>
      </div>

      <h3 className="text-lg font-medium mb-3 text-white">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed font-light px-2">{description}</p>
    </div>
  );
};
