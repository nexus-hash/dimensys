import type { CSSProperties, ReactNode } from 'react';
import { CanvasDefs } from './CanvasDefs';

/**
 * The board: `--surface-canvas` background with a 24px dot grid, and
 * one `<svg>` per instance holding this board's `<defs>` (shared markers /
 * hatch pattern, namespaced by `id`) plus whatever `Node`/`Link`/`Subsystem`
 * children later tasks (T3.2 static blueprint, T3.3 interactive layer)
 * compose on top.
 *
 * `id` must be unique per board on the page — it namespaces every SVG id
 * this kit generates (`CanvasDefs`, node hatch fills, link markers) so two
 * boards never collide. Server-renderable: no client state, no pan/zoom
 * (that's T3.3). `label` is the SVG's `aria-label` (the board reads as one
 * accessible group; individual nodes carry their own `role`/`aria-label`).
 */
export function Board({
  id,
  label = 'System diagram',
  viewBox,
  className,
  style,
  children,
}: {
  id: string;
  label?: string;
  viewBox?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div
      className={
        'relative overflow-hidden bg-surface-canvas bg-[radial-gradient(circle,var(--color-grid-dot)_1px,transparent_1.4px)] bg-[length:24px_24px]' +
        (className ? ` ${className}` : '')
      }
      style={style}
    >
      <svg role="group" aria-label={label} viewBox={viewBox} width="100%" height="100%">
        <CanvasDefs boardId={id} />
        {children}
      </svg>
    </div>
  );
}
