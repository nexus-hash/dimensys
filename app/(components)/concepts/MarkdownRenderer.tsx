'use client';

import type { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown, { type ExtraProps } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Mermaid from './Mermaid';

type CodeProps = ComponentPropsWithoutRef<'code'> & ExtraProps & { inline?: boolean };

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="text-light-secondary dark:text-dark-secondary leading-relaxed space-y-6 max-w-4xl">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({...props}) => <h1 className="text-4xl font-bold text-orange-600 dark:text-orange-500 mt-12 mb-6" {...props} />,
          h2: ({...props}) => <h2 className="text-2xl font-semibold text-orange-500 dark:text-orange-400 mt-10 mb-4 border-b border-orange-200 dark:border-orange-500/20 pb-2" {...props} />,
          h3: ({...props}) => <h3 className="text-xl font-medium text-orange-500/90 dark:text-orange-400/90 mt-8 mb-3" {...props} />,
          p: ({...props}) => <p className="mb-4 text-base" {...props} />,
          ul: ({...props}) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
          ol: ({...props}) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
          li: ({...props}) => <li className="" {...props} />,
          a: ({...props}) => <a className="text-orange-500 hover:underline" {...props} />,
          blockquote: ({...props}) => <blockquote className="border-l-4 border-orange-500 pl-4 italic text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 py-2 rounded-r" {...props} />,
          table: ({...props}) => (
            <div className="overflow-x-auto my-6 rounded-lg border border-gray-200 dark:border-white/10">
              <table className="min-w-full text-sm text-left" {...props} />
            </div>
          ),
          th: ({...props}) => <th className="px-4 py-3 bg-gray-100 dark:bg-white/5 font-semibold text-gray-900 dark:text-white" {...props} />,
          td: ({...props}) => <td className="px-4 py-3 border-t border-gray-200 dark:border-white/10" {...props} />,
          code: ({inline, className, children, ...props}: CodeProps) => {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match?.[1] || '';
            
            if (!inline && lang === 'mermaid') {
              return <Mermaid chart={String(children).replace(/\n$/, '')} />;
            }

            return !inline ? (
              <div className="my-6 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-surface-raised">
                <div className="px-4 py-2 bg-gray-200 dark:bg-surface-overlay text-xs font-mono text-gray-500 dark:text-gray-400 border-b border-gray-300 dark:border-white/10">
                  {lang || 'code'}
                </div>
                <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-800 dark:text-gray-200">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-orange-600 dark:text-orange-400 font-mono text-sm" {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
