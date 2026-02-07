import type { CSSProperties } from 'react';

import styles from './page.module.css';

const principles = [
  {
    accent: 'Terracotta',
    body:
      'Your week is translated into a calm blueprint that aligns daylight, meeting density, and recovery windows room by room.',
    title: 'Rhythm Mapping',
  },
  {
    accent: 'Sage',
    body:
      'A small sensor set and optional photo scan quietly reads sound, glare, and circulation pressure to reveal hidden friction.',
    title: 'Ambient Sensing',
  },
  {
    accent: 'Indigo',
    body:
      'Local makers deliver modular pieces and ritual prompts so each change feels tactile, reversible, and lived-in from day one.',
    title: 'Seasonal Joinery',
  },
];

const process = [
  {
    detail:
      'A 30-minute conversation and optional home scan define your stress signatures, work cadence, and sensory preferences.',
    step: '01',
    title: 'Calm Audit',
  },
  {
    detail:
      'Within 48 hours you receive a one-page spatial rhythm plan with placement cues, light timing, and acoustic adjustments.',
    step: '02',
    title: 'Spatial Score',
  },
  {
    detail:
      'Every month, one room receives a focused update paired with a guided 20-minute ritual to anchor the change.',
    step: '03',
    title: 'Living Iteration',
  },
];

const voices = [
  {
    person: 'Mina Park, Creative Director',
    quote:
      'We stopped redesigning our office every quarter. Quiet Joinery gave us a pattern we can actually live with.',
  },
  {
    person: 'Elias Hart, Founder',
    quote:
      'The plan felt more like architecture for attention than interior styling. Our team focus hours rose in two weeks.',
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <header className={styles.nav}>
        <p className={styles.brand}>Quiet Joinery</p>
        <nav aria-label="Section links" className={styles.links}>
          <a href="#concept">Concept</a>
          <a href="#process">Process</a>
          <a href="#trust">Voices</a>
        </nav>
        <a className={styles.navCta} href="#invite">
          Book a Calm Audit
        </a>
      </header>

      <section className={`${styles.section} ${styles.hero}`}>
        <p className={`${styles.kicker} ${styles.reveal}`}>Japandi spatial service</p>
        <h1 className={`${styles.title} ${styles.reveal}`} style={{ '--delay': '80ms' } as CSSProperties}>
          A calmer home operating system for people who think for a living.
        </h1>
        <p className={`${styles.lead} ${styles.reveal}`} style={{ '--delay': '160ms' } as CSSProperties}>
          Quiet Joinery blends Japanese minimalism and Scandinavian warmth into a subscription service that tunes your rooms
          to your real rhythm, not trend cycles. The result is less visual noise, steadier focus, and a home that restores
          you on purpose.
        </p>

        <div className={styles.heroGrid}>
          <article className={`${styles.focusCard} ${styles.reveal}`} style={{ '--delay': '240ms' } as CSSProperties}>
            <p className={styles.cardLabel}>This month&apos;s room ritual</p>
            <h2>North-facing studio</h2>
            <ul>
              <li>
                <span>06:30</span>
                Linen-filtered light + warm terracotta accent
              </li>
              <li>
                <span>11:00</span>
                Focus block with directional sound softening
              </li>
              <li>
                <span>20:15</span>
                Screen-down tea corner reset in under 12 minutes
              </li>
            </ul>
          </article>

          <aside className={`${styles.metricPanel} ${styles.reveal}`} style={{ '--delay': '320ms' } as CSSProperties}>
            <div>
              <p>Average stress-noise drop</p>
              <strong>31%</strong>
            </div>
            <div>
              <p>Median setup time</p>
              <strong>2.4 hrs</strong>
            </div>
            <div>
              <p>Members renewing yearly</p>
              <strong>92%</strong>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.section} id="concept">
        <p className={styles.sectionLabel}>Gentle Discovery</p>
        <h2 className={styles.sectionTitle}>Craft is embedded in the structure, never layered on top.</h2>
        <div className={styles.cardRow}>
          {principles.map((item, index) => (
            <article
              className={`${styles.storyCard} ${styles.reveal}`}
              key={item.title}
              style={{ '--delay': `${index * 100 + 90}ms` } as CSSProperties}
            >
              <p>{item.accent}</p>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} id="process">
        <p className={styles.sectionLabel}>Purposeful Conviction</p>
        <h2 className={styles.sectionTitle}>A meditative cycle: observe, shape, and settle.</h2>
        <div className={styles.processList}>
          {process.map((item, index) => (
            <article
              className={`${styles.processItem} ${styles.reveal}`}
              key={item.step}
              style={{ '--delay': `${index * 120 + 80}ms` } as CSSProperties}
            >
              <p>{item.step}</p>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} id="trust">
        <p className={styles.sectionLabel}>Quiet Conversations</p>
        <h2 className={styles.sectionTitle}>Trust built in the pace of lived experience.</h2>
        <div className={styles.testimonialGrid}>
          {voices.map((voice, index) => (
            <figure
              className={`${styles.testimonial} ${styles.reveal}`}
              key={voice.person}
              style={{ '--delay': `${index * 120 + 90}ms` } as CSSProperties}
            >
              <blockquote>{voice.quote}</blockquote>
              <figcaption>{voice.person}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.invite}`} id="invite">
        <p className={styles.sectionLabel}>Natural Next Step</p>
        <h2 className={styles.sectionTitle}>Begin with one room. Keep what truly changes your day.</h2>
        <p className={styles.inviteText}>
          Your first Calm Audit includes a spatial rhythm report, one ritual playbook, and a maker shortlist tailored to your
          neighborhood.
        </p>
        <div className={styles.actions}>
          <a className={styles.primary} href="#">
            Reserve April Intake
          </a>
          <a className={styles.secondary} href="#">
            View Sample Report
          </a>
        </div>
      </section>
    </main>
  );
}
