import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ComponentPropsWithoutRef } from 'react';
import type { Components, ExtraProps } from 'react-markdown';
import { CodeBlock } from './CodeBlock';

type CodeProps = ComponentPropsWithoutRef<'code'> & ExtraProps;

interface MarkdownProps {
  content: string;
  className?: string;
}

interface MarkdownSegment {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

// Matches a line-anchored ``` fenced code block. Fenced blocks are pulled out
// of the document before it reaches ReactMarkdown so each one can be
// rendered through the real, Shiki-backed CodeBlock (an async Server
// Component) — react-markdown's own `components.code` renderer is called
// synchronously, so it cannot itself await a highlighter.
const FENCE_RE = /^```([\w+-]*)[ \t]*\n([\s\S]*?)\n```[ \t]*$/gm;

function splitContentByFences(content: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  let lastIndex = 0;
  FENCE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = FENCE_RE.exec(content))) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'code', content: match[2], language: match[1] || 'text' });
    lastIndex = FENCE_RE.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return segments;
}

const markdownComponents: Components = {
  h1: ({ ...props }) => (
    <h1
      className="text-display font-bold text-brand-ink mt-12 mb-6"
      {...props}
    />
  ),
  h2: ({ ...props }) => (
    <h2
      className="text-title-1 font-semibold text-brand-ink mt-10 mb-4 border-b border-line-hairline pb-2"
      {...props}
    />
  ),
  h3: ({ ...props }) => (
    <h3
      className="text-title-2 font-semibold text-brand-strong dark:text-brand-strong mt-8 mb-3"
      {...props}
    />
  ),
  h4: ({ ...props }) => (
    <h4
      className="text-title-3 font-semibold text-ink-primary dark:text-ink-primary mt-6 mb-2"
      {...props}
    />
  ),
  p: ({ ...props }) => <p className="mb-4 text-body-lg" {...props} />,
  ul: ({ ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
  ol: ({ ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
  li: ({ ...props }) => <li className="text-body-lg" {...props} />,
  a: ({ ...props }) => (
    <a
      className="text-brand-ink hover:text-brand-strong underline"
      {...props}
    />
  ),
  blockquote: ({ ...props }) => (
    <blockquote
      className="border-l-4 border-brand pl-4 italic text-ink-secondary dark:text-ink-secondary bg-surface-raised dark:bg-surface-raised py-2 rounded-r my-4"
      {...props}
    />
  ),
  table: ({ ...props }) => (
    <div className="overflow-x-auto my-6 rounded-lg border border-line-hairline">
      <table className="min-w-full text-sm text-left" {...props} />
    </div>
  ),
  th: ({ ...props }) => (
    <th
      className="px-4 py-3 bg-surface-overlay dark:bg-surface-overlay font-semibold text-ink-primary dark:text-ink-primary"
      {...props}
    />
  ),
  td: ({ ...props }) => (
    <td className="px-4 py-3 border-t border-line-hairline text-body" {...props} />
  ),
  // Any `code` node reaching this renderer is inline — fenced blocks are
  // split out and rendered through CodeBlock before ReactMarkdown ever sees
  // them (see splitContentByFences).
  code: ({ children }: CodeProps) => (
    <code className="bg-surface-overlay dark:bg-surface-overlay px-1.5 py-0.5 rounded text-brand-ink font-mono text-body">
      {children}
    </code>
  ),
};

/**
 * Markdown: Server Component that renders markdown with the app's typography
 * tokens. Fenced code blocks are rendered through CodeBlock, so they get
 * real, server-side Shiki highlighting; everything else renders through
 * react-markdown as before.
 */
export async function Markdown({ content, className = '' }: MarkdownProps) {
  const segments = splitContentByFences(content);

  const rendered = await Promise.all(
    segments.map(async (segment, index) => {
      if (segment.type === 'code') {
        // Invoked directly (not as JSX) so it resolves right here: an async
        // component written as `<CodeBlock />` would only be awaited by a
        // full RSC/flight renderer, not by ReactDOM's client renderer (which
        // is what the component tests below use).
        const codeBlock = await CodeBlock({ code: segment.content, language: segment.language });
        return (
          <div className="my-6" key={index}>
            {codeBlock}
          </div>
        );
      }
      return (
        <ReactMarkdown key={index} remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {segment.content}
        </ReactMarkdown>
      );
    })
  );

  return (
    <div
      className={`text-ink-primary dark:text-ink-primary leading-relaxed space-y-6 max-w-4xl ${className}`}
    >
      {rendered}
    </div>
  );
}

