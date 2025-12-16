'use client';

import { Bot, RefreshCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

import { Button } from './ui/button';
import { Iphone } from './ui/iphone';
import { Spotlight } from './ui/spotlight-new';
import { TextGenerateEffect } from './ui/text-generate-effect';

const SCENARIOS = [
  {
    conversation: [
      {
        role: 'user',
        text: "I can't seem to focus on my history essay. It's boring.",
      },
      {
        role: 'ai',
        text: "Is it the topic itself that bores you, or the way you're approaching it? What's the specific question you're trying to answer in the essay?",
      },
      {
        role: 'user',
        text: "It's about the industrial revolution. Just feels like listing dates.",
      },
      {
        role: 'ai',
        text: 'Dates are just markers. Focus on the disruption. Imagine being a weaver whose 30 years of skill became worthless overnight. How does that anger shape the politics we see today?',
      },
    ],
    description: 'Move beyond surface-level answers to true understanding.',
    id: 'deep-learning',
    title: 'Deep Learning',
  },
  {
    conversation: [
      {
        role: 'user',
        text: 'I should probably quit my job and start a startup.',
      },
      {
        role: 'ai',
        text: "That's a big leap. What specific frustration is pushing you away from your current role, and what specific pull does a startup have for you?",
      },
      {
        role: 'user',
        text: 'I hate the bureaucracy. I want to build things fast.',
      },
      {
        role: 'ai',
        text: 'Speed is one factor. But startups also require handling uncertainty and non-building tasks like sales. Are you running towards building, or running away from meetings?',
      },
    ],
    description: 'Weigh options with clarity and reduced bias.',
    id: 'decision-making',
    title: 'Decision Making',
  },
  {
    conversation: [
      {
        role: 'user',
        text: 'This react component is re-rendering too much. I need to memoize everything.',
      },
      {
        role: 'ai',
        text: "Memoization masks the symptom. Why are the props changing in the first place? Let's trace the state updates triggering these renders.",
      },
      {
        role: 'user',
        text: "It's the parent passing a new object every time.",
      },
      {
        role: 'ai',
        text: "Exactly. Fix the unstable reference at the source, and you won't need to patch the cracks with useMemo downstream.",
      },
    ],
    description: 'Debug your thought process, not just your code.',
    id: 'coding',
    title: 'Technical Problem Solving',
  },
];

export function Example() {
  const [activeScenarioIndex, setActiveScenarioIndex] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<Record<string, string>[]>([]);

  const scenario = SCENARIOS[activeScenarioIndex];

  // Reset conversation when scenario changes
  useEffect(() => {
    setVisibleMessages([]);

    const timeouts: NodeJS.Timeout[] = [];
    let cumulativeDelay = 0;

    scenario.conversation.forEach((msg, index) => {
      // User messages appear faster, AI messages take time to "think"
      const delay = index === 0 ? 500 : 2500;
      cumulativeDelay += delay;

      const timeout = setTimeout(() => {
        setVisibleMessages((prev) => [...prev, msg]);
      }, cumulativeDelay);

      timeouts.push(timeout);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [activeScenarioIndex, scenario.conversation]);

  const handleNextScenario = () => {
    setActiveScenarioIndex((prev) => (prev + 1) % SCENARIOS.length);
  };

  return (
    <section
      className="min-h-screen w-full py-24 bg-[#020617] flex items-center justify-center relative overflow-hidden"
      id="example"
    >
      <Spotlight side="right" />
      {/* Background Decoration */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column: Context */}
          <div className="space-y-6 lg:space-y-8 max-w-xl order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <RefreshCcw className="w-3 h-3" />
              <span>Experience the Difference</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Not Just Answers. <br />
              <span className="text-primary">True Insight.</span>
            </h2>

            <div className="text-base lg:text-lg text-muted-foreground leading-relaxed space-y-4">
              <p>
                Most AI tools act like search engines, giving you direct answers that bypass
                critical thinking.
              </p>
              <p>
                Mukti acts like a mentor, challenging your assumptions and guiding you to discover
                the solution yourself.
              </p>
            </div>

            {/* Scenario Card - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  Current Scenario: {scenario.title}
                </h4>
                <p className="text-sm text-muted-foreground">{scenario.description}</p>
              </div>

              <Button
                className="w-fit gap-2 hover:scale-105 transition-transform"
                onClick={handleNextScenario}
                size="lg"
              >
                Try Another Scenario <RefreshCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Right Column: Phone + Mobile Controls */}
          <div className="relative order-1 lg:order-2 flex flex-col items-center">
            {/* Device Mockup */}
            <Iphone className="w-full max-w-[320px] sm:max-w-[360px] mx-auto z-10">
              <div className="flex flex-col h-full bg-[#0F1629] justify-center">
                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-none flex flex-col justify-center">
                  <AnimatePresence mode="popLayout">
                    {visibleMessages.map((msg, idx) => (
                      <motion.div
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        key={`${activeScenarioIndex}-${idx}`}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 shadow-sm ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-tr-none py-3'
                              : 'bg-slate-800/80 text-slate-200 rounded-tl-none border border-slate-700/50 pb-3'
                          }`}
                        >
                          {msg.role === 'ai' ? (
                            <div className="text-sm">
                              <TextGenerateEffect
                                className="text-sm font-normal text-slate-200"
                                duration={0.7}
                                words={msg.text}
                              />
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </Iphone>

            {/* Blob glow behind phone */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[80%] bg-blue-500/20 blur-[80px] -z-10 rounded-full opacity-50" />

            {/* Mobile Controls - Below phone on mobile only */}
            <div className="flex lg:hidden flex-col items-center gap-4 mt-8 w-full max-w-[320px]">
              <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm w-full">
                <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2 text-sm">
                  <Bot className="w-4 h-4 text-primary" />
                  {scenario.title}
                </h4>
                <p className="text-xs text-muted-foreground">{scenario.description}</p>
              </div>

              <Button
                className="w-full gap-2 hover:scale-105 transition-transform"
                onClick={handleNextScenario}
                size="lg"
              >
                Try Another Scenario <RefreshCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
