import type { ReactNode } from 'react';
import { arrowId } from './CanvasDefs';
import type { LinkProtocol } from './types';

export interface LinkProps {
  boardId: string;
  id: string;
  /** Precomputed SVG path data (the layout algorithm, T2.1/T3.2, owns the
   * curve/port geometry — this component only draws it). */
  d: string;
  protocol: LinkProtocol;
  bidirectional?: boolean;
  label?: string;
  /** Where to anchor the label pill (usually the path's midpoint). */
  labelPosition?: { x: number; y: number };
  /** Retry storm on this link: the label pill gets a critical outline (§5.4). */
  labelHot?: boolean;
  /** Error rate is high enough that the line itself tints critical (§5.4). */
  bad?: boolean;
  /** Walkthrough / selection emphasis: bright ink, §5.4/§5.6. */
  highlighted?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  /** The link is cut (§5.4): the line gets a gap with a ✂ glyph at `cutPosition`. */
  partitioned?: boolean;
  cutPosition?: { x: number; y: number };
  /**
   * Slot for the Canvas2D particle layer (§5.4 request/retry dots) that T3.3
   * adds above the SVG — out of scope here. Anything passed renders inside
   * this link's group, after the static path, so it composes without this
   * component needing to know about particles.
   */
  children?: ReactNode;
}

/**
 * A static link (§5.4): `sync` solid / `async` dashed / `stream` dotted with
 * a drifting dash-offset, arrowheads, an optional mono label pill, health
 * tint and dim/highlight/selection states. The particle layer is T3.3 (see
 * `children`).
 */
export function Link({
  boardId,
  id,
  d,
  protocol,
  bidirectional = false,
  label,
  labelPosition,
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
        <g className={'cv-link-label' + (labelHot ? ' is-hot' : '')} transform={`translate(${labelPosition.x}, ${labelPosition.y})`}>
          <rect x={-Math.max(40, (label.length * 7.3 + 14) / 2)} y={-10} width={Math.max(80, label.length * 7.3 + 14)} height={20} rx={6} />
          <text x={0} y={4} textAnchor="middle">
            {label}
          </text>
        </g>
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
