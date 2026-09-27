import type { ReactNode } from 'react';
import { arrowId } from './CanvasDefs';
import type { LinkProtocol } from './types';
import { truncateToWidth } from './text';

/**
 * Label pill geometry (GEOM), calibrated against this player's own rendered
 * pill: `.cv-link-label text` (`app/globals.css`) is 12px mono, weight 500
 * — Geist Mono's measured advance width is ~7.3px/char at that size/weight
 * (measured in-browser against a handful of real labels: "Write/Read DB",
 * "Get New Key", "Publish Event"). `PAD_X` is this rect's own padding, each
 * side; `HEIGHT` its fixed height; `MIN_WIDTH` the floor so a 1-2 char
 * label doesn't render an unreadably-narrow pill.
 *
 * These numbers and the layout engine's own calibrated pill-size constants
 * (the label-geometry module the engine's build docs describe) must stay
 * identical — each side pins the other's numbers in a test that names this
 * comment as its counterpart. `wire.cap.sz` (when present) already *is*
 * this exact size, computed with the engine's copy of these same numbers;
 * `estimatePillSize` below only stands in for an older/unsynced document
 * that has no `cap` yet.
 */
const LABEL_CHAR_W = 7.3;
const LABEL_PAD_X = 7;
const LABEL_HEIGHT = 20;
const LABEL_MIN_WIDTH = 80;

/** Fallback pill size from label text alone — only used when `cap.sz` is absent (see the block comment above). */
export function estimatePillSize(text: string): [number, number] {
  return [Math.max(LABEL_MIN_WIDTH, text.length * LABEL_CHAR_W + LABEL_PAD_X * 2), LABEL_HEIGHT];
}

interface LinkProps {
  boardId: string;
  id: string;
  /** Precomputed SVG path data (the layout algorithm, T2.1/T3.2, owns the
   * curve/port geometry — this component only draws it). */
  d: string;
  /**
   * The link's target node id (`data-to`). A link has no latency metric of
   * its own (see `metricKeys.ts`'s per-scope code sets); the interactive
   * layer's particle speed reads the *target node's* own latency instead,
   * and needs this to find it without re-deriving the board from view data
   * on the client.
   */
  toNodeId?: string;
  protocol: LinkProtocol;
  bidirectional?: boolean;
  label?: string;
  /** Where to anchor the label pill (usually the path's midpoint). */
  labelPosition?: { x: number; y: number };
  /** The pill's own rendered size, `[w, h]` (GEOM: from the route's `cap.sz`). Falls back to `estimatePillSize(label)` when absent (an older/unsynced document with no `cap`). */
  labelSize?: [number, number];
  /** Retry storm on this link: the label pill gets a critical outline. */
  labelHot?: boolean;
  /** Error rate is high enough that the line itself tints critical. */
  bad?: boolean;
  /** Walkthrough / selection emphasis: bright ink. */
  highlighted?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  /** The link is cut: the line gets a gap with a ✂ glyph at `cutPosition`. */
  partitioned?: boolean;
  cutPosition?: { x: number; y: number };
  /**
   * Slot for the Canvas2D particle layer that T3.3
   * adds above the SVG — out of scope here. Anything passed renders inside
   * this link's group, after the static path, so it composes without this
   * component needing to know about particles.
   */
  children?: ReactNode;
}

/**
 * A static link: `sync` solid / `async` dashed / `stream` dotted with
 * a drifting dash-offset, arrowheads, an optional mono label pill, health
 * tint and dim/highlight/selection states. The particle layer is T3.3 (see
 * `children`).
 */
export function Link({
  boardId,
  id,
  d,
  toNodeId,
  protocol,
  bidirectional = false,
  label,
  labelPosition,
  labelSize,
  labelHot = false,
  bad = false,
  highlighted = false,
  selected = false,
  dimmed = false,
  partitioned = false,
  cutPosition,
  children,
}: LinkProps) {
  const markerKind = bad ? 'bad' : highlighted ? 'hl' : 'default';
  const marker = `url(#${arrowId(boardId, markerKind)})`;

  return (
    <g
      className={
        'cv-linkgroup' + (dimmed ? ' is-dimmed' : '') + (selected ? ' is-selected' : '')
      }
      data-link-id={id}
      data-to={toNodeId}
    >
      <path
        className={
          'cv-link' +
          (protocol === 'async' ? ' is-async' : protocol === 'stream' ? ' is-stream' : '') +
          (bad ? ' is-bad' : '') +
          (highlighted ? ' is-hl' : '')
        }
        d={d}
        markerEnd={marker}
        markerStart={bidirectional ? marker : undefined}
        strokeDasharray={partitioned ? '20 12' : undefined}
      />
      <path className="cv-link-hit" d={d} data-link-hit={id} />

      {label && labelPosition && (
        <LinkLabel id={id} label={label} x={labelPosition.x} y={labelPosition.y} size={labelSize} hot={labelHot} dimmed={dimmed} />
      )}

      {partitioned && cutPosition && (
        <g className="cv-link-cut" transform={`translate(${cutPosition.x}, ${cutPosition.y})`}>
          <circle r={9} />
          <text x={0} y={5} textAnchor="middle">
            ✂
          </text>
        </g>
      )}

      {children}
    </g>
  );
}

/**
 * A link's label pill: an opaque rect at the engine-emitted size, centred on
 * the link's own line so its fill masks that line under the text. A board
 * draws every pill *after* all of its links (`data-link-label-for` ties the
 * pill back to its link), so no other link can ever cross a pill's text.
 */
export function LinkLabel({
  id,
  label,
  x,
  y,
  size,
  hot = false,
  dimmed = false,
}: {
  id: string;
  label: string;
  x: number;
  y: number;
  size?: [number, number];
  hot?: boolean;
  dimmed?: boolean;
}) {
  const [w, h] = size ?? estimatePillSize(label);
  // A measured label that would overflow the emitted pill (a mismatch
  // between this calibration and the real font metrics, or a document
  // built with different numbers) truncates with an ellipsis rather than
  // spilling past the rect sized to clear its neighbors.
  const displayLabel = truncateToWidth(label, Math.max(0, w - LABEL_PAD_X * 2), LABEL_CHAR_W);
  return (
    <g
      className={'cv-link-label' + (hot ? ' is-hot' : '') + (dimmed ? ' is-dimmed' : '')}
      data-link-label-for={id}
      transform={`translate(${x}, ${y})`}
    >
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} />
      <text x={0} y={4} textAnchor="middle">
        {displayLabel}
      </text>
    </g>
  );
}
