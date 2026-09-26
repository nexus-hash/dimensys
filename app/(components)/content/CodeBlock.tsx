import React from 'react';
import CopyButton from './CopyButton';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

/**
 * CodeBlock: Server Component that renders code with optional syntax highlighting.
 * Uses Shiki for server-side highlighting (when integrated).
 * The copy button is the only client-side JS.
 */
export async function CodeBlock({
  code,
  language = 'text',
  showLineNumbers = false,
  className = '',
}: CodeBlockProps) {
  const cleanCode = code.trimEnd();
  const lines = cleanCode.split('\n');

  return (
    <div
      className={`rounded-lg overflow-hidden border border-line-hairline bg-surface-raised ${className}`}
    >
      {/* Language chip */}
      {language && language !== 'text' && (
        <div className="px-4 py-2 bg-surface-overlay border-b border-line-hairline text-ink-muted text-text-label font-mono flex justify-between items-center">
          <span>{language}</span>
        </div>
      )}

      {/* Code container */}
      <div className="relative group">
        <pre className="p-4 overflow-x-auto">
          <code className="flex flex-col font-mono text-text-body leading-relaxed">
            {lines.map((line, idx) => (
              <span key={idx} className="flex">
                {showLineNumbers && (
                  <span className="inline-block w-12 pr-4 text-right text-ink-muted select-none flex-shrink-0">
                    {idx + 1}
                  </span>
                )}
                <span className="flex-1 whitespace-pre-wrap break-words text-ink-primary">
                  {line || '\n'}
                </span>
              </span>
            ))}
          </code>
        </pre>

        {/* Copy button */}
        <CopyButton code={cleanCode} />
      </div>
    </div>
  );
}

export default CodeBlock;
