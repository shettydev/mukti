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

type NodeData = {
  hProperties?: Record<string, string>;
};

export type AssistantMarkdownNode = {
  children?: AssistantMarkdownNode[];
  data?: NodeData;
  depth?: number;
  ordered?: boolean;
  spread?: boolean;
  start?: number;
  type: string;
  value?: string;
};

const SECTION_LABELS = new Map<string, string>([
  ['details', 'Details'],
  ['implementation details', 'Implementation Details'],
  ['next step', 'Next Step'],
  ['next steps', 'Next Step'],
  ['question', 'Question'],
  ['questions to consider', 'Question'],
  ['summary', 'Summary'],
]);

const QUESTION_SECTION = 'Question';

type ParsedSection = {
  rest: string;
  title: string;
};

function extractText(node: AssistantMarkdownNode | undefined): string {
  if (!node) {
    return '';
  }

  if (typeof node.value === 'string') {
    return node.value;
  }

  if (!node.children || node.children.length === 0) {
    return '';
  }

  return node.children.map((child) => extractText(child)).join('');
}

function parseSectionLabel(text: string): ParsedSection | null {
  const trimmed = text.trim();
  const match = trimmed.match(
    /^(summary|details|implementation details|next steps?|question|questions to consider)(?:\s*[:\-]\s*([\s\S]*))?$/i
  );

  if (!match) {
    return null;
  }

  const normalizedLabel = match[1].trim().toLowerCase();
  const title = SECTION_LABELS.get(normalizedLabel);

  if (!title) {
    return null;
  }

  return {
    rest: match[2]?.trim() ?? '',
    title,
  };
}

function parseSection(node: AssistantMarkdownNode): ParsedSection | null {
  if (node.type !== 'heading' && node.type !== 'paragraph') {
    return null;
  }

  const text = extractText(node).trim();
  if (!text) {
    return null;
  }

  return parseSectionLabel(text);
}

function createHeading(text: string): AssistantMarkdownNode {
  return {
    children: [{ type: 'text', value: text }],
    depth: 3,
    type: 'heading',
  };
}

function createParagraph(text: string): AssistantMarkdownNode {
  return {
    children: [{ type: 'text', value: text }],
    type: 'paragraph',
  };
}

function createQuestionLabelParagraph(): AssistantMarkdownNode {
  return {
    children: [
      {
        children: [{ type: 'text', value: 'Question:' }],
        type: 'strong',
      },
    ],
    type: 'paragraph',
  };
}

function createOrderedQuestionList(questionItems: string[]): AssistantMarkdownNode {
  return {
    children: questionItems.map((item) => ({
      children: [createParagraph(item)],
      spread: false,
      type: 'listItem',
    })),
    ordered: true,
    spread: false,
    start: 1,
    type: 'list',
  };
}

function isEmptyParagraph(node: AssistantMarkdownNode): boolean {
  return node.type === 'paragraph' && extractText(node).trim().length === 0;
}

function normalizeQuestionContent(nodes: AssistantMarkdownNode[]): AssistantMarkdownNode[] {
  const trimmedNodes = nodes.filter((node) => !isEmptyParagraph(node));

  if (trimmedNodes.length === 0) {
    return [];
  }

  const containsOnlyParagraphs = trimmedNodes.every((node) => node.type === 'paragraph');
  if (containsOnlyParagraphs) {
    const paragraphTexts = trimmedNodes.map((node) => extractText(node).trim()).filter(Boolean);
    const areAllQuestions =
      paragraphTexts.length > 1 &&
      paragraphTexts.every((paragraphText) => paragraphText.endsWith('?'));

    if (areAllQuestions) {
      return [createOrderedQuestionList(paragraphTexts)];
    }
  }

  return trimmedNodes.map((node) => {
    if (node.type === 'list') {
      return {
        ...node,
        ordered: true,
        start: 1,
      };
    }

    return node;
  });
}

function createQuestionCallout(contentNodes: AssistantMarkdownNode[]): AssistantMarkdownNode {
  const normalizedQuestionContent = normalizeQuestionContent(contentNodes);

  return {
    children: [createQuestionLabelParagraph(), ...normalizedQuestionContent],
    data: {
      hProperties: {
        'data-callout': 'question',
      },
    },
    type: 'blockquote',
  };
}

export function transformAssistantMarkdownNodes(
  nodes: AssistantMarkdownNode[]
): AssistantMarkdownNode[] {
  const transformedNodes: AssistantMarkdownNode[] = [];

  for (let index = 0; index < nodes.length; ) {
    const node = nodes[index];
    const section = parseSection(node);

    if (!section) {
      transformedNodes.push(node);
      index += 1;
      continue;
    }

    if (section.title !== QUESTION_SECTION) {
      transformedNodes.push(createHeading(section.title));
      if (section.rest) {
        transformedNodes.push(createParagraph(section.rest));
      }
      index += 1;
      continue;
    }

    const questionNodes: AssistantMarkdownNode[] = [];
    if (section.rest) {
      questionNodes.push(createParagraph(section.rest));
    }

    index += 1;
    while (index < nodes.length) {
      const sibling = nodes[index];
      const siblingSection = parseSection(sibling);

      if (siblingSection || sibling.type === 'heading' || sibling.type === 'thematicBreak') {
        break;
      }

      questionNodes.push(sibling);
      index += 1;
    }

    transformedNodes.push(createQuestionCallout(questionNodes));
  }

  return transformedNodes;
}

function assistantStructurePlugin() {
  return (tree: AssistantMarkdownNode) => {
    if (!tree.children || tree.children.length === 0) {
      return;
    }

    tree.children = transformAssistantMarkdownNodes(tree.children);
  };
}

function getCalloutType(node: unknown): null | string {
  if (!node || typeof node !== 'object') {
    return null;
  }

  const data = (node as { data?: NodeData }).data;
  const callout = data?.hProperties?.['data-callout'];

  return typeof callout === 'string' ? callout : null;
}

const components: Components = {
  // Links
  a: ({ children, href }) => (
    <a className="assistant-link" href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  ),
  // Blockquotes
  blockquote: ({ children, node }) => {
    const isQuestionCallout = getCalloutType(node) === 'question';

    return (
      <blockquote
        aria-label={isQuestionCallout ? 'Question callout' : undefined}
        className={cn(
          'assistant-blockquote',
          isQuestionCallout ? 'assistant-question-callout' : 'assistant-default-callout'
        )}
        role={isQuestionCallout ? 'note' : undefined}
      >
        {children}
      </blockquote>
    );
  },
  // Code
  code: ({ children, className }) => {
    const isInline = !className;

    if (isInline) {
      return <code className="assistant-inline-code">{children}</code>;
    }

    return <code className={cn('assistant-code-block-content', className)}>{children}</code>;
  },
  // Emphasis
  em: ({ children }) => <em className="italic">{children}</em>,
  // Headings
  h1: ({ children }) => <h1 className="assistant-section-heading">{children}</h1>,
  h2: ({ children }) => <h2 className="assistant-section-heading">{children}</h2>,
  h3: ({ children }) => <h3 className="assistant-section-heading">{children}</h3>,
  // Horizontal rule
  hr: () => <hr className="assistant-rule" />,
  // Lists
  li: ({ children }) => <li className="assistant-list-item">{children}</li>,
  ol: ({ children }) => <ol className="assistant-list assistant-list-ordered">{children}</ol>,
  // Paragraphs
  p: ({ children }) => <p className="assistant-paragraph">{children}</p>,
  pre: ({ children }) => <pre className="assistant-pre">{children}</pre>,
  // Strong
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  // Tables
  table: ({ children }) => (
    <div className="assistant-table-wrap">
      <table className="assistant-table">{children}</table>
    </div>
  ),
  td: ({ children }) => <td className="assistant-table-cell">{children}</td>,
  th: ({ children }) => <th className="assistant-table-head">{children}</th>,
  thead: ({ children }) => <thead className="assistant-table-header-row">{children}</thead>,
  ul: ({ children }) => <ul className="assistant-list assistant-list-unordered">{children}</ul>,
};

/**
 * Markdown component for rendering markdown content
 * Supports GitHub Flavored Markdown (tables, strikethrough, etc.)
 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn('assistant-markdown', className)}>
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm, assistantStructurePlugin]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
