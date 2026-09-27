import type { ReactNode } from 'react';

/** Shared frame for the Home showcase sections' static visuals: a card on the canvas surface. */
export function DiagramCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <figure
      className={`canvas-surface w-full rounded-card border border-line-hairline bg-surface-canvas p-5 sm:p-6 ${className}`}
    >
      {children}
    </figure>
  );
}
