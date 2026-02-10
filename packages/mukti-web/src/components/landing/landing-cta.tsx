'use client';

import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

type SubmissionState = 'already_enrolled' | 'error' | 'idle' | 'loading' | 'success';

export default function LandingCTA() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<SubmissionState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist/join`, {
        body: JSON.stringify({ email }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setState('success');
        setEmail('');
      } else if (response.status === 409) {
        setState('already_enrolled');
      } else {
        setState('error');
        setErrorMessage(data.error?.message || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error(error);
      setState('error');
      setErrorMessage('Network error. Please check your connection and try again.');
    }
  };

  const resetState = () => {
    setState('idle');
    setEmail('');
    setErrorMessage('');
  };

  return (
    <section className="relative w-full px-6 py-24 md:px-12 lg:py-32 bg-japandi-sand/30" id="join">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span className="text-japandi-sage text-japandi-label tracking-[0.2em] block mb-6">
            Early Access
          </span>
          <h2 className="text-japandi-stone text-4xl md:text-5xl lg:text-6xl font-light tracking-wide leading-tight mb-6">
            Be the first to use Mukti
          </h2>
          <p className="text-japandi-stone/80 text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto mb-12">
            Join the waitlist for early access. No spoon-feeding included. Just pure cognitive
            liberation.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {state === 'idle' || state === 'loading' || state === 'error' ? (
            <motion.form
              className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-xl mx-auto"
              exit={{ opacity: 0, scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              key="form"
              onSubmit={handleSubmit}
              transition={{ delay: 0.2, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <input
                className="w-full md:w-auto flex-1 px-6 py-4 bg-japandi-cream border border-japandi-stone/10 rounded-sm text-japandi-stone placeholder:text-japandi-stone/40 focus:outline-none focus:border-japandi-terracotta transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={state === 'loading'}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                type="email"
                value={email}
              />
              <button
                className="w-full md:w-auto px-8 py-4 bg-japandi-terracotta text-japandi-cream font-medium tracking-wide rounded-sm hover:bg-japandi-timber transition-colors duration-300 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-japandi-terracotta cursor-pointer"
                disabled={state === 'loading'}
                type="submit"
              >
                {state === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    <span>Join Waitlist</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto py-12"
              exit={{ opacity: 0, scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.9 }}
              key="result"
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <motion.div
                  animate={{ rotate: 0, scale: 1 }}
                  initial={{ rotate: -180, scale: 0 }}
                  transition={{ delay: 0.1, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <CheckCircle2
                    className={`w-16 h-16 mx-auto mb-6 ${
                      state === 'success' ? 'text-japandi-sage' : 'text-japandi-terracotta'
                    }`}
                  />
                </motion.div>

                <motion.h3
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl md:text-4xl font-light text-japandi-stone mb-4 tracking-wide"
                  initial={{ opacity: 0, y: 10 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  {state === 'success' ? "You're on the list" : "You're already on the list"}
                </motion.h3>

                <motion.p
                  animate={{ opacity: 1, y: 0 }}
                  className="text-japandi-stone/70 text-lg font-light leading-relaxed max-w-lg mx-auto"
                  initial={{ opacity: 0, y: 10 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  {state === 'success'
                    ? "We'll be in touch soon. Get ready to liberate your thinking."
                    : "We've got you covered. No need to sign up again."}
                </motion.p>

                <motion.button
                  animate={{ opacity: 1 }}
                  className="mt-8 text-sm uppercase tracking-widest text-japandi-terracotta hover:text-japandi-timber transition-colors duration-300 border-b border-transparent hover:border-japandi-timber pb-0.5"
                  initial={{ opacity: 0 }}
                  onClick={resetState}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  type="button"
                >
                  {state === 'success' ? 'Register another email' : 'Try another email'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {state === 'error' && errorMessage && (
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="text-japandi-terracotta text-sm mt-4"
            initial={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {errorMessage}
          </motion.p>
        )}

        {(state === 'idle' || state === 'loading' || state === 'error') && (
          <motion.p
            className="text-japandi-stone/50 text-sm mt-6"
            initial={{ opacity: 0 }}
            transition={{ delay: 0.4, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1 }}
          >
            We respect your attention. No spam, ever.
          </motion.p>
        )}
      </div>
    </section>
  );
}
