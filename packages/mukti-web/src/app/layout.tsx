import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Mukti - Liberation from AI Dependency',
  description:
    'Break free from cognitive dependency with Mukti, your AI mentor that uses the Socratic method to guide you toward your own insights and rediscover independent thinking.',
  keywords: ['AI', 'Socratic method', 'cognitive independence', 'critical thinking', 'learning'],
  authors: [{ name: 'Prathik Shetty' }],
  openGraph: {
    title: 'Mukti - Liberation from AI Dependency',
    description:
      'Think for yourself, not through AI. Mukti guides you toward your own insights using the Socratic method.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mukti - Liberation from AI Dependency',
    description:
      'Think for yourself, not through AI. Mukti guides you toward your own insights using the Socratic method.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
