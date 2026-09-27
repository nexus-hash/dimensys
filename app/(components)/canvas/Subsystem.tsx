import { NodeIcon } from './icons';
import { HealthGlyph } from './HealthGlyph';
import { hatchId } from './CanvasDefs';
import type { HealthState, NodeMeter } from './types';
import { NODE_HEIGHT, NODE_WIDTH } from './types';
import { MeterRow } from './Node';
import {
  EXPAND_GLYPH_W,
  MONO_CHAR_EM,
  measureMono,
  measureSans,
  SUB_FONT_PX,
  subsystemSubLabel,
  TEXT_PAD_R,
  TEXT_X,
  TITLE_FONT_PX,
  TITLE_PAD_R,
  truncateToFit,
  truncateToWidth,
  withSafety,
} from './text';

/** Matches `.cv-subsystem .cv-tab` in globals.css. */
const TAB_FONT_SIZE = 11;
const TAB_LETTER_SPACING_EM = 0.06;

/**
 * The collapsed subsystem card: the same anatomy as a node (icon, title,
 * mono sub-label, meter row) on a dashed body, with the inner node count
 * followed by an inline ⤢ expand glyph. Its meter is the aggregate
 * utilization of the nodes inside (the live layer drives it; `meter` is the
 * server-rendered baseline), and it aggregates the worst health of its
 * contents (the caller computes that and passes it as `health`, same as
 * `Node`).
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
  width = NODE_WIDTH,
  height = NODE_HEIGHT,
  meter,
  childIds,
  interactive = true,
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
  /** Aggregate utilization meter (baseline); omitted renders no meter row. */
  meter?: NodeMeter;
  /** Ids of the nodes inside, for the live aggregate meter (`data-child-ids`). */
  childIds?: readonly string[];
  /** False renders a non-focusable card (`role="img"`), as `Node` does. */
  interactive?: boolean;
}) {
  const showGlyph = health !== 'ok';
  const ariaLabel = `${label} subsystem, ${nodeCount} nodes, ${health === 'ok' ? 'healthy' : health}${
    healthLabel ? `, ${healthLabel}` : ''
  }`;
  // Same estimate-then-clip truncation `Node` uses for its label/sub-label
  // (text.ts — no DOM to measure against server-side): a hard clipPath as
  // the safety net, plus the full text in a native `<title>` tooltip
  // regardless of what's visually truncated.
  const subText = subsystemSubLabel(nodeCount);
  const textClipId = `${boardId}-${id}-text-clip`;
  const textAreaWidth = Math.max(0, width - TEXT_X - TEXT_PAD_R);
  const displayLabel = truncateToFit(label, width - TEXT_X - TITLE_PAD_R, (t) => measureSans(t, TITLE_FONT_PX));
  const displaySub = truncateToFit(subText, textAreaWidth - EXPAND_GLYPH_W, (t) => measureMono(t, SUB_FONT_PX));
  // The expand glyph sits inline right after the count ("2 nodes ⤢").
  const glyphX = TEXT_X + withSafety(measureMono(displaySub, SUB_FONT_PX)) + 4;
  const titleText = `${label} — ${subText}`;

  return (
    <g
      className={
        'cv-node cv-subsystem-card' +
        (health !== 'ok' ? ` cv-health-${health}` : '') +
        (selected ? ' is-selected' : '') +
        (dimmed ? ' is-dimmed' : '')
      }
      transform={`translate(${x - width / 2}, ${y - height / 2})`}
      data-node-id={id}
      data-meter-kind={meter?.kind}
      data-child-ids={childIds?.join(' ')}
      tabIndex={interactive ? 0 : -1}
      role={interactive ? 'button' : 'img'}
      aria-label={ariaLabel}
    >
      <title>{titleText}</title>
      <rect className="cv-halo" x={-5} y={-5} width={width + 10} height={height + 10} rx={17} />
      <rect className="cv-focus" x={-8} y={-8} width={width + 16} height={height + 16} rx={20} />
      <g className="cv-inner">
        <rect className="cv-body" width={width} height={height} rx={12} />
        <g className="cv-icon" transform="translate(12, 12) scale(0.83)">
          <NodeIcon type="subSystem" />
        </g>
        <clipPath id={textClipId}>
          <rect x={TEXT_X} y={0} width={textAreaWidth} height={height} />
        </clipPath>
        <g clipPath={`url(#${textClipId})`}>
          <text className="cv-label" x={TEXT_X} y={27}>
            {displayLabel}
          </text>
          <text className="cv-sub" x={TEXT_X} y={45}>
            {displaySub}
          </text>
          <g className="cv-icon cv-expand" transform={`translate(${glyphX}, 35)`} aria-hidden="true">
            <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </g>
        </g>
        {meter && <MeterRow meter={meter} width={width} />}
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
  interactive = true,
}: {
  boardId: string;
  id: string;
  label: string;
  x?: number;
  y?: number;
  width: number;
  height: number;
  /** False drops the tab's button role and focus stop (a static, non-drillable frame). */
  interactive?: boolean;
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
        data-subsystem-tab-id={interactive ? id : undefined}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? `Enter ${label} subsystem` : undefined}
      >
        <text className="cv-tab" x={2} y={-8}>
          {displayLabel}
        </text>
      </g>
    </g>
  );
}
