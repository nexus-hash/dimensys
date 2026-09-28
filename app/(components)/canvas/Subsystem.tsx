import { MONO_CHAR_EM, truncateToWidth } from './text';

/** Matches `.cv-subsystem .cv-tab` in globals.css. */
const TAB_FONT_SIZE = 11;
const TAB_LETTER_SPACING_EM = 0.06;

/**
 * A group's frame: a dashed border with a subtle fill, drawn round nodes the
 * caller places inside `width`×`height` (it doesn't lay them out), and the
 * group's name as a small mono tab above its top-left edge.
 *
 * Only the tab is interactive: a focusable button (`data-frame-tab`) that
 * the player turns into "select this group". The border and fill take no
 * pointer events, so a click on the frame's empty area reaches the board
 * underneath (pan), and the nodes inside stay ordinary nodes. Drawn before
 * its nodes, so the tab comes before them in focus order.
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
  selected = false,
  interactive = true,
}: {
  boardId: string;
  id: string;
  label: string;
  x?: number;
  y?: number;
  width: number;
  height: number;
  selected?: boolean;
  /** False renders the tab as plain text (a preview, not a control). Default true. */
  interactive?: boolean;
}) {
  const tabClipId = `${boardId}-${id}-tab-clip`;
  // A little inset from the frame's own edges/corners on both sides.
  const tabAreaWidth = Math.max(0, width - 4);
  const charW = TAB_FONT_SIZE * (MONO_CHAR_EM + TAB_LETTER_SPACING_EM);
  const displayLabel = truncateToWidth(label.toUpperCase(), tabAreaWidth, charW);
  // Hit area: the drawn text's own width (plus a little slack), full tab height.
  const hitWidth = Math.min(tabAreaWidth, [...displayLabel].length * charW + 8);

  return (
    <g className={'cv-subsystem' + (selected ? ' is-selected' : '')} data-frame-id={id} transform={`translate(${x}, ${y})`}>
      <rect className="cv-body" width={width} height={height} rx={16} aria-hidden="true" />
      <clipPath id={tabClipId}>
        <rect x={2} y={-20} width={tabAreaWidth} height={20} />
      </clipPath>
      <g
        className={interactive ? 'cv-tab-btn' : undefined}
        data-frame-tab={interactive ? id : undefined}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? `${label} details` : undefined}
      >
        {interactive && <rect className="cv-tab-hit" x={-2} y={-20} width={hitWidth} height={20} rx={4} />}
        <text className="cv-tab" x={2} y={-8} clipPath={`url(#${tabClipId})`}>
          {displayLabel}
        </text>
      </g>
    </g>
  );
}
