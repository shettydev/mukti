import type { AssistantMarkdownNode } from '@/components/ui/markdown';

import { transformAssistantMarkdownNodes } from '@/components/ui/markdown';

function createTextParagraph(text: string): AssistantMarkdownNode {
  return {
    children: [{ type: 'text', value: text }],
    type: 'paragraph',
  };
}

function textFromNode(node: AssistantMarkdownNode | undefined): string {
  if (!node) {
    return '';
  }

  if (typeof node.value === 'string') {
    return node.value;
  }

  if (!node.children || node.children.length === 0) {
    return '';
  }

  return node.children.map((child) => textFromNode(child)).join('');
}

describe('transformAssistantMarkdownNodes', () => {
  it('converts label-style summary text to a section heading and paragraph', () => {
    const nodes: AssistantMarkdownNode[] = [createTextParagraph('Summary: Keep it concise.')];

    const transformed = transformAssistantMarkdownNodes(nodes);

    expect(transformed).toHaveLength(2);
    expect(transformed[0].type).toBe('heading');
    expect(transformed[0].depth).toBe(3);
    expect(textFromNode(transformed[0])).toBe('Summary');
    expect(transformed[1].type).toBe('paragraph');
    expect(textFromNode(transformed[1])).toBe('Keep it concise.');
  });

  it('wraps question sections in a semantic question callout and converts lists to ordered', () => {
    const nodes: AssistantMarkdownNode[] = [
      {
        children: [{ type: 'text', value: 'Questions to consider' }],
        depth: 2,
        type: 'heading',
      },
      {
        children: [
          {
            children: [createTextParagraph('What changed in this branch?')],
            spread: false,
            type: 'listItem',
          },
          {
            children: [createTextParagraph('How should we verify it?')],
            spread: false,
            type: 'listItem',
          },
        ],
        ordered: false,
        spread: false,
        type: 'list',
      },
      createTextParagraph('Summary: Ready to ship'),
    ];

    const transformed = transformAssistantMarkdownNodes(nodes);
    const questionCallout = transformed[0];

    expect(questionCallout.type).toBe('blockquote');
    expect(questionCallout.data?.hProperties?.['data-callout']).toBe('question');
    expect(textFromNode(questionCallout.children?.[0])).toBe('Question:');
    expect(questionCallout.children?.[1].type).toBe('list');
    expect(questionCallout.children?.[1].ordered).toBe(true);
    expect(transformed[1].type).toBe('heading');
    expect(textFromNode(transformed[1])).toBe('Summary');
    expect(textFromNode(transformed[2])).toBe('Ready to ship');
  });

  it('renders multiple question paragraphs as a numbered list in the callout', () => {
    const nodes: AssistantMarkdownNode[] = [
      createTextParagraph('Question: What changed?'),
      createTextParagraph('Which file should be updated?'),
      createTextParagraph('Details: Focus only on message rendering.'),
    ];

    const transformed = transformAssistantMarkdownNodes(nodes);
    const questionCallout = transformed[0];
    const orderedList = questionCallout.children?.[1];

    expect(questionCallout.type).toBe('blockquote');
    expect(textFromNode(questionCallout.children?.[0])).toBe('Question:');
    expect(orderedList?.type).toBe('list');
    expect(orderedList?.ordered).toBe(true);
    expect(orderedList?.children).toHaveLength(2);
    expect(textFromNode(transformed[1])).toBe('Details');
    expect(textFromNode(transformed[2])).toBe('Focus only on message rendering.');
  });
});
