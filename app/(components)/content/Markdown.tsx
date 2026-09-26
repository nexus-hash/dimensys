import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ComponentPropsWithoutRef } from 'react';
import type { ExtraProps } from 'react-markdown';

type CodeProps = ComponentPropsWithoutRef<'code'> & ExtraProps & { inline?: boolean };

interface MarkdownProps {
  content: string;
  className?: string;
}

/**
 * Markdown: Server Component that renders markdown with the app's typography tokens.
 * Code blocks are rendered with syntax highlighting ready for CodeBlock integration.
 */
export function Markdown({ content, className = '' }: MarkdownProps) {
  return (
    <div className={`text-ink-primary dark:text-ink-primary leading-relaxed space-y-6 max-w-4xl ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1
              className="text-text-display font-bold text-brand dark:text-brand mt-12 mb-6"
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <h2
              className="text-text-title-1 font-semibold text-brand dark:text-brand mt-10 mb-4 border-b border-line-hairline pb-2"
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3
              className="text-text-title-2 font-semibold text-brand-strong dark:text-brand-strong mt-8 mb-3"
              {...props}
            />
          ),
          h4: ({ ...props }) => (
            <h4
              className="text-text-title-3 font-semibold text-ink-primary dark:text-ink-primary mt-6 mb-2"
              {...props}
            />
          ),
          p: ({ ...props }) => <p className="mb-4 text-text-body-lg" {...props} />,
          ul: ({ ...props }) => (
            <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />
          ),
          li: ({ ...props }) => <li className="text-text-body-lg" {...props} />,
          a: ({ ...props }) => (
            <a
              className="text-brand hover:text-brand-strong dark:text-brand dark:hover:text-brand-strong underline"
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
            <td
              className="px-4 py-3 border-t border-line-hairline text-text-body"
              {...props}
            />
          ),
          code: ({ inline, className: codeClassName, children, ...props }: CodeProps) => {
            if (!inline) {
              // Render code block
              const match = /language-(\w+)/.exec(codeClassName || '');
              const lang = match?.[1] || 'text';

              return (
                <div className="my-6 rounded-lg overflow-hidden border border-line-hairline bg-surface-raised">
                  {lang && lang !== 'text' && (
                    <div className="px-4 py-2 bg-surface-overlay border-b border-line-hairline text-ink-muted text-text-label font-mono">
                      {lang}
                    </div>
                  )}
                  <pre className="p-4 overflow-x-auto">
                    <code className="font-mono text-text-body text-ink-primary whitespace-pre-wrap break-words">
                      {children}
                    </code>
                  </pre>
                </div>
              );
            }

            // Inline code
            return (
              <code
                className="bg-surface-overlay dark:bg-surface-overlay px-1.5 py-0.5 rounded text-brand dark:text-brand font-mono text-text-body"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default Markdown;
