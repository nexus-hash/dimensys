import { MONO_CHAR_EM, truncateToWidth } from './text';

/** Matches `.cv-subsystem .cv-tab` in globals.css. */
const TAB_FONT_SIZE = 11;
const TAB_LETTER_SPACING_EM = 0.06;

/**
 * A group's frame: a dashed border with a subtle fill, drawn round nodes the
 * caller places inside `width`×`height` (it doesn't lay them out), and the
 * group's name as a small mono tab above its top-left edge. Purely
 * decorative: not focusable, no hover, no pointer events — the nodes inside
 * are ordinary interactive nodes.
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
    <g className="cv-subsystem" data-frame-id={id} transform={`translate(${x}, ${y})`}>
      <rect className="cv-body" width={width} height={height} rx={16} aria-hidden="true" />
      <clipPath id={tabClipId}>
        <rect x={2} y={-20} width={tabAreaWidth} height={20} />
      </clipPath>
      <text className="cv-tab" x={2} y={-8} clipPath={`url(#${tabClipId})`}>
        {displayLabel}
      </text>
    </g>
  );
}
