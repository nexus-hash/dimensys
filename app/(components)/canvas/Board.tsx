import type { CSSProperties, ReactNode } from 'react';
import { CanvasDefs } from './CanvasDefs';

/**
 * The board: one `<svg>` per instance holding this board's `<defs>` (shared
 * markers / hatch pattern, namespaced by `id`) plus whatever `Node`/`Link`/
 * `Subsystem` children later tasks (T3.2 static blueprint, T3.3 interactive
 * layer) compose on top.
 *
 * This component paints no background of its own — no fill, no dot grid.
 * It used to (a `--surface-canvas` rect the size of its own viewBox), which
 * read as a floating card whenever a caller centers/insets it inside a
 * larger free area (the player shell's board-wrap, in particular): a
 * visibly different-shaded rectangle behind the diagram, edged by the
 * surrounding canvas. The `--surface-canvas` + dot-grid treatment now lives
 * on the *caller's* own wrapper instead (`.player-board-wrap` in
 * `globals.css` for the player shell; any standalone caller gives its own
 * wrapper the same CSS — see `.canvas-surface` in `globals.css`), so the
 * grid spans the whole free area edge to edge instead of stopping at this
 * board's own box.
 *
 * `id` must be unique per board on the page — it namespaces every SVG id
 * this kit generates (`CanvasDefs`, node hatch fills, link markers) so two
 * boards never collide. Server-renderable: no client state, no pan/zoom
 * (that's T3.3). `label` is the SVG's `aria-label` (the board reads as one
 * accessible group; individual nodes carry their own `role`/`aria-label`).
 *
 * GEOM: neither this wrapper nor the `<svg>` itself clips. A node's own
 * decorations (replica stack cards, the selection ring, the health halo)
 * and a subsystem's frame/tab can all extend past the diagram's nominal
 * `viewBox` size, and at a pan/zoom past the old edge they must stay
 * visible rather than being cut by a second clip stacked on top of the
 * canvas region. The *only* clip in the player is the canvas region itself
 * (`.player-board-wrap`, `globals.css`) — the area between the HUD and
 * timeline bands — which every caller of this kit is expected to provide
 * its own equivalent of if it isn't the player (a standalone embed with no
 * such region simply never clips at all). `overflow: visible` on the
 * `<svg>` matters on its own: an SVG's UA default is `overflow: hidden` on
 * its own viewport, so leaving it unset would still clip regardless of
 * this wrapper.
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
      className={'relative overflow-visible' + (className ? ` ${className}` : '')}
      style={style}
    >
      <svg role="group" aria-label={label} viewBox={viewBox} width="100%" height="100%" style={{ overflow: 'visible' }}>
        <CanvasDefs boardId={id} />
        {children}
      </svg>
    </div>
  );
}
