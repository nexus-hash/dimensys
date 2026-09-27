'use client';

import * as React from 'react';
import { Dialog as RadixDialog, VisuallyHidden } from 'radix-ui';
import { cn } from './utils';
import { IconButton } from './Button';
import { CloseIcon } from './icons';

export type SheetSide = 'left' | 'right';

export interface SheetProps {
  trigger?: React.ReactElement;
  title: React.ReactNode;
  children: React.ReactNode;
  side?: SheetSide;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  widthClassName?: string;
}

const SIDE_TRANSFORM: Record<SheetSide, { closed: string; edge: string }> = {
  left: { closed: 'left-0 -translate-x-full', edge: 'left-0' },
  right: { closed: 'right-0 translate-x-full', edge: 'right-0' },
};

/** Sheet (a side panel; prototype's left rail / right inspector as an overlay on tablet). */
export function Sheet({
  trigger,
  title,
  children,
  side = 'right',
  open,
  onOpenChange,
  widthClassName = 'w-[360px]',
}: SheetProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger> : null}
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={cn(
            'fixed inset-0 z-sheet bg-[color-mix(in_srgb,var(--ink-primary)_32%,transparent)]',
            'data-[state=open]:animate-[fadein_var(--transition-duration-small)_ease-out]',
            'data-[state=closed]:animate-[fadeout_var(--transition-duration-micro)_var(--ease-exit)]',
          )}
        />
        <RadixDialog.Content
          className={cn(
            'fixed inset-y-0 z-sheet flex flex-col border-line-strong bg-surface-overlay shadow-elevation-2',
            side === 'left' ? 'border-r' : 'border-l',
            SIDE_TRANSFORM[side].edge,
            widthClassName,
            'max-w-[92vw]',
            'transition-transform duration-panel ease-emphasized',
            'data-[state=closed]:' + SIDE_TRANSFORM[side].closed,
          )}
        >
          <div className="flex flex-none items-center justify-between gap-4 border-b border-line-hairline px-4 py-3.5">
            <RadixDialog.Title className="text-title-3 text-ink-primary">{title}</RadixDialog.Title>
            <RadixDialog.Close asChild>
              <IconButton aria-label="Close panel" size="sm">
                <CloseIcon />
              </IconButton>
            </RadixDialog.Close>
          </div>
          <VisuallyHidden.Root asChild>
            <RadixDialog.Description>{typeof title === 'string' ? title : 'Panel'}</RadixDialog.Description>
          </VisuallyHidden.Root>
          <div className="flex-1 overflow-auto p-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// BottomSheet / Drawer — snap points (12 / 50 / 92%), drag + keyboard.
// ─────────────────────────────────────────────────────────────────────────

export const DEFAULT_SNAP_POINTS = [12, 50, 92] as const;

export interface BottomSheetProps {
  trigger?: React.ReactElement;
  title: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Snap heights as a percentage of the viewport height, ascending. */
  snapPoints?: number[];
  defaultSnapIndex?: number;
  /** Controlled snap index (index into `snapPoints`). */
  snapIndex?: number;
  onSnapIndexChange?: (index: number) => void;
  /**
   * Whether a dimming backdrop covers the rest of the page while open.
   * Default `true` (a transient drawer you open on demand). Pass `false` for
   * chrome that's meant to stay open at a low snap point alongside content
   * the person can still see and interact with underneath (the player's
   * phone sheet, T3.16 — its 12% peek must never dim the diagram).
   */
  scrim?: boolean;
  /** Extra classes on the sheet panel itself (the portaled `Dialog.Content`) — a parent wrapper's classes can't reach it. */
  className?: string;
  /**
   * Whether the visible title row (`<h2>{title}</h2>` under the grab handle)
   * renders. Default `true`. `title` still names the sheet for assistive
   * tech either way (via a visually-hidden `Dialog.Title`) — pass `false`
   * when the sheet's own content already carries a heading or tabs that
   * make a second, generic title line redundant (the player's phone sheet,
   * T3.16, whose tabs are the prototype's own sheet header).
   */
  showTitleBar?: boolean;
}

/**
 * Drawer / BottomSheet (prototype `.sheet`): snap points at 12/50/92% of the
 * viewport, draggable via the grab handle, and adjustable from the keyboard
 * (grab handle: ArrowUp/ArrowDown step snap points, Home/End jump to the
 * ends) — the same handle is both drag-affordance and a slider control.
 */
export function BottomSheet({
  trigger,
  title,
  children,
  open,
  onOpenChange,
  snapPoints = [...DEFAULT_SNAP_POINTS],
  defaultSnapIndex = 1,
  snapIndex,
  onSnapIndexChange,
  scrim = true,
  className,
  showTitleBar = true,
}: BottomSheetProps) {
  const [uncontrolledIndex, setUncontrolledIndex] = React.useState(defaultSnapIndex);
  const currentIndex = snapIndex ?? uncontrolledIndex;
  const setIndex = (next: number) => {
    const clamped = Math.max(0, Math.min(snapPoints.length - 1, next));
    setUncontrolledIndex(clamped);
    onSnapIndexChange?.(clamped);
  };

  const panelRef = React.useRef<HTMLDivElement>(null);
  const [dragHeightPx, setDragHeightPx] = React.useState<number | null>(null);
  const dragState = React.useRef<{ startY: number; startHeightPx: number } | null>(null);

  const heightPercent = snapPoints[currentIndex];

  const onPointerDown = (e: React.PointerEvent) => {
    const panel = panelRef.current;
    if (!panel) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startY: e.clientY, startHeightPx: panel.getBoundingClientRect().height };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dy = dragState.current.startY - e.clientY;
    const viewportH = window.innerHeight;
    const min = (Math.min(...snapPoints) / 100) * viewportH * 0.6;
    const max = (Math.max(...snapPoints) / 100) * viewportH;
    setDragHeightPx(Math.max(min, Math.min(max, dragState.current.startHeightPx + dy)));
  };

  const endDrag = () => {
    if (!dragState.current) return;
    const viewportH = window.innerHeight;
    const finalPx = dragHeightPx ?? dragState.current.startHeightPx;
    const finalPercent = (finalPx / viewportH) * 100;
    let nearest = 0;
    let bestDelta = Infinity;
    snapPoints.forEach((p, i) => {
      const delta = Math.abs(p - finalPercent);
      if (delta < bestDelta) {
        bestDelta = delta;
        nearest = i;
      }
    });
    setIndex(nearest);
    dragState.current = null;
    setDragHeightPx(null);
  };

  const onHandleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex(currentIndex + 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex(currentIndex - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setIndex(snapPoints.length - 1);
    }
  };

  return (
    // `modal={scrim}`: chrome without a scrim (the player's phone sheet, T3.16) is also
    // non-modal — otherwise Radix still traps focus and marks the rest of the page
    // `aria-hidden`/`inert` even with no visible overlay, which would make the diagram
    // behind a permanently-open peeked sheet unreachable.
    <RadixDialog.Root open={open} onOpenChange={onOpenChange} modal={scrim}>
      {trigger ? <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger> : null}
      <RadixDialog.Portal>
        {scrim ? (
          <RadixDialog.Overlay
            className={cn(
              'fixed inset-0 z-sheet bg-[color-mix(in_srgb,var(--ink-primary)_32%,transparent)]',
              'data-[state=open]:animate-[fadein_var(--transition-duration-small)_ease-out]',
              'data-[state=closed]:animate-[fadeout_var(--transition-duration-micro)_var(--ease-exit)]',
            )}
          />
        ) : null}
        <RadixDialog.Content
          ref={panelRef}
          className={cn(
            'fixed inset-x-0 bottom-0 z-sheet flex flex-col rounded-t-[18px] border-t border-line-strong bg-surface-overlay shadow-elevation-2',
            dragState.current ? '' : 'transition-[height] duration-panel ease-emphasized',
            className,
          )}
          style={{ height: dragHeightPx != null ? `${dragHeightPx}px` : `${heightPercent}dvh` }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <VisuallyHidden.Root asChild>
            <RadixDialog.Title>{title}</RadixDialog.Title>
          </VisuallyHidden.Root>
          <VisuallyHidden.Root asChild>
            <RadixDialog.Description>{typeof title === 'string' ? title : 'Sheet'}</RadixDialog.Description>
          </VisuallyHidden.Root>
          <button
            type="button"
            aria-label="Resize sheet"
            role="slider"
            aria-valuemin={0}
            aria-valuemax={snapPoints.length - 1}
            aria-valuenow={currentIndex}
            aria-valuetext={`${heightPercent}% of screen`}
            aria-orientation="vertical"
            className="grid h-[22px] w-full flex-none cursor-grab touch-none place-items-center text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onHandleKeyDown}
          >
            <span aria-hidden className="h-1 w-10 rounded-full bg-line-strong" />
          </button>
          {showTitleBar ? (
            <div className="flex-none border-b border-line-hairline px-4 pb-2.5">
              <h2 className="text-title-3 text-ink-primary">{title}</h2>
            </div>
          ) : null}
          <div className="flex-1 overflow-auto overscroll-contain p-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** Alias — the design spec lists both names for the same snap-point sheet. */
export const Drawer = BottomSheet;
