/**
 * Markdown renderer component using react-markdown
 * Renders markdown content with proper styling for chat messages
 */

'use client';

import type { Components } from 'react-markdown';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

interface MarkdownProps {
  children: string;
  className?: string;
}

const components: Components = {
  // Links
  a: ({ children, href }) => (
    <a
      className="text-primary underline underline-offset-2 hover:text-primary/80"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-white/30 pl-4 italic last:mb-0">
      {children}
    </blockquote>
  ),
  // Code
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">{children}</code>
      );
    }
    return (
      <code className={cn('block overflow-x-auto font-mono text-xs', className)}>{children}</code>
    );
  },
  // Emphasis
  em: ({ children }) => <em className="italic">{children}</em>,
  // Headings
  h1: ({ children }) => <h1 className="mb-4 mt-6 text-xl font-bold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-3 mt-5 text-lg font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>
  ),
  // Horizontal rule
  hr: () => <hr className="my-4 border-white/10" />,
  // Lists
  li: ({ children }) => <li className="mb-1">{children}</li>,
  ol: ({ children }) => <ol className="mb-3 list-decimal pl-6 last:mb-0">{children}</ol>,
  // Paragraphs
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg bg-black/50 p-3 last:mb-0">{children}</pre>
  ),
  // Strong
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  // Tables
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  td: ({ children }) => <td className="border border-white/10 px-3 py-2">{children}</td>,
  th: ({ children }) => (
    <th className="border border-white/10 px-3 py-2 text-left font-semibold">{children}</th>
  ),
  thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
  ul: ({ children }) => <ul className="mb-3 list-disc pl-6 last:mb-0">{children}</ul>,
};

/**
 * Markdown component for rendering markdown content
 * Supports GitHub Flavored Markdown (tables, strikethrough, etc.)
 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn('prose prose-sm prose-invert max-w-none', className)}>
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
