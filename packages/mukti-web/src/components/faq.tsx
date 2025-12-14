import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

const faqs = [
  {
    answer:
      'While other AI tools give you direct answers, Mukti uses the Socratic method to ask questions that guide you to discover solutions yourself. This builds your critical thinking skills instead of creating dependency.',
    question: 'How is Mukti different from ChatGPT or Claude?',
    value: 'difference',
  },
  {
    answer:
      'Absolutely! Mukti excels at helping you debug code, plan architecture, and solve technical challenges by asking the right questions to guide your thinking process, rather than just providing code snippets.',
    question: 'Will Mukti work for technical problems like coding?',
    value: 'technical',
  },
  {
    answer:
      'Mukti is designed for people who want to grow their thinking abilities. If you need quick facts, traditional AI tools work fine. But if you want to become a better thinker and problem-solver, Mukti is your companion.',
    question: 'What if I just want a quick answer?',
    value: 'quick-answer',
  },
  {
    answer:
      'Instead of "Here\'s the solution," Mukti might ask "What assumptions are you making?" or "What would happen if you tried a different approach?" This iterative questioning helps you build understanding from the ground up.',
    question: 'How does the Socratic method actually work in practice?',
    value: 'socratic',
  },
  {
    answer:
      "We're currently in private beta with early users. Join the waitlist to be among the first to experience cognitive liberation when we launch publicly.",
    question: 'When will Mukti be available?',
    value: 'availability',
  },
];

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

        <Accordion
          className="mx-auto max-w-3xl rounded-2xl border bg-card/70 shadow-lg backdrop-blur"
          collapsible
          type="single"
        >
          {faqs.map((item) => (
            <AccordionItem className="px-6" key={item.value} value={item.value}>
              <AccordionTrigger className="text-lg">
                <span>{item.question}</span>
              </AccordionTrigger>
              <AccordionContent>
                <p>{item.answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
