import type { Metadata } from 'next';

import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';
import { Providers } from '@/app/providers';
import { ThemeProvider } from '@/components/theme-provider';
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
    'Break free from cognitive dependency with Mukti, your AI mentor that uses the Socratic method to guide you toward your own insights and rediscover independent thinking.',
  keywords: ['AI', 'Socratic method', 'cognitive independence', 'critical thinking', 'learning'],
  openGraph: {
    description:
      'Think for yourself, not through AI. Mukti guides you toward your own insights using the Socratic method.',
    title: 'Mukti - Liberation from AI Dependency',
    type: 'website',
  },
  title: 'Mukti - Liberation from AI Dependency',
  twitter: {
    card: 'summary_large_image',
    description:
      'Think for yourself, not through AI. Mukti guides you toward your own insights using the Socratic method.',
    title: 'Mukti - Liberation from AI Dependency',
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
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
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
