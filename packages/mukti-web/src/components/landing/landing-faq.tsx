'use client';

import { motion } from 'motion/react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    answer:
      "No — it's the opposite. Most AI tools give you answers instantly. Mukti uses the Socratic method to ask you questions that guide you toward your own answers. The AI is there to challenge your thinking, not replace it.",
    question: 'Is Mukti just another AI chatbot?',
  },
  {
    answer:
      "Mukti uses an adaptive scaffolding system with 5 levels. At the lowest level, it's pure Socratic questioning. If you're genuinely stuck and the system detects a knowledge gap, it gradually provides more support — but it never just hands you the answer. The goal is always to help you arrive at the insight yourself.",
    question: 'Will I ever get a direct answer?',
  },
  {
    answer:
      'Mukti offers a free tier with core features. You can also bring your own API key (BYOK) for AI providers like OpenRouter to unlock unlimited usage. Premium features will be available through a subscription.',
    question: 'Is it free to use?',
  },
  {
    answer:
      "Mukti connects to multiple AI providers through OpenRouter. You can use the default model or bring your own API key to choose your preferred model. The AI doesn't answer your questions — it generates the Socratic questions that challenge your thinking.",
    question: 'What AI model does Mukti use?',
  },
  {
    answer:
      "Your thinking sessions, canvases, and conversations are private to your account. API keys are encrypted at rest. We don't train on your data or share it with third parties. Your cognitive journey is yours alone.",
    question: 'Is my data private?',
  },
];

export default function LandingFaq() {
  return (
    <section className="relative w-full px-5 xs:px-6 py-20 sm:py-24 md:px-12 lg:py-32 bg-japandi-cream">
      <div className="mx-auto max-w-3xl">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span className="text-japandi-label block mb-4 tracking-[0.2em] text-japandi-sage">
            Questions
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-wide leading-tight text-japandi-stone">
            Frequently asked
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.2, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <Accordion className="w-full" collapsible type="single">
            {faqs.map((faq, index) => (
              <AccordionItem className="border-japandi-sand/30" key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-left text-base md:text-lg font-light tracking-wide text-japandi-stone hover:text-japandi-terracotta hover:no-underline py-5 [&[data-state=open]]:text-japandi-terracotta">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-base font-light leading-relaxed text-japandi-stone/70 pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
