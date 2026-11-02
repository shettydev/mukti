import type { Metadata } from 'next';

import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';

import './globals.css';
import { Providers } from '@/app/providers';
import { ThemeProvider } from '@/components/old-landing/theme-provider';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  authors: [{ name: 'Prathik Shetty' }],
  description:
    'Mukti is an open-source Socratic thinking workspace: an AI that answers your questions with better questions. Run it locally with npx muktiai on your Claude Code, Codex or Antigravity subscription.',
  icons: {
    icon: [
      { media: '(prefers-color-scheme: light)', url: '/mukti-enso-inverted/mukti-enso-no-bg.png' },
      { media: '(prefers-color-scheme: dark)', url: '/mukti-enso/mukti-inverted-enso-no-bg.png' },
    ],
  },
  keywords: [
    'AI',
    'Socratic method',
    'cognitive independence',
    'critical thinking',
    'learning',
    'open source',
    'Claude Code',
    'Codex',
  ],
  openGraph: {
    description:
      'An AI that answers your questions with better questions. Open source, runs locally with npx muktiai.',
    title: 'Mukti — An AI that answers your questions with better questions',
    type: 'website',
  },
  title: 'mukti',
  twitter: {
    card: 'summary_large_image',
    description:
      'An AI that answers your questions with better questions. Open source, runs locally with npx muktiai.',
    title: 'Mukti — An AI that answers your questions with better questions',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Script id="strip-extension-attrs" strategy="beforeInteractive">
          {`
            // Remove extension-injected attributes (e.g., bis_skin_checked) before React hydrates
            (function () {
              var attr = 'bis_skin_checked';
              var clean = function () {
                try {
                  document
                    .querySelectorAll('[' + attr + ']')
                    .forEach(function (el) { el.removeAttribute(attr); });
                } catch (e) {
                  // ignore cleanup errors
                }
              };
              clean();
              document.addEventListener('DOMContentLoaded', clean);
            })();
          `}
        </Script>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            disableTransitionOnChange
            enableSystem
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
