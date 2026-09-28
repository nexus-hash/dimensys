import type { ReactNode } from 'react';
import { Pill } from '@/app/(components)/ui';

/** A section's title row: the title, an optional trailing control, and the "assumed" badge when the numbers are an assumption. */
export function SectionHeading({ title, assumed, id, children }: { title: string; assumed?: true; id?: string; children?: ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h3 id={id} className="min-w-0 break-words text-label font-semibold text-ink-secondary">
        {title}
      </h3>
      {children || assumed ? (
        <div className="flex flex-none items-center gap-2">
          {children}
          {assumed ? <Pill variant="neutral">assumed</Pill> : null}
        </div>
      ) : null}
    </div>
  );
}
