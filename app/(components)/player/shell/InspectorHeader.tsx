import type { ReactNode } from 'react';
import { IconButton } from '@/app/(components)/ui';
import { CloseIcon } from '@/app/(components)/ui/icons';

export interface InspectorHeaderProps {
  title: string;
  kindLabel: string;
  onClose: () => void;
  closeLabel?: string;
}

/**
 * The inspector's header: icon slot, title, mono `type · variant`,
 * and a close button. This task only fills the title/kind — the health
 * glyph, the live mini tile row and the tabs (Overview/Architecture/
 * Operations/Live) are T3.6's `<InspectorBody>` slot below the header.
 */
export function InspectorHeader({ title, kindLabel, onClose, closeLabel = 'Close inspector' }: InspectorHeaderProps) {
  return (
    <div className="flex flex-none items-start justify-between gap-3 border-b border-line-hairline p-4">
      <div className="min-w-0">
        <h2 className="truncate text-title-3 text-ink-primary">{title}</h2>
        {kindLabel ? <p className="mt-0.5 font-mono text-mono-sm text-ink-muted">{kindLabel}</p> : null}
      </div>
      <IconButton aria-label={closeLabel} size="sm" onClick={onClose}>
        <CloseIcon />
      </IconButton>
    </div>
  );
}

/** T3.6's body slot: overview/architecture/operations/live tabs and their section renderers. */
export function InspectorBodySlot({ children }: { children?: ReactNode }) {
  return (
    <div className="flex-1 overflow-auto" data-inspector-body-slot>
      {children}
    </div>
  );
}
