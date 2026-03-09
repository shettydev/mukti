/**
 * Thought Map canvas layout
 *
 * Full-screen workspace layout for the Thought Map canvas experience.
 * Intentionally suppresses the outer dashboard chrome (no sidebar or nav bar)
 * so React Flow can occupy the entire viewport — mirrors the pattern used by
 * the canvas detail layout.
 *
 * Server Component: no client state needed here — just pass children through.
 */

export const metadata = { title: 'Thought Map — Mukti' };

interface ThoughtMapLayoutProps {
  children: React.ReactNode;
}

/**
 * Full-screen layout for the Thought Map canvas workspace.
 * Renders children directly without any wrapping chrome.
 */
export default function ThoughtMapLayout({ children }: ThoughtMapLayoutProps) {
  return <div className="h-dvh w-full overflow-hidden">{children}</div>;
}
