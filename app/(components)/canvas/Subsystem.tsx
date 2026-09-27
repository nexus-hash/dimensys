import { NodeIcon } from './icons';
import { HealthGlyph } from './HealthGlyph';
import { hatchId } from './CanvasDefs';
import type { HealthState } from './types';
import { MONO_CHAR_EM, truncateToWidth } from './text';

/** Matches `.cv-subsystem .cv-tab` in globals.css. */
const TAB_FONT_SIZE = 11;
const TAB_LETTER_SPACING_EM = 0.06;

/**
 * The collapsed subsystem affordance: renders like a larger node,
 * with the inner node count and a ⤢ expand glyph, and aggregates the worst
 * health of its contents (the caller computes that aggregate and passes it
 * as `health`, same as `Node`).
 */
export function SubsystemCollapsed({
  boardId,
  id,
  label,
  nodeCount,
  health = 'ok',
  healthLabel,
  selected = false,
  dimmed = false,
  x = 0,
  y = 0,
  width = 168,
  height = 88,
}: {
  boardId: string;
  id: string;
  label: string;
  nodeCount: number;
  health?: HealthState;
  healthLabel?: string;
  selected?: boolean;
  dimmed?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  const showGlyph = health !== 'ok';
  const ariaLabel = `${label} subsystem, ${nodeCount} nodes, ${health === 'ok' ? 'healthy' : health}${
    healthLabel ? `, ${healthLabel}` : ''
  }`;

  return (
    <g
      className={
        'cv-node' +
        (health !== 'ok' ? ` cv-health-${health}` : '') +
        (selected ? ' is-selected' : '') +
        (dimmed ? ' is-dimmed' : '')
      }
      transform={`translate(${x - width / 2}, ${y - height / 2})`}
      data-node-id={id}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
    >
      <rect className="cv-halo" x={-5} y={-5} width={width + 10} height={height + 10} rx={17} />
      <rect className="cv-focus" x={-8} y={-8} width={width + 16} height={height + 16} rx={20} />
      <g className="cv-inner">
        <rect className="cv-body" width={width} height={height} rx={12} />
        <g className="cv-icon" transform="translate(12, 12) scale(0.83)">
          <NodeIcon type="subSystem" />
        </g>
        <text className="cv-label" x={38} y={27}>
          {label}
        </text>
        <text className="cv-sub" x={38} y={45}>
          {nodeCount} node{nodeCount === 1 ? '' : 's'}
        </text>
        <g className="cv-icon" transform={`translate(${width - 26}, ${height - 26})`} aria-hidden="true">
          <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </g>
      </g>
      <rect className="cv-hatch" width={width} height={height} rx={12} fill={`url(#${hatchId(boardId)})`} />
      <rect className="cv-ring" x={-3} y={-3} width={width + 6} height={height + 6} rx={15} />
      <rect className="cv-sel" x={-3} y={-3} width={width + 6} height={height + 6} rx={15} />
      {showGlyph && (
        <g className="cv-glyph" transform={`translate(${width - 22}, 8)`}>
          <HealthGlyph state={health} size={16} />
        </g>
      )}
    </g>
  );
}

/**
 * The expanded subsystem boundary: a dashed frame with a top-left
 * mono tab label. The frame body is purely decorative — it draws around
 * whatever `Node`s the caller places inside `width`×`height`, it doesn't lay
 * them out (padding between the frame and its contents, if any, is also the
 * caller's call). The tab itself is a drill-down entry point (T3.4): it's
 * focusable and carries `data-subsystem-tab-id`, which the player's
 * `DrillStage` delegates clicks/keydown to.
 *
 * `boardId`/`id` namespace the tab's clip id, same as `Node` — needed so two
 * frames on one board (or two boards on one page) never collide.
 */
export function SubsystemFrame({
  boardId,
  id,
  label,
  x = 0,
  y = 0,
  width,
  height,
}: {
  boardId: string;
  id: string;
  label: string;
  x?: number;
  y?: number;
  width: number;
  height: number;
}) {
  const tabClipId = `${boardId}-${id}-tab-clip`;
  // A little inset from the frame's own edges/corners on both sides.
  const tabAreaWidth = Math.max(0, width - 4);
  const displayLabel = truncateToWidth(label.toUpperCase(), tabAreaWidth, TAB_FONT_SIZE * (MONO_CHAR_EM + TAB_LETTER_SPACING_EM));

  return (
    <g className="cv-subsystem" transform={`translate(${x}, ${y})`}>
      <rect className="cv-body" width={width} height={height} rx={16} aria-hidden="true" />
      <clipPath id={tabClipId}>
        <rect x={2} y={-20} width={tabAreaWidth} height={20} />
      </clipPath>
      <g
        className="cv-tab-hit"
        clipPath={`url(#${tabClipId})`}
        data-subsystem-tab-id={id}
        role="button"
        tabIndex={0}
        aria-label={`Enter ${label} subsystem`}
      >
        <text className="cv-tab" x={2} y={-8}>
          {displayLabel}
        </text>
      </g>
    </g>
  );
}
