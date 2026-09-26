import React from 'react';
import CopyButton from './CopyButton';

interface LineAnnotation {
  lineNumber: number;
  note: string;
}

interface AnnotatedCodeProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  annotations?: LineAnnotation[];
  highlightLines?: number[];
  className?: string;
}

/**
 * AnnotatedCode: Server Component extending CodeBlock with per-line annotations.
 * Renders highlighted lines with a left bar and per-line notes as markers.
 * Keyboard accessible and screen-reader friendly.
 */
export async function AnnotatedCode({
  code,
  language = 'text',
  showLineNumbers = true,
  annotations = [],
  highlightLines = [],
  className = '',
}: AnnotatedCodeProps) {
  const cleanCode = code.trimEnd();
  const lines = cleanCode.split('\n');

  // Build annotation map for quick lookup
  const annotationMap = new Map(
    annotations.map((ann) => [ann.lineNumber, ann.note])
  );

  const highlightSet = new Set(highlightLines);

  return (
    <div className={`rounded-lg overflow-hidden border border-line-hairline bg-surface-raised ${className}`}>
      {/* Language chip */}
      {language && language !== 'text' && (
        <div className="px-4 py-2 bg-surface-overlay border-b border-line-hairline text-ink-muted text-text-label font-mono flex justify-between items-center">
          <span>{language}</span>
        </div>
      )}

      {/* Code container */}
      <div className="relative group">
        <pre className="p-4 overflow-x-auto">
          <code
            className="flex flex-col font-mono text-text-body leading-relaxed"
            aria-label={`Code block in ${language}`}
          >
            {lines.map((line, idx) => {
              const lineNumber = idx + 1;
              const isHighlighted = highlightSet.has(lineNumber);
              const hasAnnotation = annotationMap.has(lineNumber);

              return (
                <div
                  key={idx}
                  className={`flex gap-3 ${
                    isHighlighted ? 'border-l-2 border-brand pl-3 bg-brand/5' : ''
                  }`}
                  role="listitem"
                  aria-label={
                    hasAnnotation
                      ? `Line ${lineNumber}: ${annotationMap.get(lineNumber)}`
                      : undefined
                  }
                >
                  {/* Line number */}
                  {showLineNumbers && (
                    <span className="inline-block w-12 text-right text-ink-muted select-none flex-shrink-0">
                      {lineNumber}
                    </span>
                  )}

                  {/* Code content */}
                  <span className="flex-1 whitespace-pre-wrap break-words text-ink-primary">
                    {line || '\n'}
                  </span>

                  {/* Annotation marker */}
                  {hasAnnotation && (
                    <span
                      className="ml-2 flex-shrink-0 w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center cursor-help"
                      title={annotationMap.get(lineNumber)}
                      role="tooltip"
                      aria-label={`Annotation: ${annotationMap.get(lineNumber)}`}
                    >
                      ●
                    </span>
                  )}
                </div>
              );
            })}
          </code>
        </pre>

        {/* Copy button */}
        <CopyButton code={cleanCode} />
      </div>

      {/* Annotations legend */}
      {annotations.length > 0 && (
        <div className="px-4 py-3 bg-surface-overlay border-t border-line-hairline">
          <div className="text-text-label font-semibold text-ink-secondary mb-2">
            Annotations
          </div>
          <ul className="space-y-1 text-text-body">
            {annotations.map((ann) => (
              <li key={ann.lineNumber} className="flex gap-2 text-ink-secondary">
                <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  ●
                </span>
                <span>
                  <strong>Line {ann.lineNumber}:</strong> {ann.note}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AnnotatedCode;
